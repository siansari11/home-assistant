import { useCallback, useEffect, useRef, useState } from 'react';
import { NavBar } from './components/NavBar';
import { LockIcon, WeatherGlyph } from './components/Icons';
import { playChime } from './lib/beep';
import { formatClock, todayIso } from './lib/dates';
import { configuredProxy, fetchIcs, normalizeCalendarUrl, parseIcs } from './lib/ics';
import { completeSpotifyLogin } from './lib/spotify';
import { loadStore, loadTimer, saveStore, saveTimer } from './lib/storage';
import { loadWeather, weatherLabel } from './lib/weather';
import { CalendarScreen } from './screens/CalendarScreen';
import { ChoresScreen } from './screens/ChoresScreen';
import { HomeScreen } from './screens/HomeScreen';
import { HouseScreen } from './screens/HouseScreen';
import { LockScreen } from './screens/LockScreen';
import { MealsScreen } from './screens/MealsScreen';
import type { CalendarCache, PersonId, ScreenId, Store, TimerState, WeatherReport } from './types';

const IDLE_MS = 3 * 60 * 1000;

function persistTimer(current: TimerState, next: TimerState): TimerState {
  if (
    next.status !== current.status ||
    next.endsAt !== current.endsAt ||
    next.label !== current.label ||
    next.durationMs !== current.durationMs ||
    next.remainingMs !== current.remainingMs && next.status !== 'running'
  ) {
    saveTimer(next);
  }
  return next;
}

export function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [timer, setTimerState] = useState<TimerState>(() => loadTimer());
  const [screen, setScreen] = useState<ScreenId>('home');
  const [locked, setLocked] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [spotifyRefresh, setSpotifyRefresh] = useState(0);
  const [spotifyError, setSpotifyError] = useState('');
  const [alexaNote, setAlexaNote] = useState('');
  const audioRef = useRef<AudioContext | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  const updateStore = useCallback((patch: (current: Store) => Store) => {
    setStore((current) => {
      const next = patch(current);
      saveStore(next);
      return next;
    });
  }, []);

  const setTimer = useCallback((next: TimerState | ((current: TimerState) => TimerState)) => {
    setTimerState((current) => persistTimer(current, typeof next === 'function' ? next(current) : next));
  }, []);

  const armAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    void audioRef.current.resume();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) return;
    const settings = storeRef.current.settings;
    void completeSpotifyLogin(code, state, settings.spotifyClientId, settings.apiBase)
      .then(() => setSpotifyRefresh((value) => value + 1))
      .catch((error: unknown) => setSpotifyError(error instanceof Error ? error.message : 'Spotify login failed.'))
      .finally(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      });
  }, []);

  useEffect(() => {
    if (timer.status !== 'running' || !timer.endsAt) return;
    const settings = storeRef.current.settings;
    if (!settings.ringOnAlexa) return;
    if (!settings.apiBase.trim()) {
      setAlexaNote('Turn on the API worker URL under Connections before Alexa can take this timer.');
      return;
    }
    const seconds = Math.max(1, Math.round((timer.endsAt - Date.now()) / 1000));
    const minutes = Math.max(1, Math.round(seconds / 60));
    void fetch(`${settings.apiBase.replace(/\/$/, '')}/alexa/timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSeconds: seconds, label: timer.label || 'Our Home' }),
    })
      .then(async (response) => {
        const json = (await response.json()) as { ok?: boolean; say?: string; message?: string };
        setAlexaNote(json.say || json.message || (json.ok ? 'Alexa timer requested.' : 'Alexa did not start the timer.'));
      })
      .catch(() => {
        setAlexaNote(`Could not reach the API worker. Say: Alexa, tell Our Home to set a timer for ${minutes} minutes.`);
      });
  }, [timer.endsAt, timer.label, timer.status]);

  useEffect(() => {
    let cancelled = false;
    const pull = () => {
      loadWeather()
        .then((report) => {
          if (!cancelled) setWeather(report);
        })
        .catch(() => {
          if (!cancelled) setWeather((current) => current);
        });
    };
    pull();
    const id = window.setInterval(pull, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (timer.status !== 'running' || !timer.endsAt) return;
    const endsAt = timer.endsAt;
    let finished = false;
    const id = window.setInterval(() => {
      const remainingMs = endsAt - Date.now();
      if (remainingMs <= 0) {
        if (finished) return;
        finished = true;
        setTimer((current) => ({ ...current, status: 'done', remainingMs: 0, endsAt: null }));
        return;
      }
      setTimerState((current) => (current.endsAt === endsAt ? { ...current, remainingMs } : current));
    }, 200);
    return () => window.clearInterval(id);
  }, [setTimer, timer.endsAt, timer.status]);

  useEffect(() => {
    if (timer.status !== 'done') return;
    let stopped = false;
    const long = storeRef.current.settings.echoAlarm;
    const ring = () => {
      if (stopped) return;
      if (!audioRef.current) audioRef.current = new AudioContext();
      const context = audioRef.current;
      void context.resume().then(() => {
        if (!stopped && context.state === 'running') playChime(context, long);
      });
      navigator.vibrate?.(long ? [320, 100, 320, 100, 320, 160, 480] : [180, 80, 180, 80, 240]);
    };
    ring();
    const id = window.setInterval(ring, long ? 4200 : 2200);
    const unlock = () => {
      void audioRef.current?.resume();
    };
    window.addEventListener('pointerdown', unlock);
    return () => {
      stopped = true;
      window.clearInterval(id);
      window.removeEventListener('pointerdown', unlock);
    };
  }, [timer.status]);

  const dismissTimer = useCallback(() => {
    setTimer((current) => ({
      ...current,
      status: 'idle',
      remainingMs: current.durationMs > 0 ? current.durationMs : 10 * 60 * 1000,
      endsAt: null,
    }));
  }, [setTimer]);

  useEffect(() => {
    if (locked || timer.status === 'running' || timer.status === 'done') return;
    let id = window.setTimeout(() => setLocked(true), IDLE_MS);
    const bump = () => {
      window.clearTimeout(id);
      id = window.setTimeout(() => setLocked(true), IDLE_MS);
    };
    const events = ['pointerdown', 'keydown'] as const;
    for (const event of events) window.addEventListener(event, bump, { passive: true });
    return () => {
      window.clearTimeout(id);
      for (const event of events) window.removeEventListener(event, bump);
    };
  }, [locked, timer.status]);

  const calendarWindow = () => ({
    rangeStart: new Date(Date.now() - 86400000),
    rangeEnd: new Date(Date.now() + 45 * 86400000),
  });

  const sync = useCallback(async () => {
    const current = storeRef.current;
    const urls = current.settings.calendars;
    if (!urls.sehrish && !urls.andre) return;
    setSyncing(true);
    try {
      const { rangeStart, rangeEnd } = calendarWindow();
      const proxy = configuredProxy(current.settings.icsProxy);
      const errors: CalendarCache['errors'] = {};
      const events: CalendarCache['events'] = [];
      for (const person of ['sehrish', 'andre'] as PersonId[]) {
        const url = normalizeCalendarUrl(urls[person]);
        if (!url) {
          events.push(...current.calendarCache.events.filter((event) => event.person === person));
          continue;
        }
        try {
          const text = await fetchIcs(url, proxy);
          events.push(...parseIcs(text, person, rangeStart, rangeEnd));
        } catch (error) {
          errors[person] = error instanceof Error ? error.message : 'Sync failed';
          events.push(...current.calendarCache.events.filter((event) => event.person === person));
        }
      }
      events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
      updateStore((latest) => ({
        ...latest,
        calendarCache: { fetchedAt: Date.now(), events, errors },
      }));
    } finally {
      setSyncing(false);
    }
  }, [updateStore]);

  const importCalendar = useCallback(
    (person: PersonId, text: string) => {
      if (!text.includes('BEGIN:VCALENDAR')) {
        throw new Error('That is not a calendar file. In Google Calendar use Settings → Integrate calendar → Export, or download the secret iCal link.');
      }
      const { rangeStart, rangeEnd } = calendarWindow();
      const parsed = parseIcs(text, person, rangeStart, rangeEnd);
      updateStore((latest) => {
        const errors = { ...latest.calendarCache.errors };
        delete errors[person];
        const events = [...latest.calendarCache.events.filter((event) => event.person !== person), ...parsed];
        events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
        return {
          ...latest,
          calendarCache: { fetchedAt: Date.now(), events, errors },
        };
      });
      return parsed.length;
    },
    [updateStore],
  );

  useEffect(() => {
    if (locked) return;
    const cache = storeRef.current.calendarCache;
    const urls = storeRef.current.settings.calendars;
    const stale = !cache.fetchedAt || Date.now() - cache.fetchedAt > 30 * 60 * 1000;
    if (stale && (urls.sehrish || urls.andre)) void sync();
  }, [locked, sync]);

  const today = todayIso(now);
  const nextEvent =
    store.calendarCache.events.find((event) => (event.allDay ? event.end > today : new Date(event.start).getTime() >= now.getTime() - 60_000)) ?? null;

  const alarm = timer.status === 'done' ? <AlarmBanner label={timer.label} onDismiss={dismissTimer} /> : null;

  if (locked) {
    return (
      <>
        <LockScreen now={now} weather={weather} nextEvent={nextEvent} timer={timer} onWake={() => setLocked(false)} />
        {alarm}
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-transparent min-[900px]:flex-row">
      <NavBar current={screen} onChange={setScreen} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={() => setScreen('home')} className="font-serif text-2xl text-ink">
            Our Home
          </button>
          <div className="flex items-center gap-2">
            {weather && (
              <span className="hidden items-center gap-1 rounded-full bg-card px-3 py-1.5 text-sm text-ink sm:inline-flex">
                <WeatherGlyph code={weather.now.code} className="h-4 w-4 text-sage" />
                {weather.now.temperature}° {weatherLabel(weather.now.code)}
              </span>
            )}
            {(timer.status === 'running' || timer.status === 'paused' || timer.status === 'done') && (
              <button
                type="button"
                onClick={() => (timer.status === 'done' ? dismissTimer() : setScreen('house'))}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${timer.status === 'done' ? 'bg-clay text-white' : 'bg-sage-soft text-sage-deep'}`}
              >
                {timer.status === 'done' ? 'Dismiss' : formatClockRemaining(timer.remainingMs)}
                {timer.status !== 'done' && timer.label ? ` · ${timer.label}` : ''}
              </button>
            )}
            <button type="button" aria-label="Lock" onClick={() => setLocked(true)} className="grid h-11 w-11 place-items-center rounded-full bg-card text-ink">
              <LockIcon className="h-5 w-5" />
            </button>
            <span className="font-serif text-2xl tabular-nums text-ink">{formatClock(now)}</span>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4" data-screen={screen}>
          {screen === 'home' && <HomeScreen now={now} store={store} weather={weather} events={store.calendarCache.events} />}
          {screen === 'calendar' && <CalendarScreen now={now} store={store} syncing={syncing} onSync={() => void sync()} />}
          {screen === 'meals' && (
            <MealsScreen now={now} store={store} onChange={(meals) => updateStore((current) => ({ ...current, meals }))} />
          )}
          {screen === 'chores' && (
            <ChoresScreen now={now} store={store} onChange={(chores) => updateStore((current) => ({ ...current, chores }))} />
          )}
          {screen === 'house' && (
            <HouseScreen
              store={store}
              timer={timer}
              syncing={syncing}
              onTimer={setTimer}
              onArmAudio={armAudio}
              onShopping={(shopping) => updateStore((current) => ({ ...current, shopping }))}
              onCalendars={(calendars) =>
                updateStore((current) => ({ ...current, settings: { ...current.settings, calendars } }))
              }
              onProxy={(icsProxy) => updateStore((current) => ({ ...current, settings: { ...current.settings, icsProxy } }))}
              onImport={importCalendar}
              onSync={() => void sync()}
              spotifyRefresh={spotifyRefresh}
              spotifyError={spotifyError}
              alexaNote={alexaNote}
              onPatchSettings={(partial) =>
                updateStore((current) => ({ ...current, settings: { ...current.settings, ...partial } }))
              }
            />
          )}
        </main>
      </div>
      {alarm}
    </div>
  );
}

function AlarmBanner({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  return (
    <div className="alarm-flash pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-6">
      <button type="button" onClick={onDismiss} className="pointer-events-auto rounded-full bg-clay px-6 py-4 text-lg font-medium text-white shadow-card">
        Dismiss{label ? ` · ${label}` : ''}
      </button>
    </div>
  );
}

function formatClockRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
