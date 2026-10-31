const PAGES_ORIGIN = 'https://siansari11.github.io';

function allowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (
    origin === PAGES_ORIGIN ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  ) {
    return origin;
  }
  return PAGES_ORIGIN;
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(request),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function blockedHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '0.0.0.0' || host === 'metadata.google.internal') return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  return false;
}

export async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(request) });
  }

  const target = new URL(request.url).searchParams.get('url') || '';
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response('Pass ?url=https://calendar.example/basic.ics', {
      status: 400,
      headers: corsHeaders(request),
    });
  }
  if (parsed.protocol !== 'https:' || blockedHost(parsed.hostname)) {
    return new Response('Only public https calendar links are allowed.', {
      status: 400,
      headers: corsHeaders(request),
    });
  }

  const upstream = await fetch(parsed.toString(), {
    redirect: 'follow',
    headers: {
      Accept: 'text/calendar, text/plain, */*',
      'User-Agent': 'OurHome/1.0',
    },
    signal: AbortSignal.timeout(28000),
  });
  const body = await upstream.arrayBuffer();
  const headers = new Headers(corsHeaders(request));
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'text/calendar; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=300');
  return new Response(body, { status: upstream.status, headers });
}

export default {
  fetch: handleRequest,
};
