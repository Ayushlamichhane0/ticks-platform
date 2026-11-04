import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { authorizeAdmin } from '../lib/admin-auth.js';

export const config = {
  path: '/.netlify/functions/trade',
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

const headers = {
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const authJwksUrl = process.env.NEON_AUTH_JWKS_URL
  || (authBaseUrl ? `${authBaseUrl.replace(/\/+$/, '')}/.well-known/jwks.json` : null);
const authIssuer = authBaseUrl ? new URL(authBaseUrl).origin : null;
const authJwks = authJwksUrl ? createRemoteJWKSet(new URL(authJwksUrl)) : null;

async function authenticate(event) {
  const authorization = event.headers?.authorization ?? event.headers?.Authorization;
  const tokenMatch = typeof authorization === 'string'
    ? /^Bearer\s+([^\s]+)$/i.exec(authorization)
    : null;

  if (!tokenMatch) {
    return { response: jsonResponse(401, { success: false, message: 'Unauthorized' }) };
  }

  if (!authIssuer || !authJwks) {
    console.error('Neon Auth JWT verification is not configured for the trade function.');
    return { response: jsonResponse(503, { success: false, message: 'Authentication is not configured' }) };
  }

  try {
    const { payload } = await jwtVerify(tokenMatch[1], authJwks, { issuer: authIssuer });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return { response: jsonResponse(401, { success: false, message: 'Unauthorized' }) };
    }
    return { userId: payload.sub };
  } catch (error) {
    console.warn('Trade request token verification failed.', error);
    return { response: jsonResponse(401, { success: false, message: 'Unauthorized' }) };
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  const authenticated = await authenticate(event);
  if (authenticated.response) return authenticated.response;
  const { userId } = authenticated;

  const viewAsHeader = event.headers?.['x-view-as-user'] ?? event.headers?.['X-View-As-User'];
  const isViewAsRequest = viewAsHeader !== undefined;
  let viewAsUserId = null;
  if (isViewAsRequest) {
    const adminAuthorization = await authorizeAdmin(event);
    if (adminAuthorization.response) return adminAuthorization.response;
    if (
      typeof viewAsHeader !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(viewAsHeader)
    ) {
      return jsonResponse(400, { success: false, message: 'X-View-As-User must be a valid profile ID' });
    }
    viewAsUserId = viewAsHeader;
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { success: false, message: 'Request body must be valid JSON' });
  }

  const action = body.action || 'open';
  if (isViewAsRequest && action !== 'balance' && action !== 'positions') {
    return jsonResponse(403, { success: false, message: 'View-as mode is read-only' });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not configured for the trade function.');
    return jsonResponse(503, { success: false, message: 'Trade storage is not configured' });
  }

  try {
    const sql = neon(connectionString);

    // Fetch user profile
    let profile;
    if (viewAsUserId) {
      const [viewedProfile] = await sql`
        SELECT id, email, demo_balance
        FROM profiles
        WHERE id = ${viewAsUserId}::uuid
        LIMIT 1
      `;
      profile = viewedProfile;
    } else {
      let [currentProfile] = await sql`
        SELECT id, email, demo_balance
        FROM profiles
        WHERE auth_user_id = ${userId}
        LIMIT 1
      `;
      if (!currentProfile) {
        const [createdProfile] = await sql`
          INSERT INTO profiles (auth_user_id, demo_balance)
          VALUES (${userId}, 100000.00)
          ON CONFLICT (auth_user_id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
          RETURNING id, email, demo_balance
        `;
        currentProfile = createdProfile;
      }
      profile = currentProfile;
    }

    if (!profile) {
      return jsonResponse(404, { success: false, message: 'Trading profile not found' });
    }

    // Handle Balance queries
    if (action === 'balance') {
      return jsonResponse(200, {
        success: true,
        message: 'Balance loaded',
        demoBalance: Number(profile.demo_balance ?? 100000),
      });
    }

    // Handle Reset demo balance
    if (action === 'reset') {
      await sql`
        UPDATE profiles
        SET demo_balance = 100000.00
        WHERE id = ${profile.id}
      `;
      return jsonResponse(200, {
        success: true,
        message: 'Demo balance reset',
        demoBalance: 100000,
      });
    }

    // Handle Positions / Trade list queries
    if (action === 'positions') {
      const positions = await sql`
        SELECT
          trades.id::text,
          trades.symbol,
          trades.amount,
          trades.price,
          trades.side,
          trades.contract_size AS "contractSize",
          trades.created_at AS "createdAt"
        FROM trades
        WHERE trades.user_id = ${profile.id}
        ORDER BY trades.created_at DESC, trades.id DESC
      `;
      return jsonResponse(200, {
        success: true,
        positions: positions.map((p) => ({
          ...p,
          amount: Number(p.amount),
          price: Number(p.price),
          contractSize: Number(p.contractSize ?? 1),
        })),
      });
    }

    // TradingView Margin/CFD Trade Execution (Long / Short)
    const symbol = String(body.symbol || '').trim();
    const side = String(body.side || '').toLowerCase().trim();
    const amount = Number.parseFloat(String(body.amount));
    const price = Number.parseFloat(String(body.price));

    if (
      !symbol ||
      !['buy', 'sell'].includes(side) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return jsonResponse(400, {
        success: false,
        message: 'Invalid symbol, amount, price, or side',
      });
    }

    // Contract size (units per lot) for the traded instrument. The client may send it
    // explicitly; otherwise fall back to the shared CONTRACT_SIZES table (default 1).
    const CONTRACT_SIZES = {
      BTCUSDT: 1,
      ETHUSDT: 10,
      SOLUSDT: 1,
      XRPUSDT: 1,
      PAXGUSDT: 1,
      XAUUSD: 1,
    };
    const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const requestedContractSize = Number.parseFloat(String(body.contractSize));
    const contractSize = Number.isFinite(requestedContractSize) && requestedContractSize > 0
      ? requestedContractSize
      : CONTRACT_SIZES[normalizedSymbol] ?? 1;

    // Load the current net position (before this trade) so a sell that closes a Long
    // can be credited with the realized PnL in the same SQL transaction.
    const priorTrades = await sql`
      SELECT side, amount, price
      FROM trades
      WHERE user_id = ${profile.id} AND symbol = ${symbol}
    `;

    let netAmount = 0;
    let avgPrice = 0;
    for (const row of priorTrades) {
      const tSide = String(row.side || '').toLowerCase();
      const tAmount = Number.parseFloat(String(row.amount));
      const tPrice = Number.parseFloat(String(row.price));
      if (!Number.isFinite(tAmount) || tAmount <= 0 || !Number.isFinite(tPrice) || tPrice <= 0) {
        continue;
      }
      const signedAmount = tSide === 'sell' ? -tAmount : tAmount;
      if (netAmount >= 0 && signedAmount > 0) {
        const newNet = netAmount + signedAmount;
        avgPrice = newNet > 0 ? (avgPrice * netAmount + tPrice * signedAmount) / newNet : tPrice;
        netAmount = newNet;
      } else if (netAmount <= 0 && signedAmount < 0) {
        const newShort = netAmount + signedAmount;
        avgPrice = newShort !== 0
          ? (avgPrice * Math.abs(netAmount) + tPrice * Math.abs(signedAmount)) / Math.abs(newShort)
          : tPrice;
        netAmount = newShort;
      } else {
        netAmount += signedAmount;
        if (Math.abs(netAmount) < 1e-8) {
          netAmount = 0;
          avgPrice = 0;
        } else if ((netAmount > 0 && signedAmount > 0) || (netAmount < 0 && signedAmount < 0)) {
          // Position flipped: entry price resets to the flip trade price.
          avgPrice = tPrice;
        }
        // Partial reduction keeps the original average entry price.
      }
    }

    // Realized PnL when this sell closes (fully or partially) an existing Long:
    //   totalValue = amount * price * contractSize (notional proceeds credited to balance)
    const closingLongUnits = netAmount > 0 ? Math.min(amount / contractSize, netAmount) : 0;
    const realizedPnl = side === 'sell' && closingLongUnits > 0
      ? (price - avgPrice) * closingLongUnits * contractSize
      : 0;
    const totalValue = closingLongUnits * price * contractSize;

    // SQL transaction: insert the trade and update demo_balance atomically.
    const txResults = await sql.transaction(async (tx) => {
      const [inserted] = await tx`
        INSERT INTO trades (user_id, symbol, amount, price, side, contract_size)
        VALUES (${profile.id}, ${symbol}, ${amount}, ${price}, ${side}, ${contractSize})
        RETURNING id
      `;

      if (realizedPnl !== 0) {
        // Sell closing a Long: credit the notional proceeds (totalValue =
        // amount * price * contractSize), which includes the realized PnL,
        // to the user's demo_balance.
        console.log(
          `Closing Long for ${symbol}: realizedPnl=${realizedPnl.toFixed(2)}, totalValue=${totalValue.toFixed(2)}`
        );
        const [updatedProfile] = await tx`
          UPDATE profiles
          SET demo_balance = COALESCE(demo_balance, 100000.00) + ${totalValue}
          WHERE id = ${profile.id}
          RETURNING demo_balance
        `;
        return { tradeId: inserted.id, demoBalance: updatedProfile?.demo_balance };
      }

      const [currentProfile] = await tx`
        SELECT demo_balance FROM profiles WHERE id = ${profile.id}
      `;
      return { tradeId: inserted.id, demoBalance: currentProfile?.demo_balance };
    });

    const newTrade = txResults;
    const currentBalance = Number(newTrade.demoBalance ?? profile.demo_balance ?? 100000);

    return jsonResponse(200, {
      success: true,
      message: 'Trade executed',
      tradeId: String(newTrade.tradeId),
      newBalance: currentBalance,
      demoBalance: currentBalance,
      ...(realizedPnl !== 0 ? { realizedPnl: Number(realizedPnl.toFixed(2)) } : {}),
    });
  } catch (error) {
    console.error('Failed to process trade in Neon Postgres.', error);
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
