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

const AUTH_KEY = 'alexa:auth';

function berlinStamp(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000`;
}

async function loadAuth(env) {
  if (!env.TOKENS) return null;
  const raw = await env.TOKENS.get(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveAuth(env, auth) {
  if (!env.TOKENS) return;
  await env.TOKENS.put(AUTH_KEY, JSON.stringify(auth));
}

async function exchangeAlexaCode(env, code) {
  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.ALEXA_CLIENT_ID || '',
      client_secret: env.ALEXA_CLIENT_SECRET || '',
    }),
  });
  if (!response.ok) return null;
  return response.json();
}

async function alexaAccessToken(env, auth) {
  if (auth.accessToken && auth.expiresAt > Date.now() + 60_000) return auth.accessToken;
  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
      client_id: env.ALEXA_CLIENT_ID || '',
      client_secret: env.ALEXA_CLIENT_SECRET || '',
    }),
  });
  if (!response.ok) return '';
  const next = await response.json();
  const updated = {
    ...auth,
    accessToken: next.access_token,
    refreshToken: next.refresh_token || auth.refreshToken,
    expiresAt: Date.now() + (next.expires_in || 3600) * 1000,
  };
  await saveAuth(env, updated);
  return updated.accessToken;
}

async function createInSessionTimer(endpoint, token, duration) {
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/v1/alerts/timers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      duration,
      timerLabel: 'Our Home',
      creationBehavior: { displayExperience: { visibility: 'VISIBLE' } },
      triggeringBehavior: {
        operation: { type: 'ANNOUNCE', textToAnnounce: [{ locale: 'en-US', text: 'Kitchen timer is done.' }] },
        notificationConfig: { playAudible: true },
      },
    }),
  });
  return response.ok;
}

async function createReminder(endpoint, token, when, label) {
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/v1/alerts/reminders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestTime: new Date().toISOString(),
      trigger: {
        type: 'SCHEDULED_ABSOLUTE',
        scheduledTime: berlinStamp(when),
        timeZoneId: 'Europe/Berlin',
      },
      alertInfo: {
        spokenInfo: {
          content: [{ locale: 'en-US', text: `${label || 'Kitchen'} timer is done.` }],
        },
      },
      pushNotification: { status: 'ENABLED' },
    }),
  });
  return { ok: response.ok, status: response.status, detail: await response.text() };
}

function permissionCard() {
  return new Response(
    JSON.stringify({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Allow reminders so the kitchen tablet can ring this Echo when a timer ends.',
        },
        card: {
          type: 'AskForPermissionsConsent',
          permissions: ['alexa::alerts:reminders:skill:readwrite'],
        },
        shouldEndSession: true,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
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

    if (url.pathname === '/alexa/status' && request.method === 'GET') {
      const auth = await loadAuth(env);
      return json(request, {
        linked: Boolean(auth?.refreshToken),
        missingKv: !env.TOKENS,
        missingSecret: !env.ALEXA_CLIENT_ID || !env.ALEXA_CLIENT_SECRET,
      });
    }

    if (url.pathname === '/alexa/timer' && request.method === 'POST') {
      const payload = await request.json();
      const seconds = Math.max(15, Number(payload.durationSeconds) || 60);
      const minutes = Math.max(1, Math.round(seconds / 60));
      const say = `Alexa, tell Our Home to set a timer for ${minutes} minutes.`;
      if (!env.TOKENS) {
        return json(request, { ok: false, message: `Add the TOKENS KV namespace, then enable the skill and allow reminders. Until then, say: ${say}` });
      }
      if (!env.ALEXA_CLIENT_ID || !env.ALEXA_CLIENT_SECRET) {
        return json(request, { ok: false, message: `Set the worker secrets ALEXA_CLIENT_ID and ALEXA_CLIENT_SECRET from the skill Permissions page. Until then, say: ${say}` });
      }
      const auth = await loadAuth(env);
      if (!auth?.refreshToken) {
        return json(request, { ok: false, message: `Open the Our Home skill in the Alexa app and allow reminders. Until then, say: ${say}` });
      }
      const access = await alexaAccessToken(env, auth);
      if (!access) {
        return json(request, { ok: false, message: `Alexa rejected the saved login. Enable the skill again and allow reminders. Or say: ${say}` });
      }
      const when = new Date(Date.now() + seconds * 1000);
      const created = await createReminder(auth.apiEndpoint || 'https://api.eu.amazonalexa.com', access, when, payload.label || 'Kitchen');
      return json(request, created.ok
        ? { ok: true, message: 'Echo will announce when this timer ends.' }
        : { ok: false, message: `Alexa did not create the reminder (${created.status}). Say: ${say}` });
    }

    if (url.pathname === '/alexa' && request.method === 'POST') {
      const body = await request.json();
      const requestType = body.request?.type;
      const intent = body.request?.intent?.name;
      const endpoint = body.context?.System?.apiEndpoint || 'https://api.eu.amazonalexa.com';
      if (requestType === 'Alexa.Authorization.Grant') {
        const code = body.request?.body?.grant?.code;
        if (!env.TOKENS || !env.ALEXA_CLIENT_ID || !code) {
          return new Response(JSON.stringify({ version: '1.0', response: {} }), { headers: { 'Content-Type': 'application/json' } });
        }
        const token = await exchangeAlexaCode(env, code);
        if (token?.refresh_token) {
          await saveAuth(env, {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + (token.expires_in || 3600) * 1000,
            apiEndpoint: endpoint,
          });
        }
        return new Response(JSON.stringify({ version: '1.0', response: {} }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (requestType === 'LaunchRequest') {
        const auth = await loadAuth(env);
        if (!auth?.refreshToken) return permissionCard();
        return alexa('Our Home can ring this Echo when the kitchen timer ends.');
      }
      if (intent === 'SetTimerIntent') {
        const duration = body.request?.intent?.slots?.duration?.value || 'PT5M';
        const token = body.context?.System?.apiAccessToken;
        if (!token) return alexa('I can set an Echo timer only while you are talking to Our Home.');
        const ok = await createInSessionTimer(endpoint, token, duration);
        return alexa(ok ? 'Timer set on this Echo.' : 'Amazon did not accept the timer. Allow the timers permission for Our Home.');
      }
      if (intent === 'DismissTimerIntent' || intent === 'AMAZON.StopIntent' || intent === 'AMAZON.CancelIntent') {
        return alexa('If the kitchen tablet is still alarming, tap Dismiss on the screen.');
      }
      return alexa('Say set a timer for five minutes.');
    }

    return json(request, { ok: false, message: 'Not found.' }, 404);
  },
};
