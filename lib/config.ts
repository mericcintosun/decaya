// Every tunable of the measurement engine in one place.
// This file reads no secret and no environment variable: the engine runs in the
// visitor's browser and needs neither. ADAPTER_MODE is read only in lib/adapter.ts.
//
// The speech target band (0.3 to 0.5 s) lives in lib/acoustics.ts as SPEECH_TARGET
// and is not duplicated here.

/* ---------- Capture ---------- */

/** Length of the clap recording window in seconds. */
export const CAPTURE_SECONDS = 7;
/** Samples per message posted by the PCM capture worklet. */
export const WORKLET_CHUNK = 4096;
/** If the worklet has delivered no audio after this long, fall back to MediaRecorder. */
export const WORKLET_STARTUP_MS = 600;
/** How long to wait for the worklet's last partial chunk after the window closes. */
export const WORKLET_FLUSH_MS = 250;

/* ---------- Onset detection ---------- */

/** Envelope frame length in seconds (10 ms). */
export const FRAME_SEC = 0.01;
/** The noise floor is this percentile of the frame envelope (the quietest fifth). */
export const NOISE_PERCENTILE = 0.2;
/** A clap frame stands this many dB over the noise floor. */
export const ONSET_OVER_NOISE_DB = 25;
/** ...and rises this many dB over the frame before it. */
export const ONSET_RISE_DB = 6;
/** Claps closer than this overlap their tails, so later onsets inside the gap are ignored. */
export const ONSET_MIN_GAP_SEC = 0.9;
/** Shortest recording (in envelope frames) worth analyzing. */
export const MIN_ENVELOPE_FRAMES = 50;

/* ---------- Clap grading ---------- */

/** A peak at or above this absolute sample value counts as clipped. */
export const CLIP_LEVEL = 0.985;
/** Minimum clap peak over the noise floor for a valid clap, in dB. */
export const MIN_DYNAMIC_RANGE_DB = 30;
/** Three valid claps with at least this much range earn high confidence. */
export const HIGH_CONFIDENCE_DR_DB = 40;
/** Longest tail analyzed per clap, in seconds. */
export const CLAP_TAIL_SEC = 1.5;
/** A clap with less tail than this (end of recording or the next clap) is invalid. */
export const MIN_TAIL_SEC = 0.3;
/** The tail stops this long before the next clap's peak. */
export const NEXT_CLAP_GUARD_SEC = 0.05;
/** Band noise is measured in the window from this far before the peak... */
export const NOISE_WINDOW_START_SEC = 0.3;
/** ...up to this far before the peak. */
export const NOISE_WINDOW_END_SEC = 0.03;
/** Q of each of the two cascaded bandpass biquads that approximate an octave filter. */
export const OCTAVE_FILTER_Q = 1.414;
/** Spacing of the stored 1 kHz Schroeder curve points, in seconds. */
export const CURVE_STEP_SEC = 0.005;

/* ---------- Impulse synthesis and the dry voice ---------- */

/** Reverberant to direct energy ratio per second of mid-band decay. */
export const IMPULSE_REVERB_RATIO = 2.2;
/** Q of the per-band bandpass in the synthetic impulse. */
export const IMPULSE_BAND_Q = 1.1;
/** Seed of the per-band noise. Both sides of the A/B use the same seed. */
export const IMPULSE_SEED = 9001;
/** Longest synthetic impulse, in seconds. */
export const IMPULSE_MAX_SEC = 4;
/** Peak level of the synthesized dry voice. */
export const OUTPUT_PEAK = 0.8;

/** Where the builder drops a CC0 anechoic speech clip. Missing file means the formant synth. */
export const DRY_CLIP_URL = "/audio/dry-speech.wav";
/** Per-attempt timeout for fetching the dry clip. */
export const FETCH_TIMEOUT_MS = 4000;
/** Retries after the first attempt (so two attempts in total). */
export const FETCH_RETRIES = 1;

/* ---------- Fake engine and logging ---------- */

/** Fixed delay before the fake engine returns its stored measurement. */
export const FAKE_CAPTURE_DELAY_MS = 900;
/** Prefix of every core-path log line. Logs never print samples or buffers. */
export const LOG_PREFIX = "[core]";
