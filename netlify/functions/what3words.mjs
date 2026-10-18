export async function handler(event) {
  if (event.httpMethod !== 'GET')
    return { statusCode: 405, headers: { 'cache-control': 'no-store' }, body: '{"error":"Method not allowed."}' };
  const key = process.env.WHAT3WORDS_API_KEY;
  const params = new URLSearchParams(event.rawQuery ?? '');
  const coordinates = params.get('coordinates') ?? '';
  const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(coordinates);
  const latitude = match ? Number(match[1]) : NaN;
  const longitude = match ? Number(match[2]) : NaN;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    return { statusCode: 400, headers: { 'cache-control': 'no-store' }, body: '{"error":"Invalid coordinates."}' };
  if (!key)
    return { statusCode: 503, headers: { 'cache-control': 'no-store' }, body: '{"error":"Location service unavailable."}' };
  try {
    const url = new URL('https://api.what3words.com/v3/convert-to-3wa');
    url.searchParams.set('coordinates', coordinates);
    url.searchParams.set('language', 'en');
    url.searchParams.set('key', key);
    const result = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (result.status >= 500) {
      console.warn(`[api] what3words upstream returned status ${result.status}`);
      return { statusCode: 502, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: '{"error":"Location service unavailable."}' };
    }
    const body = await result.text();
    return {
      statusCode: result.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body,
    };
  }
  catch {
    console.error('[api] what3words request failed');
    return { statusCode: 502, headers: { 'cache-control': 'no-store' }, body: '{"error":"Location service unavailable."}' };
  }
}
