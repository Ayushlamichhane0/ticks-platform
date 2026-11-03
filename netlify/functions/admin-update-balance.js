import { authorizeAdmin, jsonResponse } from '../lib/admin-auth.js';

export const config = {
  path: '/.netlify/functions/admin-update-balance',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  const authorization = await authorizeAdmin(event);
  if (authorization.response) return authorization.response;

  let body;
  try {
    body = JSON.parse(event.body || '');
  } catch {
    return jsonResponse(400, { success: false, message: 'Request body must be valid JSON' });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse(400, { success: false, message: 'Request body must be a JSON object' });
  }

  const { targetUserId, newBalance } = body;
  if (typeof targetUserId !== 'string' || !uuidPattern.test(targetUserId)) {
    return jsonResponse(400, { success: false, message: 'targetUserId must be a valid UUID' });
  }
  if (typeof newBalance !== 'number' || !Number.isFinite(newBalance) || newBalance < 0) {
    return jsonResponse(400, { success: false, message: 'newBalance must be a non-negative number' });
  }

  const { sql, userId, adminEmail } = authorization;
  try {
    const [result] = await sql`
      WITH app_context AS MATERIALIZED (
        SELECT
          set_config('app.current_user_id', ${userId}, true) AS user_id,
          set_config('app.is_admin', 'true', true) AS is_admin
      ),
      admin_profile AS MATERIALIZED (
        SELECT profiles.id, profiles.email
        FROM profiles
        CROSS JOIN app_context
        WHERE profiles.auth_user_id = app_context.user_id
          AND profiles.is_admin IS TRUE
      ),
      updated_profile AS (
        UPDATE profiles
        SET demo_balance = ${newBalance}
        FROM admin_profile
        WHERE profiles.id = ${targetUserId}::uuid
        RETURNING
          profiles.id,
          profiles.email,
          profiles.demo_balance,
          profiles.is_admin,
          profiles.created_at
      ),
      audit_log AS (
        INSERT INTO admin_audit_logs (admin_email, action, target_user_email)
        SELECT
          COALESCE(admin_profile.email, ${adminEmail}),
          'update_balance',
          updated_profile.email
        FROM updated_profile
        CROSS JOIN admin_profile
        RETURNING id
      )
      SELECT
        updated_profile.id,
        updated_profile.email,
        updated_profile.demo_balance,
        updated_profile.is_admin,
        updated_profile.created_at
      FROM updated_profile
      CROSS JOIN audit_log
    `;

    if (!result) {
      return jsonResponse(404, { success: false, message: 'User not found or admin access was revoked' });
    }

    return jsonResponse(200, {
      success: true,
      user: {
        ...result,
        demo_balance: Number(result.demo_balance),
      },
    });
  } catch (error) {
    console.error('Failed to update a profile balance from the admin function.', error);
    return jsonResponse(500, { success: false, message: 'Unable to update user balance' });
  }
}
