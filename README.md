# Cajón Groove Lab 🥁

A mobile-friendly cajón practice game that listens through your microphone. Play bass and slap patterns at a chosen tempo, create your own exercises, track timing, and calibrate the sound recognition to your instrument.

## Features

- Guided practice for 3/4 and 4/4 rhythms, including eighth-note patterns
- Pattern editor and adjustable BPM
- Real-time microphone hit detection, score and streak
- Free-play tempo coach
- Five-sample bass and slap calibration
- Installable PWA with basic offline app-shell support

## Run it

The app is static HTML, CSS, and JavaScript — no build tools or backend. Open the published GitHub Pages URL over HTTPS, allow microphone access, and calibrate your cajón under **Settings**.

For local development, serve the directory over `http://localhost` (a secure browser context for microphone access). Opening `index.html` directly as a file is not sufficient for the microphone or service worker.

## Privacy

Microphone samples are processed on-device. Calibration statistics and settings are saved in your browser's local storage; the app does not upload recordings or personal practice data. Browser microphone permission is required.

## GitHub Pages

Publish from the `main` branch, root (`/`). All assets use relative paths so the app works under `/cajon-groove-lab/`.
