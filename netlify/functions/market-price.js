export const config = {
  path: '/.netlify/functions/market-price',
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

const coinIds = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  SOLUSDT: 'solana',
  XRPUSDT: 'ripple',
  PAXGUSDT: 'pax-gold',
};

const headers = { 'Content-Type': 'application/json' };

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function parsePrice(value) {
  const price = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Market provider returned an invalid price.');
  }
  return price;
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  const symbol = event.queryStringParameters?.symbol;
  if (symbol === 'XAUUSD') {
    try {
      const response = await fetch('https://api.gold-api.com/price/XAU');
      if (!response.ok) throw new Error(`Gold API returned HTTP ${response.status}.`);
      const data = await response.json();
      return jsonResponse(200, { price: parsePrice(data?.price) });
    } catch (error) {
      console.error('Unable to fetch the XAU/USD live price.', error);
      return jsonResponse(502, { success: false, message: 'Market price unavailable' });
    }
  }

  const coinId = typeof symbol === 'string' ? coinIds[symbol] : undefined;
  if (!coinId) {
    return jsonResponse(400, { success: false, message: 'Unsupported market symbol' });
  }

  try {
    const binanceUrl = new URL('https://api.binance.com/api/v3/ticker/price');
    binanceUrl.searchParams.set('symbol', symbol);
    const response = await fetch(binanceUrl);
    if (!response.ok) throw new Error(`Binance returned HTTP ${response.status}.`);
    const data = await response.json();
    return jsonResponse(200, { price: parsePrice(data?.price) });
  } catch (binanceError) {
    console.warn(`Binance price request failed for ${symbol}; trying CoinGecko.`, binanceError);
  }

  try {
    const fallbackUrl = new URL('https://api.coingecko.com/api/v3/simple/price');
    fallbackUrl.searchParams.set('ids', coinId);
    fallbackUrl.searchParams.set('vs_currencies', 'usd');
    const response = await fetch(fallbackUrl);
    if (!response.ok) throw new Error(`CoinGecko returned HTTP ${response.status}.`);
    const data = await response.json();
    return jsonResponse(200, { price: parsePrice(data?.[coinId]?.usd) });
  } catch (error) {
    console.error(`Binance and CoinGecko price requests failed for ${symbol}.`, error);
    return jsonResponse(502, { success: false, message: 'Market price unavailable' });
  }
}
