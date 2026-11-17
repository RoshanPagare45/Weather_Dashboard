# Weather Dashboard

A React + Vite weather dashboard. Shows weather for your current location by default and lets you search by city, Indian pincode, or coordinates (`lat, lon`).

## Run

```bash
npm install
npm run dev      # development
npm run build    # production build
npm run lint     # oxlint
```

Geolocation only works on `https://` or `http://localhost`, and needs location permission allowed in the browser.

## Data sources (all free, no API keys)

| Purpose | Service |
| --- | --- |
| Forecast, history, city search | [Open-Meteo](https://open-meteo.com) |
| Reverse geocoding / area lookup | [Nominatim (OpenStreetMap)](https://nominatim.org) |
| Indian pincode → post offices | [postalpincode.in](https://api.postalpincode.in) |
| Approximate location fallback (by IP) | [ipapi.co](https://ipapi.co) |
| Map | OpenStreetMap embed |

## Privacy

Your coordinates are sent to Nominatim (to name your area) and Open-Meteo (for the forecast). If the browser can't determine your location, your IP address is sent to ipapi.co for an approximate, city-level position. Nothing is stored on a server.

## How current location works

The browser's geolocation lookup and the IP lookup run in parallel; whichever answers first is used, and the precise browser position replaces the IP estimate if it arrives later. Weather and the place name are fetched in parallel, and the name lookup is capped at 3 seconds.

## Reliability

- 10 s timeout on every request, one automatic retry on network/5xx errors
- 10-minute in-memory response cache; place names cached per ~100 m
- "Try again" button, automatic retry when the connection returns
- Error boundary so a rendering crash never leaves a blank page

## Features

- °C / °F toggle, saved places (★) and recent places, manual refresh, auto-refresh every 15 minutes while the tab is visible (preferences are kept in `localStorage`)
- Installable as an app (PWA): the app shell opens offline; weather data is always fetched live
- Two IP-lookup services (`ipapi.co`, `ipwho.is`) race as the location fallback

## Project layout

```
src/
  App.jsx                    state + layout
  styles/                    CSS split by area (base, search, status, weather-card, rain, pincode, map, welcome, responsive, toolbar)
  components/                WeatherCard, WeatherSearch, Toolbar, ErrorBoundary, ...
  hooks/                     useStoredState, useCurrentLocation
  utils/units.js             °C -> °F conversion
  services/
    weatherApi.js            public facade (re-exports)
    http.js                  timeout, retry, cache
    forecast.js              Open-Meteo forecast + history
    geocoding.js             city search, reverse geocoding, by-coordinates
    pincode.js               Indian pincode / post-office lookup
    location.js             browser geolocation + IP fallback
```

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm test` · `npm run format` · `npm run check` (lint + test + build)
