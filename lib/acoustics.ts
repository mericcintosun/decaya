// Decaya's acoustics core. Everything here runs in the visitor's browser:
// Sabine prediction, Schroeder backward integration with a T20 fit, clap capture,
// and the synthetic impulse responses used for the before/after preview.
// Browser globals (AudioContext, fetch, navigator) are touched only inside functions, so
// the pure helpers (predictRt60, schroederDb, t20, verdictFor) load under plain Node.
import {
  CAPTURE_SECONDS,
  CLAP_TAIL_SEC,
  CLIP_LEVEL,
  CURVE_STEP_SEC,
  DRY_CLIP_URL,
  FETCH_RETRIES,
  FETCH_TIMEOUT_MS,
  FRAME_SEC,
  HIGH_CONFIDENCE_DR_DB,
  IMPULSE_BAND_Q,
  IMPULSE_MAX_SEC,
  IMPULSE_REVERB_RATIO,
  IMPULSE_SEED,
  LOG_PREFIX,
  MIN_DYNAMIC_RANGE_DB,
  MIN_ENVELOPE_FRAMES,
  MIN_TAIL_SEC,
  NEXT_CLAP_GUARD_SEC,
  NOISE_PERCENTILE,
  NOISE_WINDOW_END_SEC,
  NOISE_WINDOW_START_SEC,
  OCTAVE_FILTER_Q,
  ONSET_MIN_GAP_SEC,
  ONSET_OVER_NOISE_DB,
  ONSET_RISE_DB,
  OUTPUT_PEAK,
  WORKLET_CHUNK,
  WORKLET_FLUSH_MS,
  WORKLET_STARTUP_MS,
} from "./config";
import { CoreFailure } from "./errors";

export const BANDS = [250, 500, 1000, 2000, 4000] as const;
export const BAND_LABELS = ["250 Hz", "500 Hz", "1 kHz", "2 kHz", "4 kHz"] as const;
export type BandValues = [number, number, number, number, number];

/** Decay time range where spoken voice stays clear in a small room. */
export const SPEECH_TARGET = { min: 0.3, max: 0.5 } as const;

export interface RoomDims {
  length: number;
  width: number;
  height: number;
}

export interface Furnishing {
  id: string;
  name: string;
  detail: string;
  /** Exposed absorbing area in square meters. */
  areaM2: number;
  /** True when the item covers an existing wall or floor (its area stops reflecting). */
  covers: boolean;
  /** Absorption coefficient per band, 250 Hz to 4 kHz. */
  alpha: BandValues;
  costUsd: number;
  source: string;
}

const SABINE = 0.161;

export const volumeOf = (d: RoomDims) => d.length * d.width * d.height;
export const surfaceOf = (d: RoomDims) => 2 * (d.length * d.width + d.length * d.height + d.width * d.height);

/** The number people quote: the average of the 500 Hz and 1 kHz bands. */
export function midRt60(b: BandValues): number {
  return (b[1] + b[2]) / 2;
}

export type Verdict = "too-live" | "a-bit-live" | "speech-ready" | "over-damped";

export const VERDICT_LABEL: Record<Verdict, string> = {
  "too-live": "Too live",
  "a-bit-live": "A bit live",
  "speech-ready": "Speech-ready",
  "over-damped": "Over-damped",
};

export function verdictFor(rt: number): Verdict {
  if (rt > 0.6) return "too-live";
  if (rt > SPEECH_TARGET.max) return "a-bit-live";
  if (rt >= SPEECH_TARGET.min) return "speech-ready";
  return "over-damped";
}

/**
 * Inverse Sabine: recover the room's existing absorption from the measured decay,
 * add what the chosen items bring, and solve forward again for the new decay time.
 */
export function predictRt60(measured: BandValues, dims: RoomDims, items: Furnishing[]): BandValues {
  const v = volumeOf(dims);
  const s = surfaceOf(dims);
  return measured.map((rt, i) => {
    const existing = (SABINE * v) / Math.max(rt, 0.05);
    const avgAlpha = Math.min(existing / s, 0.95);
    let added = 0;
    for (const it of items) {
      const alpha = it.alpha[i];
      added += it.areaM2 * (it.covers ? Math.max(alpha - avgAlpha, 0) : alpha);
    }
    return (SABINE * v) / (existing + added);
  }) as BandValues;
}

export interface FixPlan {
  items: Furnishing[];
  predicted: BandValues;
  costUsd: number;
  reachesTarget: boolean;
}

/** Cheapest set of items that lands the mid-band decay in the speech range (or gets closest). */
export function bestFix(measured: BandValues, dims: RoomDims, catalog: Furnishing[]): FixPlan {
  let best: { score: number; plan: FixPlan } | null = null;
  for (let mask = 0; mask < 1 << catalog.length; mask++) {
    const items = catalog.filter((_, i) => mask & (1 << i));
    const predicted = predictRt60(measured, dims, items);
    const mid = midRt60(predicted);
    const costUsd = items.reduce((sum, it) => sum + it.costUsd, 0);
    const reachesTarget = mid >= SPEECH_TARGET.min && mid <= SPEECH_TARGET.max;
    const score = reachesTarget
      ? costUsd * 10 + items.length
      : 1e6 + Math.abs(mid - 0.4) * 1000 + costUsd * 0.01 + items.length * 0.001;
    if (!best || score < best.score) best = { score, plan: { items, predicted, costUsd, reachesTarget } };
  }
  return best!.plan;
}

export function joinNames(items: Furnishing[]): string {
  if (items.length === 0) return "nothing added";
  return items.map((i) => i.name.toLowerCase()).join(" + ");
}

/* ---------------- Measurement: Schroeder integration and T20 ---------------- */

/** Backward-integrated energy decay in dB, normalized to 0 dB at the start. */
export function schroederDb(energy: Float32Array): Float32Array {
  const out = new Float32Array(energy.length);
  let acc = 0;
  for (let i = energy.length - 1; i >= 0; i--) {
    acc += energy[i];
    out[i] = acc;
  }
  const total = out[0] || 1e-12;
  for (let i = 0; i < out.length; i++) out[i] = 10 * Math.log10(out[i] / total + 1e-12);
  return out;
}

/** Linear fit between -5 and -25 dB, extrapolated to a 60 dB decay. */
export function t20(curveDb: Float32Array, sampleRate: number): number | null {
  let i5 = -1;
  let i25 = -1;
  for (let i = 0; i < curveDb.length; i++) {
    const c = curveDb[i];
    if (i5 < 0 && c <= -5) i5 = i;
    if (c <= -25) {
      i25 = i;
      break;
    }
  }
  if (i5 < 0 || i25 <= i5 + 8) return null;
  const step = Math.max(1, Math.floor((i25 - i5) / 400));
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = i5; i <= i25; i += step) {
    const x = i / sampleRate;
    const y = curveDb[i];
    n++; sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  if (!(slope < 0)) return null;
  const rt = -60 / slope;
  return rt > 0.05 && rt < 6 ? rt : null;
}

async function bandFilter(samples: Float32Array, sampleRate: number, freq: number): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, samples.length, sampleRate);
  const buf = ctx.createBuffer(1, samples.length, sampleRate);
  buf.getChannelData(0).set(samples);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  // Two cascaded bandpass biquads approximate an octave filter.
  const a = ctx.createBiquadFilter();
  a.type = "bandpass"; a.frequency.value = freq; a.Q.value = OCTAVE_FILTER_Q;
  const b = ctx.createBiquadFilter();
  b.type = "bandpass"; b.frequency.value = freq; b.Q.value = OCTAVE_FILTER_Q;
  src.connect(a).connect(b).connect(ctx.destination);
  src.start();
  const out = await ctx.startRendering();
  return out.getChannelData(0).slice();
}

function frameEnvelopeDb(x: Float32Array, frame: number): number[] {
  const env: number[] = [];
  for (let start = 0; start + frame <= x.length; start += frame) {
    let sum = 0;
    for (let i = start; i < start + frame; i++) sum += x[i] * x[i];
    env.push(10 * Math.log10(sum / frame + 1e-12));
  }
  return env;
}

function meanSquare(x: Float32Array, from: number, to: number): number {
  const a = Math.max(0, from);
  const b = Math.min(x.length, to);
  if (b - a < 32) return 0;
  let sum = 0;
  for (let i = a; i < b; i++) sum += x[i] * x[i];
  return sum / (b - a);
}

export interface ClapReport {
  index: number;
  valid: boolean;
  clipped: boolean;
  dynamicRangeDb: number;
  bands: (number | null)[];
  reason: string | null;
}

export interface Measurement {
  bands: BandValues;
  claps: ClapReport[];
  validCount: number;
  dynamicRangeDb: number;
  /** 1 kHz Schroeder curve of the first usable clap, in dB, one point per curveStepSec. */
  curveDb: number[];
  curveStepSec: number;
  confidence: "high" | "medium" | "low";
  processingWarning: boolean;
  /** How the audio was captured: raw PCM, the compressed fallback, or a stored fixture. */
  capturePath?: "worklet" | "mediarecorder" | "fixture";
}

/** Find claps, split into octave bands, integrate, fit, and grade the result. */
export async function analyzeRecording(samples: Float32Array, sampleRate: number, processingWarning = false): Promise<Measurement> {
  const frame = Math.max(1, Math.round(sampleRate * FRAME_SEC));
  const env = frameEnvelopeDb(samples, frame);
  if (env.length < MIN_ENVELOPE_FRAMES) throw new CoreFailure("no_clap", "The recording was too short to analyze.");
  const sorted = [...env].sort((a, b) => a - b);
  const noiseDb = sorted[Math.floor(sorted.length * NOISE_PERCENTILE)];

  const onsetFrames: number[] = [];
  const minGap = Math.round(ONSET_MIN_GAP_SEC / FRAME_SEC); // in envelope frames
  for (let i = 1; i < env.length; i++) {
    const last = onsetFrames[onsetFrames.length - 1];
    if (
      env[i] - noiseDb > ONSET_OVER_NOISE_DB &&
      env[i] - env[i - 1] > ONSET_RISE_DB &&
      (last === undefined || i - last >= minGap)
    ) {
      onsetFrames.push(i);
    }
  }
  if (onsetFrames.length === 0) throw new CoreFailure("no_clap");

  const onsets = onsetFrames.map((f) => {
    let peakIdx = f * frame;
    let peak = 0;
    for (let i = Math.max(0, (f - 1) * frame); i < Math.min(samples.length, (f + 2) * frame); i++) {
      const v = Math.abs(samples[i]);
      if (v > peak) { peak = v; peakIdx = i; }
    }
    return { peakIdx, peak };
  });

  const banded = await Promise.all(BANDS.map((f) => bandFilter(samples, sampleRate, f)));

  const curveStepSec = CURVE_STEP_SEC;
  const curveStep = Math.max(1, Math.round(curveStepSec * sampleRate));
  const tailMax = Math.round(CLAP_TAIL_SEC * sampleRate);
  const minTail = Math.round(MIN_TAIL_SEC * sampleRate);
  const guard = Math.round(NEXT_CLAP_GUARD_SEC * sampleRate);
  const noiseFrom = Math.round(NOISE_WINDOW_START_SEC * sampleRate);
  const noiseTo = Math.round(NOISE_WINDOW_END_SEC * sampleRate);

  // 1 kHz Schroeder curve per clap; the first valid clap's curve is the one we keep.
  const curves: number[][] = [];
  const claps: ClapReport[] = onsets.map((o, idx) => {
    const next = onsets[idx + 1];
    const limit = next ? next.peakIdx - guard : samples.length;
    const end = Math.max(o.peakIdx, Math.min(o.peakIdx + tailMax, limit));
    const shortTail = end - o.peakIdx < minTail;
    const clipped = o.peak >= CLIP_LEVEL;
    const dynamicRangeDb = 20 * Math.log10(o.peak + 1e-12) - noiseDb;
    // A clap near the start of the recording has a short (or empty) noise window: clamp at 0.
    const noiseStart = Math.max(0, o.peakIdx - noiseFrom);
    const noiseEnd = Math.max(0, o.peakIdx - noiseTo);
    let curve1k: number[] = [];
    const bands = banded.map((band, b) => {
      if (shortTail) return null;
      // Subtract the band's noise power before integrating so the floor does not flatten the fit.
      const noisePow = meanSquare(band, noiseStart, noiseEnd);
      const energy = new Float32Array(end - o.peakIdx);
      for (let i = 0; i < energy.length; i++) {
        const v = band[o.peakIdx + i];
        energy[i] = Math.max(v * v - noisePow, 0);
      }
      const curve = schroederDb(energy);
      if (b === 2) {
        const pts: number[] = [];
        for (let i = 0; i < curve.length; i += curveStep) pts.push(curve[i]);
        curve1k = pts;
      }
      return t20(curve, sampleRate);
    });
    curves.push(curve1k);
    let reason: string | null = null;
    if (clipped) reason = "Clipped: the clap overloaded the microphone.";
    else if (shortTail) reason = "Not enough tail after this clap.";
    else if (dynamicRangeDb < MIN_DYNAMIC_RANGE_DB)
      reason = `Only ${Math.round(dynamicRangeDb)} dB above the noise, ${MIN_DYNAMIC_RANGE_DB} dB needed.`;
    else if (bands[1] === null || bands[2] === null) reason = "The mid bands did not decay cleanly.";
    return { index: idx + 1, valid: reason === null, clipped, dynamicRangeDb, bands, reason };
  });

  let curveIdx = claps.findIndex((c) => c.valid);
  if (curveIdx < 0) curveIdx = claps.findIndex((c, i) => !c.clipped && curves[i].length > 0);
  const curveDb = curveIdx >= 0 ? curves[curveIdx] : [];

  const usable = claps.filter((c) => c.valid);
  const pool = usable.length > 0 ? usable : claps;
  const avg = BANDS.map((_, b) => {
    const vals = pool.map((c) => c.bands[b]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  });
  if (avg[1] === null || avg[2] === null) throw new CoreFailure("fit_failed");
  const midFallback = (avg[1] + avg[2]) / 2;
  const bands = avg.map((v) => v ?? midFallback) as BandValues;
  const dr = Math.min(...pool.map((c) => c.dynamicRangeDb));
  const validCount = usable.length;
  const confidence = validCount >= 3 && dr >= HIGH_CONFIDENCE_DR_DB ? "high" : validCount >= 2 ? "medium" : "low";
  return { bands, claps, validCount, dynamicRangeDb: dr, curveDb, curveStepSec, confidence, processingWarning };
}

export interface Recording {
  samples: Float32Array;
  sampleRate: number;
  processingWarning: boolean;
  /** "worklet" = raw PCM from an AudioWorklet; "mediarecorder" = compressed fallback. */
  path: "worklet" | "mediarecorder";
}

function abortError(): DOMException {
  return new DOMException("The capture was cancelled.", "AbortError");
}

/** Resolves after ms, or rejects with an AbortError as soon as the signal fires. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function concat(chunks: Float32Array[], total: number): Float32Array {
  const out = new Float32Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/**
 * Raw PCM path: public/worklets/pcm-capture.js copies input channel 0 to this thread in
 * chunks. Throws (so the caller can fall back) when worklets are missing or deliver nothing.
 */
async function captureWithWorklet(
  ctx: AudioContext,
  source: MediaStreamAudioSourceNode,
  seconds: number,
  signal?: AbortSignal,
): Promise<Float32Array> {
  if (!ctx.audioWorklet || typeof AudioWorkletNode === "undefined") throw new Error("AudioWorklet is not available");
  await ctx.audioWorklet.addModule("/worklets/pcm-capture.js");
  const node = new AudioWorkletNode(ctx, "pcm-capture", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    channelCount: 1,
    channelCountMode: "explicit",
    processorOptions: { chunk: WORKLET_CHUNK },
  });
  const chunks: Float32Array[] = [];
  let total = 0;
  let onFinal: () => void = () => {};
  const final = new Promise<void>((resolve) => {
    onFinal = resolve;
  });
  node.port.onmessage = (e: MessageEvent<{ samples?: Float32Array; final?: boolean }>) => {
    if (e.data.samples) {
      chunks.push(e.data.samples);
      total += e.data.samples.length;
    }
    if (e.data.final) onFinal();
  };
  // Some browsers only run a node that reaches the destination; a muted gain keeps it silent.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(node);
  node.connect(mute).connect(ctx.destination);
  try {
    await wait(WORKLET_STARTUP_MS, signal);
    if (total === 0) throw new Error("The AudioWorklet delivered no audio");
    await wait(Math.max(0, seconds * 1000 - WORKLET_STARTUP_MS), signal);
    node.port.postMessage("flush");
    await Promise.race([final, wait(WORKLET_FLUSH_MS)]);
  } finally {
    node.port.onmessage = null;
    source.disconnect(node);
    node.disconnect();
    mute.disconnect();
  }
  return concat(chunks, total);
}

/** Compressed fallback for browsers without AudioWorklet. Tails may be smeared by the codec. */
async function captureWithMediaRecorder(
  ctx: AudioContext,
  stream: MediaStream,
  seconds: number,
  signal?: AbortSignal,
): Promise<{ samples: Float32Array; sampleRate: number }> {
  if (typeof MediaRecorder === "undefined") {
    throw new CoreFailure("mic_unavailable", "This browser can neither stream raw audio nor record it.");
  }
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start();
  try {
    await wait(seconds * 1000, signal);
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
  }
  await stopped;
  const blob = new Blob(chunks, { type: recorder.mimeType });
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  return { samples: decoded.getChannelData(0).slice(), sampleRate: decoded.sampleRate };
}

/**
 * Records the microphone for a fixed window with browser voice processing switched off.
 * Tries raw PCM through an AudioWorklet first and falls back to MediaRecorder (with
 * processingWarning forced on). The stream tracks are stopped and the context closed on
 * every exit path: success, error and abort (the caller aborts on unmount).
 */
export async function recordClaps(
  seconds: number = CAPTURE_SECONDS,
  onLevel?: (peak: number) => void,
  signal?: AbortSignal,
): Promise<Recording> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new CoreFailure("mic_unavailable");
  }
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let raf = 0;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    if (signal?.aborted) throw abortError();
    const settings = stream.getAudioTracks()[0]?.getSettings();
    const voiceProcessing = Boolean(settings?.echoCancellation || settings?.noiseSuppression || settings?.autoGainControl);

    ctx = new AudioContext();
    await ctx.resume().catch(() => undefined);
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const frameBuf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(frameBuf);
      let p = 0;
      for (let i = 0; i < frameBuf.length; i++) p = Math.max(p, Math.abs(frameBuf[i]));
      onLevel?.(p);
      raf = requestAnimationFrame(tick);
    };
    tick();

    try {
      const samples = await captureWithWorklet(ctx, source, seconds, signal);
      return { samples, sampleRate: ctx.sampleRate, processingWarning: voiceProcessing, path: "worklet" };
    } catch (e) {
      if (signal?.aborted || (e instanceof DOMException && e.name === "AbortError")) throw e;
      console.warn(`${LOG_PREFIX} raw PCM capture unavailable, falling back to MediaRecorder`);
    }
    const rec = await captureWithMediaRecorder(ctx, stream, seconds, signal);
    return { ...rec, processingWarning: true, path: "mediarecorder" };
  } finally {
    cancelAnimationFrame(raf);
    onLevel?.(0);
    stream?.getTracks().forEach((t) => t.stop());
    if (ctx && ctx.state !== "closed") await ctx.close().catch(() => undefined);
  }
}

/* ---------------- Preview: synthetic impulse responses and a dry voice ---------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Band-filtered, exponentially decaying noise, one band per octave, summed.
 * Both sides of the A/B use the same seeded noise so they differ only in decay time.
 */
export async function synthesizeImpulse(bands: BandValues, sampleRate: number, seed: number = IMPULSE_SEED): Promise<AudioBuffer> {
  const longest = Math.max(...bands);
  const length = Math.ceil(sampleRate * Math.min(longest * 1.1 + 0.15, IMPULSE_MAX_SEC));
  const ctx = new OfflineAudioContext(1, length, sampleRate);
  bands.forEach((rt, i) => {
    const noise = ctx.createBuffer(1, length, sampleRate);
    const d = noise.getChannelData(0);
    const rand = mulberry32(seed + i * 31);
    const k = -3 / (sampleRate * Math.max(rt, 0.05)); // amplitude falls 60 dB over rt seconds
    for (let n = 0; n < length; n++) d[n] = (rand() * 2 - 1) * Math.pow(10, k * n);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = BANDS[i];
    f.Q.value = IMPULSE_BAND_Q;
    src.connect(f).connect(ctx.destination);
    src.start();
  });
  const ir = await ctx.startRendering();
  const d = ir.getChannelData(0);
  let tail = 0;
  for (let n = 0; n < d.length; n++) tail += d[n] * d[n];
  // Reverberant energy is proportional to 1/A, so it grows with the decay time.
  const ratio = IMPULSE_REVERB_RATIO * midRt60(bands);
  const scale = Math.sqrt(ratio / Math.max(tail, 1e-9));
  const level = 1 / Math.sqrt(1 + ratio); // loudness match between A and B
  for (let n = 0; n < d.length; n++) d[n] *= scale * level;
  d[0] += level; // direct sound
  return ir;
}

const VOWELS: Record<string, [number, number, number]> = {
  a: [800, 1200, 2500],
  e: [500, 1900, 2500],
  i: [300, 2300, 3000],
  o: [500, 900, 2400],
  u: [320, 800, 2300],
};

const PHRASE: { v: keyof typeof VOWELS; at: number; dur: number; f0: number; hiss?: boolean }[] = [
  { v: "i", at: 0.08, dur: 0.16, f0: 140, hiss: true },
  { v: "i", at: 0.36, dur: 0.14, f0: 136 },
  { v: "a", at: 0.58, dur: 0.22, f0: 150 },
  { v: "u", at: 0.86, dur: 0.26, f0: 128 },
  { v: "e", at: 1.34, dur: 0.14, f0: 138 },
  { v: "o", at: 1.52, dur: 0.24, f0: 132 },
  { v: "e", at: 1.84, dur: 0.12, f0: 124 },
  { v: "i", at: 2.02, dur: 0.2, f0: 116, hiss: true },
];

/** A dry formant-synth phrase with no room in it, eight syllables over 2.4 s. */
async function synthesizeVoice(sampleRate: number): Promise<AudioBuffer> {
  const length = Math.ceil(sampleRate * 2.7);
  const ctx = new OfflineAudioContext(1, length, sampleRate);
  const rand = mulberry32(77);
  for (const s of PHRASE) {
    const n = Math.ceil(s.dur * sampleRate);
    const buf = ctx.createBuffer(1, n, sampleRate);
    const d = buf.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f0 = s.f0 * (1 - 0.12 * (t / s.dur));
      phase = (phase + f0 / sampleRate) % 1;
      const env = Math.min(1, t / 0.015) * Math.min(1, (s.dur - t) / 0.04);
      d[i] = (2 * phase - 1) * env;
    }
    for (const [j, freq] of VOWELS[s.v].entries()) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 8;
      const g = ctx.createGain();
      g.gain.value = [1, 0.5, 0.25][j];
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(s.at);
    }
    if (s.hiss) {
      const hn = Math.ceil(0.09 * sampleRate);
      const hb = ctx.createBuffer(1, hn, sampleRate);
      const hd = hb.getChannelData(0);
      for (let i = 0; i < hn; i++) hd[i] = (rand() * 2 - 1) * 0.25 * Math.sin((Math.PI * i) / hn);
      const src = ctx.createBufferSource();
      src.buffer = hb;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 4500;
      src.connect(hp).connect(ctx.destination);
      src.start(s.at + s.dur);
    }
  }
  const out = await ctx.startRendering();
  const d = out.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  for (let i = 0; i < d.length; i++) d[i] = (d[i] / (peak || 1)) * OUTPUT_PEAK;
  return out;
}

export interface DryVoice {
  buffer: AudioBuffer;
  label: string;
}

export const SYNTH_VOICE_LABEL = "synthetic dry voice (formant synth, recorded in no room)";
export const CLIP_VOICE_LABEL = "CC0 dry speech recording";

/** The formant synth on its own. The fake engine always uses this. */
export async function synthesizeDryVoice(sampleRate: number): Promise<DryVoice> {
  return { buffer: await synthesizeVoice(sampleRate), label: SYNTH_VOICE_LABEL };
}

/**
 * Dry source for the real engine. Fetches DRY_CLIP_URL with a per-attempt timeout and
 * exactly FETCH_RETRIES retries (a bounded loop, two attempts in total). A 404, a bad
 * status or a decode failure falls through to the formant synth without throwing, and
 * the label always names the source that actually plays.
 */
export async function loadDryVoice(sampleRate: number): Promise<DryVoice> {
  const attempts = 1 + FETCH_RETRIES;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let bytes: ArrayBuffer | null = null;
    try {
      const res = await fetch(DRY_CLIP_URL, { signal: controller.signal });
      if (res.status === 404) {
        console.info(`${LOG_PREFIX} dry voice: no clip at ${DRY_CLIP_URL}, using the formant synth`);
        break;
      }
      if (res.ok) bytes = await res.arrayBuffer();
      else console.warn(`${LOG_PREFIX} dry voice: attempt ${attempt} of ${attempts} returned status ${res.status}`);
    } catch {
      console.warn(`${LOG_PREFIX} dry voice: attempt ${attempt} of ${attempts} timed out or failed`);
    } finally {
      clearTimeout(timer);
    }
    if (bytes) {
      try {
        const ctx = new OfflineAudioContext(1, 1, sampleRate);
        const buffer = await ctx.decodeAudioData(bytes);
        console.info(`${LOG_PREFIX} dry voice: clip decoded, ${buffer.duration.toFixed(2)} s`);
        return { buffer, label: CLIP_VOICE_LABEL };
      } catch {
        console.warn(`${LOG_PREFIX} dry voice: clip did not decode, using the formant synth`);
        break;
      }
    }
  }
  return synthesizeDryVoice(sampleRate);
}
