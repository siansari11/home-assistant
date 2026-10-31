const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

const TOKEN_KEY = 'our-home.spotify.tokens';
const DEVICE_KEY = 'our-home.spotify.device';
const PKCE_KEY = 'our-home.spotify.pkce';

export type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  storedOnWorker: boolean;
};

export type SpotifyDevice = { id: string | null; name: string; type: string; is_active: boolean };

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  stored?: boolean;
  error?: string;
  error_description?: string;
};

export function spotifyRedirectUri(): string {
  const url = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}

export function loadSpotifyTokens(): SpotifyTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpotifyTokens;
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSpotifyTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function saveTokens(tokens: SpotifyTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function deviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export async function beginSpotifyLogin(clientId: string): Promise<void> {
  const trimmed = clientId.trim();
  if (!trimmed) throw new Error('Paste a Spotify Client ID first.');
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(64)));
  const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));
  const authorize = new URL('https://accounts.spotify.com/authorize');
  authorize.searchParams.set('client_id', trimmed);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('redirect_uri', spotifyRedirectUri());
  authorize.searchParams.set('scope', SCOPES);
  authorize.searchParams.set('code_challenge_method', 'S256');
  authorize.searchParams.set('code_challenge', await codeChallenge(verifier));
  authorize.searchParams.set('state', state);
  window.location.assign(authorize.toString());
}

async function postToken(apiBase: string, fields: Record<string, string>): Promise<TokenResponse> {
  const endpoint = apiBase ? `${apiBase.replace(/\/$/, '')}/spotify/token` : 'https://accounts.spotify.com/api/token';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': apiBase ? 'application/json' : 'application/x-www-form-urlencoded' },
    body: apiBase ? JSON.stringify({ ...fields, deviceId: deviceId() }) : new URLSearchParams(fields),
  });
  const json = (await response.json()) as TokenResponse;
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `Spotify token request failed (${response.status}).`);
  }
  return json;
}

function remember(json: TokenResponse, previous: SpotifyTokens | null): SpotifyTokens {
  const next: SpotifyTokens = {
    accessToken: json.access_token || '',
    refreshToken: json.refresh_token || previous?.refreshToken || '',
    expiresAt: Date.now() + (json.expires_in || 3600) * 1000 - 30_000,
    storedOnWorker: Boolean(json.stored) || Boolean(previous?.storedOnWorker && !json.refresh_token),
  };
  saveTokens(next);
  return next;
}

export async function completeSpotifyLogin(code: string, state: string, clientId: string, apiBase: string): Promise<SpotifyTokens> {
  const raw = sessionStorage.getItem(PKCE_KEY);
  sessionStorage.removeItem(PKCE_KEY);
  const saved = raw ? (JSON.parse(raw) as { verifier?: string; state?: string }) : {};
  if (!saved.verifier || saved.state !== state) throw new Error('Spotify login expired. Connect again.');
  const json = await postToken(apiBase, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: spotifyRedirectUri(),
    client_id: clientId.trim(),
    code_verifier: saved.verifier,
  });
  return remember(json, null);
}

export async function refreshSpotify(clientId: string, apiBase: string): Promise<SpotifyTokens> {
  const current = loadSpotifyTokens();
  if (!current) throw new Error('Spotify is not connected.');
  const fields: Record<string, string> = {
    grant_type: 'refresh_token',
    client_id: clientId.trim(),
  };
  if (current.refreshToken) fields.refresh_token = current.refreshToken;
  const json = await postToken(apiBase, fields);
  return remember(json, current);
}

export async function spotifyAccessToken(clientId: string, apiBase: string): Promise<string> {
  const current = loadSpotifyTokens();
  if (!current) throw new Error('Spotify is not connected.');
  if (current.expiresAt > Date.now()) return current.accessToken;
  const next = await refreshSpotify(clientId, apiBase);
  return next.accessToken;
}

export async function spotifyMe(token: string): Promise<string> {
  const response = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Spotify profile responded ${response.status}.`);
  const json = (await response.json()) as { display_name?: string; email?: string; product?: string };
  const name = json.display_name || json.email || 'Spotify';
  return json.product ? `${name} (${json.product})` : name;
}

export async function spotifyDevices(token: string): Promise<SpotifyDevice[]> {
  const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Devices responded ${response.status}.`);
  const json = (await response.json()) as { devices?: SpotifyDevice[] };
  return json.devices || [];
}

export async function transferPlayback(token: string, deviceId: string): Promise<void> {
  const response = await fetch('https://api.spotify.com/v1/me/player', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId], play: true }),
  });
  if (!response.ok && response.status !== 204) throw new Error(`Transfer responded ${response.status}.`);
}

export type NowPlaying = {
  title: string;
  artist: string;
  art: string;
  paused: boolean;
  deviceName: string;
};

export async function nowPlaying(token: string): Promise<NowPlaying | null> {
  const response = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Now playing responded ${response.status}.`);
  const json = (await response.json()) as {
    is_playing?: boolean;
    device?: { name?: string };
    item?: { name?: string; artists?: Array<{ name?: string }>; album?: { images?: Array<{ url?: string }> } };
  };
  return {
    title: json.item?.name || 'Nothing playing',
    artist: (json.item?.artists || []).map((artist) => artist.name || '').filter(Boolean).join(', '),
    art: json.item?.album?.images?.[0]?.url || '',
    paused: !json.is_playing,
    deviceName: json.device?.name || '',
  };
}

async function playerCommand(token: string, path: string, method: 'PUT' | 'POST', deviceId?: string): Promise<void> {
  const url = new URL(`https://api.spotify.com/v1/me/player/${path}`);
  if (deviceId) url.searchParams.set('device_id', deviceId);
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok && response.status !== 204) throw new Error(`${path} responded ${response.status}.`);
}

export function pausePlayback(token: string, deviceId?: string): Promise<void> {
  return playerCommand(token, 'pause', 'PUT', deviceId);
}

export function resumePlayback(token: string, deviceId?: string): Promise<void> {
  return playerCommand(token, 'play', 'PUT', deviceId);
}

export function nextTrack(token: string, deviceId?: string): Promise<void> {
  return playerCommand(token, 'next', 'POST', deviceId);
}

export function previousTrack(token: string, deviceId?: string): Promise<void> {
  return playerCommand(token, 'previous', 'POST', deviceId);
}

export async function setVolume(token: string, percent: number, deviceId?: string): Promise<void> {
  const url = new URL('https://api.spotify.com/v1/me/player/volume');
  url.searchParams.set('volume_percent', String(Math.max(0, Math.min(100, Math.round(percent)))));
  if (deviceId) url.searchParams.set('device_id', deviceId);
  const response = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok && response.status !== 204) throw new Error(`Volume responded ${response.status}.`);
}

export function isEcho(device: SpotifyDevice): boolean {
  return /echo|alexa|dot/i.test(device.name) || device.type === 'Speaker';
}

type Player = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  addListener: (name: string, cb: (payload: { device_id?: string; message?: string }) => void) => void;
};

export async function connectWebPlayer(getToken: () => Promise<string>): Promise<{ player: Player; deviceId: string }> {
  await loadSdk();
  const SpotifyApi = window.Spotify;
  if (!SpotifyApi) throw new Error('Spotify player failed to load.');
  const player = new SpotifyApi.Player({
    name: 'Our Home',
    volume: 0.5,
    getOAuthToken: (callback: (token: string) => void) => {
      void getToken().then(callback).catch(() => callback(''));
    },
  }) as Player;
  const deviceId = await new Promise<string>((resolve, reject) => {
    player.addListener('ready', ({ device_id }) => device_id && resolve(device_id));
    player.addListener('initialization_error', ({ message }) => reject(new Error(message || 'Player failed to start.')));
    player.addListener('authentication_error', ({ message }) => reject(new Error(message || 'Spotify rejected the player. Premium is required.')));
    player.addListener('account_error', ({ message }) => reject(new Error(`${message || 'Account error.'} Spotify Premium is required for in-app playback.`)));
    void player.connect();
  });
  return { player, deviceId };
}

function loadSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  return new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const existing = document.querySelector('script[data-spotify-sdk]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.dataset.spotifySdk = 'true';
    script.onerror = () => reject(new Error('Could not load the Spotify player.'));
    document.body.appendChild(script);
  });
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        volume: number;
        getOAuthToken: (callback: (token: string) => void) => void;
      }) => Player;
    };
  }
}
