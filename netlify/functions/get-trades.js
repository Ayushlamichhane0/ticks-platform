import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { authorizeAdmin } from '../lib/admin-auth.js';

export const config = {
  path: '/.netlify/functions/get-trades',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

const headers = {
  'Content-Type': 'application/json',
};

const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const authJwksUrl = process.env.NEON_AUTH_JWKS_URL
  || (authBaseUrl ? `${authBaseUrl.replace(/\/+$/, '')}/.well-known/jwks.json` : null);
const authIssuer = authBaseUrl ? new URL(authBaseUrl).origin : null;
const authJwks = authJwksUrl ? createRemoteJWKSet(new URL(authJwksUrl)) : null;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
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
    console.error('Neon Auth JWT verification is not configured for the trade-history function.');
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
    console.warn('Trade-history request token verification failed.', error);
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
    console.error('DATABASE_URL is not configured for the trade-history function.');
    return jsonResponse(503, { success: false, message: 'Trade storage is not configured' });
  }

  try {
    const sql = neon(connectionString);
    if (isViewAsRequest) {
      const [account] = await sql`
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
          SELECT profiles.id, profiles.email
          FROM profiles
          CROSS JOIN app_context
          CROSS JOIN admin_profile
          WHERE profiles.id = ${viewAsHeader}::uuid
        ),
        audit_log AS (
          INSERT INTO admin_audit_logs (admin_email, action, target_user_email)
          SELECT admin_profile.email, 'view_as:trade_history', target_profile.email
          FROM admin_profile
          CROSS JOIN target_profile
          RETURNING id
        )
        SELECT
          target_profile.id AS "profileId",
          COALESCE(
            json_agg(
              json_build_object(
                'id', trades.id::text,
                'symbol', trades.symbol,
                'side', trades.side,
                'amount', trades.amount,
                'price', trades.price,
                'createdAt', trades.created_at,
                'closedAt', trades.closed_at
              ) ORDER BY trades.created_at DESC, trades.id DESC
            ) FILTER (WHERE trades.id IS NOT NULL),
            '[]'::json
          ) AS trades
        FROM target_profile
        LEFT JOIN trades ON trades.user_id = target_profile.id
        CROSS JOIN audit_log
        GROUP BY target_profile.id
      `;

      if (!account) {
        return jsonResponse(404, { success: false, message: 'Viewed account not found' });
      }

      return jsonResponse(200, {
        success: true,
        trades: account.trades.map((trade) => ({
          ...trade,
          amount: Number(trade.amount),
          price: Number(trade.price),
        })),
      });
    }

    console.log('GET-TRADES USER ID:', userId);
    const trades = await sql`
      WITH auth_context AS MATERIALIZED (
        SELECT set_config('app.current_user_id', ${userId}, true) AS user_id
      ),
      profile AS (
        SELECT profiles.id
        FROM profiles
        CROSS JOIN auth_context
        WHERE profiles.auth_user_id = auth_context.user_id
      )
      SELECT
        trades.*
      FROM trades
      WHERE trades.user_id = (SELECT id FROM profile)
      ORDER BY trades.created_at DESC
    `;

    return jsonResponse(200, {
      success: true,
      trades: trades.map((trade) => ({
        id: String(trade.id),
        symbol: trade.symbol,
        side: trade.side,
        amount: Number(trade.amount),
        price: Number(trade.price),
        createdAt: trade.created_at,
        closedAt: trade.closed_at,
      })),
    });
  } catch (error) {
    console.error('Failed to retrieve trade history from Neon Postgres.', error);
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
