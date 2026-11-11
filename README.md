# Cajón Groove Lab 🥁

## v5 testing export

The Settings page now has **Export debug log** and **Clear debug log**. Recording
begins automatically, retains up to 2,500 events locally for 24 hours, and
survives refreshes. Export downloads a JSON file suitable for sharing with a
developer. It contains event timestamps, attack energies and thresholds,
onset candidates, classification decisions, scoring offsets, metronome
scheduling, settings, and aggregated calibration quality. No raw audio,
calibration feature vectors, account details or full user agent are exported.

Use `node test-debug.cjs` to test diagnostic persistence and privacy filtering.

## v4 updates

- Early provisional hit indicators, followed by bass/slap confirmation after feature extraction.
- Onset re-arming and resonance filtering to reduce double hits without blocking quick successive strokes.
- Recognition filtering for weak or unfamiliar sounds; manually teach background noises in microphone diagnostics.
- Live microphone-energy chart, accepted/rejected onset log, processing lag, and manual missed-hit counter.
- Device-local timing compensation slider (-150 to +150 ms). Begin at 0 and adjust only after checking a consistent offset.
- Audio-clock scheduled metronome and scoring grace period to accommodate delayed feature extraction.

Offline synthetic detector test: `node test-detector.cjs`. Verify microphone and real playing on a phone before relying on scores.

A mobile-friendly cajón practice game that listens through your microphone. Play bass and slap patterns at a chosen tempo, create your own exercises, track timing, and calibrate the sound recognition to your instrument.

## Features

- Guided practice for 3/4 and 4/4 rhythms, including eighth-note patterns
- Pattern editor and adjustable BPM
- Low-latency AudioWorklet hit detection, score and streak
- Free-play tempo coach
- On-device 15+15 sample bass/slap calibration using a tiny k-nearest-neighbors model
- Live confidence meter and correction buttons that teach the model from mistakes
- Installable PWA with basic offline app-shell support

## Run it

The app is static HTML, CSS, and JavaScript — no build tools or backend. Open the published GitHub Pages URL over HTTPS, allow microphone access, and calibrate your cajón under **Settings**.

For local development, serve the directory over `http://localhost` (a secure browser context for microphone access). Opening `index.html` directly as a file is not sufficient for the microphone or service worker.

## Privacy

Microphone samples are processed on-device. The trained model stores compact acoustic feature vectors, not raw recordings. Calibration statistics, corrections and settings are saved in your browser's local storage; the app does not upload recordings or personal practice data. Browser microphone permission is required.

## GitHub Pages

Publish from the `main` branch, root (`/`). All assets use relative paths so the app works under `/cajon-groove-lab/`.
