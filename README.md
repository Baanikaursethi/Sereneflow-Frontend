# Serene Flow — Expo + TypeScript

This is the Expo/React Native (TSX) port of the original Serene Flow React web app.
The goal of this port was to preserve the UI, navigation, styling intent, animations,
and logic exactly, changing only what's required for Expo/React Native compatibility.

## Running

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go (SDK 51), or run `npx expo run:android` / `npx expo run:ios`
for a full native build.

This project was verified in this environment with:
- `npx tsc --noEmit` — clean, no type errors
- `npx expo export --platform android` — full Metro/Hermes bundle succeeds (706 modules)

There was no way to launch an actual device/simulator in the sandbox this was built in,
so please do a run-through on a real device/simulator before shipping, especially the
sound engine and image picker (both touch native APIs that can't be exercised by a
bundler-only export).

## What changed vs. the original, and why

Everything below is a *platform-compatibility* change, not a design change. The original
CSS/DOM/web-only APIs don't exist on native RN, so each had to be re-expressed with the
closest RN equivalent while preserving the same visual outcome and same behavior:

| Original (web) | Here (Expo/RN) | Why |
|---|---|---|
| `localStorage` | `AsyncStorage`, wrapped in `src/lib/store.ts` with the exact same `get/set/remove` API, hydrated once at launch | No `localStorage` on native |
| Web Audio API (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, ...) | `src/lib/soundSynth.ts` renders the *same* synthesis graphs (same frequencies, envelopes, pink-noise coefficients, delay/feedback amounts, filter types) offline into a seamless WAV loop, played via `expo-av` in `src/lib/soundEngine.ts` | No Web Audio API on native. All 5 sounds (Ripple, Moonflow, Aurora Drift, Forest Rain, Inner Glow) are still synthesized from the original math, not replaced with external audio files. |
| CSS (`<style>{CSS}</style>`, class names) | `StyleSheet.create()` per screen/component, values taken 1:1 from the original CSS custom properties/colors | RN has no CSS engine |
| `<input type="file">` for avatar | `expo-image-picker` | No file input on native |
| `window.history.pushState`/`popstate` | Same in-memory nav state machine (`screen`/`navTab`/`subPage`/`pauseModeId`/`prevScreen`), Android hardware back wired via `BackHandler` | No browser history API on native; kept the *same* custom state-based navigation model, per explicit instruction not to introduce React Navigation |
| Emoji-based Pause & Breathe visuals | Custom SVG bubble components (`src/components/BreathVisuals.tsx`) — one large orb + three smaller companion bubbles, used both on the Home preview card and the breathing session screen | Per explicit design requirement; emoji rendering is platform-dependent, so this was replaced with a consistent custom visual matching the reference image |
| Auto-starting breathing exercise on mode select | Requires pressing **Begin** after reviewing the mode's description/pattern/purpose tags | Per explicit product requirement |
| Reaction count text at `opacity:0.8` over a dim `rgba(207,167,255,0.55)` | Solid, higher-contrast color (`#F0E4FF`) with medium weight for just the numeric count | Contrast/legibility fix requested; reaction functionality (toggle add/remove, per-post storage) is unchanged |
| Google Fonts `@import` in CSS | `@expo-google-fonts/cormorant-garamond` and `@expo-google-fonts/jost` loaded via `expo-font`/`useFonts` | No CSS `@import`; same two typefaces (Cormorant Garamond, Jost) used throughout |
| App icon | `assets/icon.png`, generated from the uploaded image (center-cropped to square, 1024×1024) and wired into `app.json` for iOS/Android/adaptive icon/web favicon | Required Expo app icon format |

## Preserved as-is (logic ported verbatim)

- Spaces moderation regex patterns and messages (`src/lib/moderation.ts`)
- Mind Drops content, mood definitions, breathing mode timings/patterns, sound catalog (`src/data/content.ts`)
- CEO account gating, admin dashboard aggregate stats, Spaces post ownership/removal rules
- Journal create/edit/delete, title-from-first-line behavior
- Mood check-in flow, mood → sound/breathing recommendations
- Remember-me auto-login, login/signup/forgot-password validation messages

## Known caveats / things to verify on-device

1. **Audio**: the sound engine renders WAV loops in JS on first play of each sound
   (cached after that). This is CPU work done once per sound per app session — on very
   low-end devices the first tap on a sound card may have a brief delay before playback
   starts. All 5 sounds loop via `expo-av`'s native looping, matching the original's
   continuous ambient playback.
2. **expo-av deprecation**: `expo-av` is in Expo's deprecation path in favor of
   `expo-audio`/`expo-video` in future SDKs, but it's the correct, best-supported choice
   for SDK 51 and needs no additional native config.
3. **Fonts**: Cormorant Garamond and Jost are loaded from Google Fonts packages instead
   of a CSS `@import`; if you want to bundle local font files instead (for offline builds
   without the Google Fonts package), swap the `useFonts` call in `src/App.tsx`.
