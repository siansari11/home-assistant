const CODE_KEY = 'our-home.alarm.code';
const DEVICE_KEY = 'our-home.alarm.device';
const SIGNAL_KEY = 'our-home.alarm.signal';

export type AlarmSignal = {
  event: 'alarm' | 'dismiss';
  id: string;
  label: string;
  from: string;
};

export function thisDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export function alarmCode(): string {
  const existing = localStorage.getItem(CODE_KEY);
  if (existing && /^[a-z0-9]{12,32}$/.test(existing)) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const created = Array.from(bytes, (value) => (value % 36).toString(36)).join('');
  localStorage.setItem(CODE_KEY, created);
  return created;
}

export function adoptJoinCode(): void {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const join = params.get('join') || '';
  if (/^[a-z0-9]{12,32}$/.test(join)) localStorage.setItem(CODE_KEY, join);
}

export function alarmJoinUrl(): string {
  const url = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  url.hash = `join=${alarmCode()}`;
  return url.href;
}

export function publishSignal(signal: AlarmSignal): void {
  const payload = JSON.stringify(signal);
  localStorage.setItem(SIGNAL_KEY, payload);
  try {
    const channel = new BroadcastChannel(`our-home-${alarmCode()}`);
    channel.postMessage(signal);
    channel.close();
  } catch {
    /* older browsers still have the ntfy relay */
  }
  void fetch(`https://ntfy.sh/ourhome-${alarmCode()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', Title: 'Our Home' },
    body: payload,
  }).catch(() => undefined);
}

export function subscribeSignals(onSignal: (signal: AlarmSignal) => void): () => void {
  const seen = new Set<string>();
  const handle = (signal: AlarmSignal | null) => {
    if (!signal || (signal.event !== 'alarm' && signal.event !== 'dismiss')) return;
    if (!signal.id || seen.has(signal.id)) return;
    seen.add(signal.id);
    onSignal(signal);
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(`our-home-${alarmCode()}`);
    channel.onmessage = (event) => handle(event.data as AlarmSignal);
  } catch {
    channel = null;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== SIGNAL_KEY || !event.newValue) return;
    try {
      handle(JSON.parse(event.newValue) as AlarmSignal);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('storage', onStorage);

  let since = Math.floor(Date.now() / 1000) - 120;
  let stopped = false;
  const poll = async () => {
    try {
      const response = await fetch(`https://ntfy.sh/ourhome-${alarmCode()}/json?poll=1&since=${since}`);
      if (!response.ok) return;
      const text = await response.text();
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        const row = JSON.parse(line) as { time?: number; message?: string; event?: string };
        if (row.time) since = Math.max(since, row.time);
        if (row.event !== 'message' || !row.message) continue;
        handle(JSON.parse(row.message) as AlarmSignal);
      }
    } catch {
      /* relay is best-effort; same-browser sync still works */
    }
  };
  const id = window.setInterval(() => {
    if (!stopped) void poll();
  }, 3000);

  return () => {
    stopped = true;
    window.clearInterval(id);
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}

export async function enableAlarmAlerts(): Promise<void> {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  try {
    await navigator.wakeLock?.request('screen');
  } catch {
    /* the phone can still ring while the page stays open */
  }
}

export function notifyAlarm(label: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification('Our Home', {
      body: `${label || 'Timer'} is done. Tap Dismiss to stop every device.`,
      requireInteraction: true,
    });
  } catch {
    /* notifications are optional */
  }
}
