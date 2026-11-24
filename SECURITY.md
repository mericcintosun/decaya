# SECURITY: Decaya

Decaya is a Next.js 15 web app. The measurement, the prediction and the audio preview all run in the visitor's browser tab. This file says plainly which security fronts do not apply, and what the code does with the one sensitive input it has: the microphone.

## 1. Contracts and chain

None. Decaya has no on-chain component: no `contracts/` directory, no smart contract, no chain RPC, no token.

## 2. Wallet permissions

None are ever requested. The app never asks for a wallet connection, an account, a signature or a network switch. A search of `app/`, `components/` and `lib/` for `eth_requestAccounts`, `eth_sign`, `personal_sign`, `wallet_`, `ethereum` and `window.ethereum` finds nothing; the only `connect(` hits are Web Audio node connections.

## 3. Approvals

None. There are no token approvals and no spenders, because there are no tokens and no wallet.

## 4. Source

Repository: https://github.com/mericcintosun/decaya

Live app: https://decaya.vercel.app

## Data handling

- **Microphone audio stays in the tab.** `getUserMedia` audio is copied into memory by `public/worklets/pcm-capture.js` (or a MediaRecorder fallback) and analyzed in the browser by `lib/acoustics.ts`. It is never uploaded. The only `fetch(` in `app/`, `components/` and `lib/` is the same-origin request for the optional dry speech clip at `/audio/dry-speech.wav` (`lib/acoustics.ts`). There is no `navigator.sendBeacon`, no WebSocket and no request to a third party.
- **Rooms live in your browser.** Rooms you measure are saved in localStorage under `decaya.rooms.v1` through `lib/store.ts`, the only file that touches localStorage. They never reach the server. "Clear rooms measured here" on the home page removes them.
- **The server serves only the example fieldbook.** The JSON routes under `app/api/` return the seeded example rooms and furnishings and accept no writes.
- **No secrets, no tracking.** The app needs no API key and no secret. The only environment values are `ADAPTER_MODE` (read on the server in `lib/adapter.ts`) and `NEXT_PUBLIC_BRAND_FILES` (a public list of image names set at build time by `next.config.ts`). There are no analytics, no third-party scripts and no cookies set by the app.
- **Forms post nowhere.** The measuring form in `components/new-room-form.tsx` has no `action`; it validates with zod and writes to localStorage only.

## Reporting a problem

Open an issue on the repository above. Please do not include recordings of your room in the issue; the app never needs them.
