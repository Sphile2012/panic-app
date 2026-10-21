const PROXY_API_KEY = 'panic-ring-public-proxy-key';
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const HOP_BY_HOP_HEADERS = new Set([
  'connection', 'content-length', 'host', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function upstreamConfig(env) {
  const supabaseUrl = env.SUPABASE_URL;
  const publishableKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey)
    return null;
  try {
    const url = new URL(supabaseUrl);
    const local = ['localhost', '127.0.0.1', '[::1]', 'kong'].includes(url.hostname);
    if ((!['https:', 'http:'].includes(url.protocol)) ||
        (url.protocol === 'http:' && !local) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash)
      return null;
    return { url, anonKey: publishableKey };
  }
  catch {
    return null;
  }
}

function upstreamPath(event) {
  const requestUrl = new URL(event.rawUrl ?? `https://local${event.path ?? '/'}`);
  let path = requestUrl.pathname;
  if (path.startsWith('/api/'))
    path = path.slice(4);
  else {
    const functionPrefix = '/.netlify/functions/supabase-proxy/';
    if (!path.startsWith(functionPrefix))
      return null;
    path = `/${path.slice(functionPrefix.length)}`;
  }
  if (!/^\/(?:auth|rest)\/v1(?:\/|$)/.test(path) ||
      /(?:^|\/)\.\.?\/|\\|%2f|%5c/i.test(path))
    return null;
  return `${path}${requestUrl.search}`;
}

function response(statusCode, message) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({ error: message }),
  };
}

export async function handler(event) {
  if (!ALLOWED_METHODS.has(event.httpMethod))
    return response(405, 'Method not allowed.');
  const config = upstreamConfig(process.env);
  if (!config)
    return response(503, 'Account service is not configured.');
  const path = upstreamPath(event);
  if (!path)
    return response(404, 'Not found.');

  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers ?? {})) {
    const lowerName = name.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lowerName) && typeof value === 'string')
      headers.set(lowerName, value);
  }
  headers.set('apikey', config.anonKey);
  if (headers.get('authorization') === `Bearer ${PROXY_API_KEY}`)
    headers.set('authorization', `Bearer ${config.anonKey}`);

  const body = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64')
    : event.body || undefined;
  try {
    const upstream = await fetch(new URL(path, config.url), {
      method: event.httpMethod,
      headers,
      body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : body,
      signal: AbortSignal.timeout(15_000),
    });
    if (upstream.status >= 500) {
      console.warn(`[api] Supabase upstream returned status ${upstream.status}`);
      return response(502, 'Account service is temporarily unavailable.');
    }
    const responseHeaders = {};
    upstream.headers.forEach((value, name) => {
      if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()))
        responseHeaders[name] = value;
    });
    responseHeaders['cache-control'] = 'no-store';
    const responseBody = event.httpMethod === 'HEAD' ? '' : Buffer.from(await upstream.arrayBuffer()).toString('base64');
    return {
      statusCode: upstream.status,
      headers: responseHeaders,
      body: responseBody,
      isBase64Encoded: event.httpMethod !== 'HEAD',
    };
  }
  catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    console.error(`[api] Supabase proxy ${timedOut ? 'timed out' : 'request failed'}`);
    return response(timedOut ? 504 : 502, 'Account service is temporarily unavailable.');
  }
}
