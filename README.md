# Our Home

Kitchen-tablet dashboard for Sehrish and André in Seddiner See. It is a Vite + React + TypeScript + Tailwind PWA: a lock screen, home, calendars, the week’s meals, chores, a shopping list, and a kitchen timer. Data stays in this browser’s `localStorage`.

Live site: [https://siansari11.github.io/home-assistant/](https://siansari11.github.io/home-assistant/)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173/home-assistant/](http://localhost:5173/home-assistant/). The dev server uses the same `/home-assistant/` base path as GitHub Pages.

```bash
npm run build
npm run preview
```

## Deploy

The Vite app lives in `web/`. `npm run build` writes `dist/`, and the built `index.html` loads `/home-assistant/assets/…` hashed JS and CSS. There is no trailing hyphen in the path.

Pushes to `main` run `.github/workflows/pages.yml`, which builds the app and:

1. Copies that build onto the repository root (`index.html`, `assets/`, and the other static files). GitHub Pages is publishing `main` as a static site, so those files are what the live URL serves. This does not use Actions artifact storage.
2. Mirrors `dist/` to the `gh-pages` branch with `peaceiris/actions-gh-pages`.

The repository is public, which free GitHub Pages requires. Do not edit the root `index.html` by hand; change `web/` and let the workflow publish the build.

## Android app 1.0.0

versionCode **1**, versionName **1.0.0**. This is a free [Capacitor](https://capacitorjs.com/) wrapper (`com.ourhome.dashboard`, display name Our Home). It does not use the Play Store or any paid service.

The app opens [https://siansari11.github.io/home-assistant/](https://siansari11.github.io/home-assistant/), so a Pages deploy updates the kitchen without a new APK. If that page cannot load, a local offline screen offers **Try again**. After one successful visit, the site’s service worker can open the saved dashboard without a connection.

Kitchen behavior, already in the APK:

- Landscape either way (`sensorLandscape`). For a portrait mount, change `android:screenOrientation` in `android/app/src/main/AndroidManifest.xml` to `fullSensor`.
- The screen stays on.
- Status and navigation bars hide. Swipe in from the edge to show them for a moment.
- Our Home can be chosen as the tablet’s home app.

### Build a debug APK

Use a free JDK 21 and the Android SDK. Android Studio includes both.

```bash
npm install
npm run android:debug
```

The same steps by hand:

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Android Studio: **File → Open** the `android/` folder, then **Build → Build APK(s)**.

The APK is written to:

`android/app/build/outputs/apk/debug/app-debug.apk`

`.github/workflows/android-debug.yml` runs that debug build on GitHub Actions. When the run is green, download the `our-home-debug` artifact. That file is the same debug APK.

### Install on the tablet

1. Copy the APK onto the tablet.
2. Settings → Security, or Apps → Special app access → **Install unknown apps**. Allow it for Files or Chrome.
3. Open the APK and install. No Play Store account is required.
4. Optional kiosk: Settings → Apps → Default apps → **Home app** → Our Home.
5. To leave that mode, swipe in from the edge, open Settings, and choose the previous home app.
6. Screen pinning is the other option: open Our Home, open the overview, and pin it. The tablet shows the unpin gesture.

## Kiosk

The dashboard opens on a lock screen. Tap anywhere to wake. After three minutes without a touch, it locks again. A running or finished kitchen timer keeps the screen awake and is still visible on the lock screen.

The Android app above is the always-on kitchen install. A browser works too: open the Pages URL in Chrome and use **Install app**, or use Fully Kiosk Browser with start URL `https://siansari11.github.io/home-assistant/`.

Desktop Chrome, for a spare laptop on the counter:

```bash
google-chrome --kiosk https://siansari11.github.io/home-assistant/
```

## Connections

House → **Connections**. Music goes to an Echo through Spotify Connect. Alexa is only for timers.

### Spotify

1. Open [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Add redirect URIs exactly: `https://siansari11.github.io/home-assistant/` and `http://localhost:5173/home-assistant/`.
3. Paste the Client ID into House → Connections. Leave the client secret on Spotify; this app uses PKCE and does not store it.
4. In the Alexa app, link Spotify (Settings → Music & Podcasts) so each Echo appears as a Spotify Connect speaker.
5. Tap **Connect Spotify**. Premium is required for the in-browser player. Transfer, play, pause, next, previous, and volume use Spotify Connect and work on the Echo without a custom music skill.
6. Optional: deploy `cloudflare/our-home-api` and paste that origin into **API worker URL**. With a KV namespace named `TOKENS`, the worker keeps the Spotify refresh token. Otherwise the refresh token stays in this browser only.

### Ring the Echo

The tablet cannot call Amazon’s Timers API on its own. That API only works while someone is talking to the skill. Our Home instead creates an Alexa **reminder**, which the Echo speaks aloud when the kitchen timer ends. The tablet alarm still loops until **Dismiss**.

1. `cd cloudflare/our-home-api && npx wrangler kv namespace create TOKENS`, then uncomment the KV block in `wrangler.toml` with the id it prints.
2. `npx wrangler secret put ALEXA_CLIENT_ID` and `npx wrangler secret put ALEXA_CLIENT_SECRET`. Those values are on the skill’s Build → Permissions page, under Alexa Skill Messaging. Then `npx wrangler deploy`.
3. In the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask), create a custom skill named Our Home, invocation name `our home`. Paste `alexa/interaction-model.json`. Use `alexa/skill.json` as the manifest guide. Endpoint: `https://our-home-api.<account>.workers.dev/alexa`.
4. Turn on both permissions: Reminders (`alexa::alerts:reminders:skill:readwrite`) and Timers (`alexa::alerts:timers:skill:readwrite`).
5. Build the skill. In the Alexa app, open Skills → Your Skills → Dev, enable Our Home, and allow reminders.
6. On the tablet, House → Connections → paste the worker origin (no `/alexa`) into **API worker URL**. Tap **Connect Alexa** if you still need the dev-skill list. Turn on **Ring on Echo**. **Test Echo in 1 minute** checks the path.
7. Start the kitchen timer. The Echo announces at the end. If the worker has no saved Alexa login yet, it tells you to say `Alexa, tell Our Home to set a timer for … minutes`, which uses the in-session Timers API.

## Calendar sync

Google’s secret iCal address does not send CORS headers, so the tablet cannot download it directly. Public proxies (`corsproxy.io`, `allorigins.win`) time out or refuse the request. House therefore has two ways to load Sehrish and André.

**File, no proxy.** On a computer, open Google Calendar → Settings → the calendar → **Integrate calendar**. Use **Export** (or save the secret iCal link once, while the browser is allowed to download it) so you have a `.ics` file. On the tablet, open **House**, choose that file for Sehrish or André, or paste the file text and tap **Load pasted calendar**. Events stay in this browser. Repeat for the other person.

**Automatic link sync.** Deploy the free worker in `cloudflare/ics-proxy` (`npx wrangler login` then `npx wrangler deploy`). Paste `https://our-home-ics.<account>.workers.dev` into **Calendar proxy URL** on House. Then paste each secret iCal link and tap **Sync now**. The app calls that worker first (28s timeout) and skips hosts that already failed. `VITE_ICS_PROXY` can set the same URL at build time; the settings field overrides it and defaults to empty.

A timed-out fetch says to try the proxy or paste the `.ics` file. A browser block says the same. The last good copy stays on the tablet. Recurring events are expanded for about the next 45 days.

Meals, chores, the shopping list, and the kitchen timer are device-local as well. Nothing in this repo is a server.

## Weather

Current conditions and a five-day forecast come from [Open-Meteo](https://open-meteo.com/) for Seddiner See (52.28, 13.02), timezone `Europe/Berlin`, temperatures in Celsius. No API key.
