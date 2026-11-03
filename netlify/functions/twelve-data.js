const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const ALLOWED_INTERVALS = new Set(['1min', '5min', '15min', '1h', '4h', '1day']);

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { success: true });
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { message: 'Method not allowed' });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, { error: 'TWELVE_DATA_API_KEY is not configured on the server.' });
  }

  const requestedSymbol = event.queryStringParameters?.symbol ?? 'XAUUSD';
  const symbol = requestedSymbol === 'XAUUSD' || requestedSymbol === 'XAU/USD'
    ? 'XAU/USD'
    : null;
  if (!symbol) {
    return jsonResponse(400, { error: 'Only XAU/USD historical data is supported.' });
  }

  const interval = event.queryStringParameters?.interval ?? '1min';
  if (!ALLOWED_INTERVALS.has(interval)) {
    return jsonResponse(400, { error: 'Unsupported historical interval.' });
  }

  try {
    const url = new URL('https://api.twelvedata.com/time_series');
    url.search = new URLSearchParams({
      symbol,
      interval,
      outputsize: '100',
      timezone: 'UTC',
      apikey: apiKey,
    }).toString();

    const safeUrl = new URL(url);
    safeUrl.searchParams.set('apikey', '[REDACTED]');
    console.log('Requesting Twelve Data candles:', safeUrl.toString());
    const response = await fetch(url);
    const responseText = await response.text();
    console.log('Twelve Data raw response:', responseText.replaceAll(apiKey, '[REDACTED]'));

    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      console.error('Twelve Data returned a non-JSON response.', { status: response.status });
      return jsonResponse(500, { error: `Failed to fetch XAU/USD data (HTTP ${response.status})` });
    }

    if (!response.ok || payload?.status === 'error' || !Array.isArray(payload?.values)) {
      const providerMessage = typeof payload?.message === 'string'
        ? payload.message
        : `Twelve Data request failed with HTTP ${response.status}.`;
      console.error('Twelve Data historical XAU/USD request failed.', {
        status: response.status,
        providerMessage,
      });
      return jsonResponse(500, { error: providerMessage });
    }

    const candles = payload.values.slice().reverse().map((value) => {
      const time = Math.floor(new Date(value.datetime.replace(' ', 'T') + 'Z').getTime() / 1000);
      const open = parseFloat(value.open);
      const high = parseFloat(value.high);
      const low = parseFloat(value.low);
      const close = parseFloat(value.close);
      const volume = Number(value.volume ?? 0);
      if (
        !Number.isSafeInteger(time) ||
        time <= 0 ||
        ![open, high, low, close, volume].every(Number.isFinite)
      ) {
        throw new Error('Twelve Data returned an invalid candle value.');
      }

      return { time, open, high, low, close, volume };
    }).sort((a, b) => a.time - b.time);

    return jsonResponse(200, { candles });
  } catch (error) {
    console.error('Failed to fetch or parse Twelve Data XAU/USD candles.', error);
    return jsonResponse(500, { error: 'Failed to fetch XAU/USD data' });
  }
}
