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

## Kiosk

The tablet opens on a lock screen. Tap anywhere to wake. After three minutes without a touch, it locks again. A running or finished kitchen timer keeps the screen awake and is still visible on the lock screen.

Android tablet:

1. Open the Pages URL in Chrome.
2. Install the app (Chrome menu → Install app / Add to Home screen), or open it in Fully Kiosk Browser.
3. Start URL: `https://siansari11.github.io/home-assistant/`
4. Turn on fullscreen, keep the screen awake, and hide the status and navigation bars.

Desktop Chrome, for a spare laptop on the counter:

```bash
google-chrome --kiosk https://siansari11.github.io/home-assistant/
```

## Calendar sync

Each person keeps their own secret iCal address. On the tablet, open **House** and paste the links. They are stored only in this browser.

Google Calendar:

1. Calendar → Settings and sharing → the calendar → **Integrate calendar**.
2. Copy **Secret address in iCal format**.
3. Paste it into Sehrish or André on the House screen.
4. Tap **Sync now**.

Apple Calendar and other apps can export an `https` or `webcal` link. `webcal://` is fetched as `https://`.

Browsers often block a direct calendar download (CORS). The app tries the link itself, then a public CORS proxy. The first successful copy is cached on the tablet, so the week still shows if the network drops later. Sync again from Calendar or House when you want a fresh copy. Recurring events with daily, weekly, monthly, and yearly rules are expanded for about the next 45 days.

Meals, chores, the shopping list, and the kitchen timer are device-local as well. Nothing in this repo is a server.

## Weather

Current conditions and a five-day forecast come from [Open-Meteo](https://open-meteo.com/) for Seddiner See (52.28, 13.02), timezone `Europe/Berlin`, temperatures in Celsius. No API key.
