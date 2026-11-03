import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { authorizeAdmin } from '../lib/admin-auth.js';

const headers = { 'Content-Type': 'application/json' };
export const config = {
  path: '/.netlify/functions/get-user',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const authJwksUrl = process.env.NEON_AUTH_JWKS_URL
  || (authBaseUrl ? `${authBaseUrl.replace(/\/+$/, '')}/.well-known/jwks.json` : null);
const authIssuer = authBaseUrl ? new URL(authBaseUrl).origin : null;
const authJwks = authJwksUrl ? createRemoteJWKSet(new URL(authJwksUrl)) : null;

function jsonResponse(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  const authorization = event.headers?.authorization ?? event.headers?.Authorization;
  const tokenMatch = typeof authorization === 'string'
    ? /^Bearer\s+([^\s]+)$/i.exec(authorization)
    : null;
  if (!tokenMatch) {
    return jsonResponse(401, { success: false, message: 'Unauthorized' });
  }
  if (!authIssuer || !authJwks) {
    console.error('Neon Auth JWT verification is not configured for the user-profile function.');
    return jsonResponse(503, { success: false, message: 'Authentication is not configured' });
  }

  let userId;
  try {
    const { payload } = await jwtVerify(tokenMatch[1], authJwks, { issuer: authIssuer });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return jsonResponse(401, { success: false, message: 'Unauthorized' });
    }
    userId = payload.sub;
  } catch (error) {
    console.warn('User-profile request token verification failed.', error);
    return jsonResponse(401, { success: false, message: 'Unauthorized' });
  }

  const viewAsHeader = event.headers?.['x-view-as-user'] ?? event.headers?.['X-View-As-User'];
  const isViewAsRequest = viewAsHeader !== undefined;
  if (
    isViewAsRequest &&
    (typeof viewAsHeader !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(viewAsHeader))
  ) {
    return jsonResponse(400, { success: false, message: 'X-View-As-User must be a valid profile ID' });
  }
  if (isViewAsRequest) {
    const adminAuthorization = await authorizeAdmin(event);
    if (adminAuthorization.response) return adminAuthorization.response;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not configured for the user-profile function.');
    return jsonResponse(503, { success: false, message: 'Profile storage is not configured' });
  }

  try {
    const sql = neon(connectionString);
    const [profile] = isViewAsRequest
      ? await sql`
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
          target_profile AS MATERIALIZED (
            SELECT
              profiles.id,
              profiles.email,
              profiles.demo_balance,
              profiles.is_admin,
              profiles.created_at
            FROM profiles
            CROSS JOIN app_context
            CROSS JOIN admin_profile
            WHERE profiles.id = ${viewAsHeader}::uuid
          ),
          audit_log AS (
            INSERT INTO admin_audit_logs (admin_email, action, target_user_email)
            SELECT admin_profile.email, 'view_as:profile', target_profile.email
            FROM admin_profile
            CROSS JOIN target_profile
            RETURNING id
          )
          SELECT target_profile.*
          FROM target_profile
          CROSS JOIN audit_log
        `
      : await sql`
          WITH auth_context AS MATERIALIZED (
            SELECT set_config('app.current_user_id', ${userId}, true) AS user_id
          )
          SELECT profiles.id, profiles.email, profiles.demo_balance, profiles.is_admin, profiles.created_at
          FROM profiles
          CROSS JOIN auth_context
          WHERE profiles.auth_user_id = auth_context.user_id
          LIMIT 1
        `;

    if (!profile) {
      return jsonResponse(404, { success: false, message: 'Profile not found' });
    }

    console.log("BACKEND GET-USER RETURNING:", profile);
    return jsonResponse(200, {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        demo_balance: Number(profile.demo_balance ?? 100000),
        is_admin: Boolean(profile.is_admin),
        created_at: profile.created_at,
      },
    });
  } catch (error) {
    console.error('Failed to retrieve user profile from Neon Postgres.', error);
    return jsonResponse(500, { success: false, message: 'Profile unavailable' });
  }
}
