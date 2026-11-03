import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const authJwksUrl = process.env.NEON_AUTH_JWKS_URL
  || (authBaseUrl ? `${authBaseUrl.replace(/\/+$/, '')}/.well-known/jwks.json` : null);
const authIssuer = authBaseUrl ? new URL(authBaseUrl).origin : null;
const authJwks = authJwksUrl ? createRemoteJWKSet(new URL(authJwksUrl)) : null;

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function authorizeAdmin(event) {
  const authorization = event.headers?.authorization ?? event.headers?.Authorization;
  const tokenMatch = typeof authorization === 'string'
    ? /^Bearer\s+([^\s]+)$/i.exec(authorization)
    : null;

  if (!tokenMatch) {
    return { response: jsonResponse(401, { success: false, message: 'Unauthorized' }) };
  }

  if (!authIssuer || !authJwks) {
    console.error('Neon Auth JWT verification is not configured for an admin function.');
    return { response: jsonResponse(503, { success: false, message: 'Authentication is not configured' }) };
  }

  let userId;
  try {
    const { payload } = await jwtVerify(tokenMatch[1], authJwks, { issuer: authIssuer });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return { response: jsonResponse(401, { success: false, message: 'Unauthorized' }) };
    }
    userId = payload.sub;
  } catch (error) {
    console.warn('Admin request token verification failed.', error);
    return { response: jsonResponse(401, { success: false, message: 'Unauthorized' }) };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not configured for an admin function.');
    return { response: jsonResponse(503, { success: false, message: 'Admin services are not configured' }) };
  }

  const sql = neon(connectionString);
  try {
    const [admin] = await sql`
      WITH auth_context AS MATERIALIZED (
        SELECT set_config('app.current_user_id', ${userId}, true) AS user_id
      )
      SELECT id, email
      FROM profiles
      CROSS JOIN auth_context
      WHERE profiles.auth_user_id = auth_context.user_id
        AND profiles.is_admin IS TRUE
      LIMIT 1
    `;

    if (!admin) {
      return { response: jsonResponse(403, { success: false, message: 'Forbidden' }) };
    }

    return { sql, userId, adminEmail: admin.email ?? null };
  } catch (error) {
    console.error('Failed to authorize admin request against Neon Postgres.', error);
    return { response: jsonResponse(500, { success: false, message: 'Admin authorization failed' }) };
  }
}
