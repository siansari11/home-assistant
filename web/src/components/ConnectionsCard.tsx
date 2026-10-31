import { useEffect, useState } from 'react';
import type { Store } from '../types';
import {
  beginSpotifyLogin,
  clearSpotifyTokens,
  connectWebPlayer,
  isEcho,
  loadSpotifyTokens,
  nextTrack,
  nowPlaying,
  pausePlayback,
  previousTrack,
  resumePlayback,
  setVolume,
  spotifyAccessToken,
  spotifyDevices,
  spotifyMe,
  spotifyRedirectUri,
  transferPlayback,
  type NowPlaying,
  type SpotifyDevice,
} from '../lib/spotify';

export function ConnectionsCard({
  store,
  refreshKey,
  loginError,
  alexaNote,
  onPatch,
}: {
  store: Store;
  refreshKey: number;
  loginError: string;
  alexaNote: string;
  onPatch: (partial: Partial<Store['settings']>) => void;
}) {
  const [profile, setProfile] = useState('');
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [playing, setPlaying] = useState<NowPlaying | null>(null);
  const [activeId, setActiveId] = useState('');
  const [message, setMessage] = useState('');
  const [volume, setVolumeState] = useState(40);
  const [echoTest, setEchoTest] = useState('');
  const connected = Boolean(loadSpotifyTokens());
  const clientId = store.settings.spotifyClientId;
  const apiBase = store.settings.apiBase;

  useEffect(() => {
    if (!loadSpotifyTokens() || !clientId.trim()) return;
    let stop = false;
    const token = () => spotifyAccessToken(clientId, apiBase);
    const pull = () => {
      void token()
        .then(async (access) => {
          if (stop) return;
          setProfile(await spotifyMe(access));
          setDevices(await spotifyDevices(access));
          setPlaying(await nowPlaying(access));
        })
        .catch((error: unknown) => {
          if (!stop) setMessage(error instanceof Error ? error.message : 'Spotify request failed.');
        });
    };
    pull();
    const id = window.setInterval(pull, 8000);
    void connectWebPlayer(token)
      .then(({ deviceId }) => {
        if (!stop) setActiveId(deviceId);
      })
      .catch((error: unknown) => {
        if (!stop) setMessage(error instanceof Error ? error.message : 'In-app player needs Spotify Premium.');
      });
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [apiBase, clientId, refreshKey, connected]);

  const withToken = async (action: (token: string) => Promise<void>) => {
    try {
      const token = await spotifyAccessToken(clientId, apiBase);
      await action(token);
      setPlaying(await nowPlaying(token));
      setDevices(await spotifyDevices(token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Spotify control failed.');
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="font-serif text-2xl">Connections</h2>
      <div className="mt-4 grid gap-4 min-[900px]:grid-cols-2">
        <div>
          <h3 className="font-medium">Music on Echo</h3>
          <p className="mt-1 text-sm text-muted">
            Link Spotify in the Alexa app first. The Echo then shows up here as a Spotify Connect speaker. Playback on that speaker does not use a custom Alexa music skill. In-app playback needs Spotify Premium.
          </p>
          <label className="mt-3 block text-sm">
            Spotify Client ID
            <input
              value={clientId}
              onChange={(event) => onPatch({ spotifyClientId: event.target.value.trim() })}
              placeholder="From developer.spotify.com"
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-sage"
            />
          </label>
          <p className="mt-1 text-xs text-muted">Redirect URI: {spotifyRedirectUri()}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                void beginSpotifyLogin(clientId).catch((error: unknown) => {
                  setMessage(error instanceof Error ? error.message : 'Could not start Spotify login.');
                });
              }}
            >
              Connect Spotify
            </button>
            {connected && (
              <button
                type="button"
                className="rounded-full border border-line px-4 py-2 text-sm"
                onClick={() => {
                  clearSpotifyTokens();
                  setProfile('');
                  setDevices([]);
                  setPlaying(null);
                }}
              >
                Disconnect
              </button>
            )}
          </div>
          {profile && <p className="mt-2 text-sm">Signed in as {profile}</p>}
          {playing && (
            <div className="mt-3 flex items-center gap-3">
              {playing.art ? <img src={playing.art} alt="" className="h-14 w-14 rounded-xl object-cover" /> : null}
              <div>
                <p className="font-medium">{playing.title}</p>
                <p className="text-sm text-muted">{playing.artist}</p>
                <p className="text-xs text-muted">{playing.deviceName ? `On ${playing.deviceName}` : 'No active speaker'}</p>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-line px-3 py-2 text-sm" onClick={() => void withToken((token) => previousTrack(token, activeId || undefined))}>
              Previous
            </button>
            <button
              type="button"
              className="rounded-full bg-ink px-3 py-2 text-sm text-white"
              onClick={() => void withToken((token) => (playing?.paused ? resumePlayback(token, activeId || undefined) : pausePlayback(token, activeId || undefined)))}
            >
              {playing?.paused === false ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="rounded-full border border-line px-3 py-2 text-sm" onClick={() => void withToken((token) => nextTrack(token, activeId || undefined))}>
              Next
            </button>
          </div>
          <label className="mt-3 block text-sm">
            Volume {volume}
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolumeState(next);
                void withToken((token) => setVolume(token, next, activeId || undefined));
              }}
              className="mt-1 w-full"
            />
          </label>
          <ul className="mt-3 space-y-2">
            {devices.length === 0 && connected && <li className="text-sm text-muted">No Spotify Connect devices yet. Open Spotify on the Echo, or link Spotify in the Alexa app.</li>}
            {devices.map((device) => (
              <li key={device.id || device.name} className="flex items-center justify-between gap-2 rounded-2xl bg-paper px-3 py-2">
                <span>
                  <span className="block font-medium">{device.name}</span>
                  <span className="text-xs text-muted">{isEcho(device) ? 'Echo or speaker' : device.type}{device.is_active ? ' · active' : ''}</span>
                </span>
                <button
                  type="button"
                  disabled={!device.id}
                  className="rounded-full bg-sage px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                  onClick={() => {
                    if (!device.id) return;
                    setActiveId(device.id);
                    void withToken((token) => transferPlayback(token, device.id as string));
                  }}
                >
                  Play here
                </button>
              </li>
            ))}
          </ul>
          {(loginError || message) && <p className="mt-2 text-sm text-clay-deep">{loginError || message}</p>}
        </div>
        <div>
          <h3 className="font-medium">Ring the Echo</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Deploy cloudflare/our-home-api and paste its URL below.</li>
            <li>In the Alexa console, create the Our Home skill from alexa/ and turn on Reminders and Timers.</li>
            <li>Set the skill endpoint to that URL plus /alexa. Copy the Alexa Skill Messaging client id and secret into the worker secrets.</li>
            <li>Enable the dev skill on this Amazon account and allow reminders.</li>
            <li>Turn on Ring on Echo, then start the kitchen timer. The Echo announces when it ends. The tablet alarm still loops until Dismiss.</li>
          </ol>
          <p className="mt-2 text-sm text-muted">
            Amazon’s timer API only works while you are talking to the skill. The tablet creates an Alexa reminder instead, which is what makes the Echo speak at the end. If that login is missing, say: Alexa, tell Our Home to set a timer.
          </p>
          <label className="mt-3 block text-sm">
            API worker URL
            <input
              value={store.settings.apiBase}
              onChange={(event) => onPatch({ apiBase: event.target.value.trim() })}
              placeholder="https://our-home-api.account.workers.dev"
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-sage"
            />
          </label>
          <label className="mt-3 block text-sm">
            Alexa skill page
            <input
              value={store.settings.alexaSkillUrl}
              onChange={(event) => onPatch({ alexaSkillUrl: event.target.value.trim() })}
              placeholder="https://alexa.amazon.com/spa/index.html#skills/your-skills/dev"
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-sage"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="rounded-full border border-line px-4 py-2 text-sm"
              href={store.settings.alexaSkillUrl || 'https://alexa.amazon.com/spa/index.html#skills/your-skills/dev'}
              target="_blank"
              rel="noreferrer"
            >
              Connect Alexa
            </a>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={store.settings.ringOnAlexa}
              onChange={(event) => onPatch({ ringOnAlexa: event.target.checked })}
            />
            Ring on Echo when the kitchen timer starts
          </label>
          <button
            type="button"
            className="mt-3 rounded-full bg-ink px-4 py-2 text-sm text-white"
            onClick={() => {
              const base = store.settings.apiBase.replace(/\/$/, '');
              if (!base) {
                setEchoTest('Paste the API worker URL first.');
                return;
              }
              void fetch(`${base}/alexa/timer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ durationSeconds: 60, label: 'Kitchen test' }),
              })
                .then(async (response) => {
                  const json = (await response.json()) as { message?: string };
                  setEchoTest(json.message || 'No response from the worker.');
                })
                .catch(() => setEchoTest('Could not reach the API worker.'));
            }}
          >
            Test Echo in 1 minute
          </button>
          {(echoTest || alexaNote) && <p className="mt-2 text-sm text-clay-deep">{echoTest || alexaNote}</p>}
        </div>
      </div>
    </section>
  );
}
