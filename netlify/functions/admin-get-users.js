import { authorizeAdmin, jsonResponse } from '../lib/admin-auth.js';

export const config = {
  path: '/.netlify/functions/admin-get-users',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  const authorization = await authorizeAdmin(event);
  if (authorization.response) return authorization.response;

  const { sql, userId } = authorization;
  try {
    const users = await sql`
      WITH app_context AS MATERIALIZED (
        SELECT
          set_config('app.current_user_id', ${userId}, true) AS user_id,
          set_config('app.is_admin', 'true', true) AS is_admin
      ),
      admin_profile AS MATERIALIZED (
        SELECT profiles.id
        FROM profiles
        CROSS JOIN app_context
        WHERE profiles.auth_user_id = app_context.user_id
          AND profiles.is_admin IS TRUE
      )
      SELECT
        profiles.id,
        profiles.email,
        profiles.demo_balance,
        profiles.is_admin,
        profiles.created_at
      FROM profiles
      CROSS JOIN admin_profile
      ORDER BY profiles.created_at DESC, profiles.id
    `;

    return jsonResponse(200, {
      success: true,
      users: users.map((user) => ({
        ...user,
        demo_balance: Number(user.demo_balance),
      })),
    });
  } catch (error) {
    console.error('Failed to retrieve admin user list from Neon Postgres.', error);
    return jsonResponse(500, { success: false, message: 'Unable to retrieve users' });
  }
}
