const PAGES_ORIGIN = 'https://siansari11.github.io';

function allowOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (origin === PAGES_ORIGIN || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return origin;
  return PAGES_ORIGIN;
}

function cors(request, extra = {}) {
  return {
    'Access-Control-Allow-Origin': allowOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    ...extra,
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors(request, { 'Content-Type': 'application/json' }),
  });
}

function alexa(speech) {
  return new Response(
    JSON.stringify({
      version: '1.0',
      response: { outputSpeech: { type: 'PlainText', text: speech }, shouldEndSession: true },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

function isoDuration(seconds) {
  const total = Math.max(1, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${secs && !hours && !minutes ? `${secs}S` : secs ? `${secs}S` : ''}`;
}

async function createEchoTimer(endpoint, token, duration, label) {
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/v1/alerts/timers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      duration,
      timerLabel: label || 'Our Home',
      creationBehavior: { displayExperience: { visibility: 'VISIBLE' } },
      triggeringBehavior: {
        operation: {
          type: 'ANNOUNCE',
          textToAnnounce: [{ locale: 'en-US', text: `${label || 'Kitchen'} timer is done.` }],
        },
        notificationConfig: { playAudible: true },
      },
    }),
  });
  return response.ok;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) });
    const url = new URL(request.url);

    if (url.pathname === '/spotify/token' && request.method === 'POST') {
      const payload = await request.json();
      const form = new URLSearchParams();
      for (const [key, value] of Object.entries(payload)) {
        if (key !== 'deviceId' && value) form.set(key, String(value));
      }
      if (!form.get('refresh_token') && payload.deviceId && env.TOKENS) {
        const saved = await env.TOKENS.get(`spotify:${payload.deviceId}`);
        if (saved) form.set('refresh_token', saved);
      }
      const upstream = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      const token = await upstream.json();
      if (upstream.ok && token.refresh_token && payload.deviceId && env.TOKENS) {
        await env.TOKENS.put(`spotify:${payload.deviceId}`, token.refresh_token);
        delete token.refresh_token;
        token.stored = true;
      }
      return json(request, token, upstream.status);
    }

    if (url.pathname === '/alexa/timer' && request.method === 'POST') {
      const payload = await request.json();
      const minutes = Math.max(1, Math.round((payload.durationSeconds || 60) / 60));
      const say = `Alexa, tell Our Home to set a timer for ${minutes} minutes.`;
      const token = env.TOKENS ? await env.TOKENS.get('alexa:consent') : '';
      if (!token) {
        return json(request, {
          ok: false,
          reason: 'voice-session-required',
          say,
          message: `Amazon has not given this worker an out-of-session timer token. Enable the personal skill, then say: ${say}`,
        });
      }
      const created = await createEchoTimer('https://api.amazonalexa.com', token, isoDuration(payload.durationSeconds || 60), payload.label);
      return json(request, created
        ? { ok: true, message: 'Alexa timer requested.' }
        : { ok: false, reason: 'voice-session-required', say, message: `Alexa refused an out-of-session timer. Say: ${say}` });
    }

    if (url.pathname === '/alexa' && request.method === 'POST') {
      const body = await request.json();
      const requestType = body.request?.type;
      const intent = body.request?.intent?.name;
      if (requestType === 'Alexa.Authorization.Grant' && env.TOKENS && body.request?.body?.grant?.code) {
        await env.TOKENS.put('alexa:consent', body.request.body.grant.code);
        return alexa('Our Home can ask for timers.');
      }
      if (requestType === 'LaunchRequest') return alexa('Our Home is listening. You can set a kitchen timer.');
      if (intent === 'SetTimerIntent') {
        const duration = body.request?.intent?.slots?.duration?.value || 'PT5M';
        const token = body.context?.System?.apiAccessToken;
        const endpoint = body.context?.System?.apiEndpoint;
        if (!token || !endpoint) return alexa('I can set a timer only while you are talking to Our Home.');
        const ok = await createEchoTimer(endpoint, token, duration, 'Our Home');
        return alexa(ok ? 'Timer set on this Echo.' : 'Amazon did not accept the timer.');
      }
      if (intent === 'DismissTimerIntent' || intent === 'AMAZON.StopIntent' || intent === 'AMAZON.CancelIntent') {
        return alexa('If the kitchen tablet is still alarming, tap Dismiss on the screen.');
      }
      return alexa('You can set a timer, or play music from Our Home by choosing this Echo in Spotify.');
    }

    return json(request, { ok: false, message: 'Not found.' }, 404);
  },
};
