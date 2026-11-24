// Decaya's acoustics core. Everything here runs in the visitor's browser:
// Sabine prediction, Schroeder backward integration with a T20 fit, clap capture,
// and the synthetic impulse responses used for the before/after preview.

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
  a.type = "bandpass"; a.frequency.value = freq; a.Q.value = 1.414;
  const b = ctx.createBiquadFilter();
  b.type = "bandpass"; b.frequency.value = freq; b.Q.value = 1.414;
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
}

/** Find claps, split into octave bands, integrate, fit, and grade the result. */
export async function analyzeRecording(samples: Float32Array, sampleRate: number, processingWarning = false): Promise<Measurement> {
  const frame = Math.round(sampleRate * 0.01);
  const env = frameEnvelopeDb(samples, frame);
  if (env.length < 50) throw new Error("The recording was too short to analyze.");
  const sorted = [...env].sort((a, b) => a - b);
  const noiseDb = sorted[Math.floor(sorted.length * 0.2)];

  const onsetFrames: number[] = [];
  const minGap = 90; // frames of 10 ms: claps closer than 0.9 s overlap their tails
  for (let i = 1; i < env.length; i++) {
    const last = onsetFrames[onsetFrames.length - 1];
    if (env[i] - noiseDb > 25 && env[i] - env[i - 1] > 6 && (last === undefined || i - last >= minGap)) {
      onsetFrames.push(i);
    }
  }
  if (onsetFrames.length === 0) {
    throw new Error("No clap stood out from the background noise. Clap louder, closer to the middle of the room.");
  }

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

  let curveDb: number[] = [];
  const curveStepSec = 0.005;
  const claps: ClapReport[] = onsets.map((o, idx) => {
    const next = onsets[idx + 1];
    const end = Math.min(o.peakIdx + Math.round(1.5 * sampleRate), next ? next.peakIdx - Math.round(0.05 * sampleRate) : samples.length);
    const clipped = o.peak >= 0.985;
    const dynamicRangeDb = 20 * Math.log10(o.peak + 1e-12) - noiseDb;
    const bands = banded.map((band, b) => {
      // Subtract the band's noise power before integrating so the floor does not flatten the fit.
      const noisePow = meanSquare(band, o.peakIdx - Math.round(0.3 * sampleRate), o.peakIdx - Math.round(0.03 * sampleRate));
      const energy = new Float32Array(Math.max(0, end - o.peakIdx));
      for (let i = 0; i < energy.length; i++) {
        const v = band[o.peakIdx + i];
        energy[i] = Math.max(v * v - noisePow, 0);
      }
      const curve = schroederDb(energy);
      if (b === 2 && curveDb.length === 0 && !clipped) {
        const step = Math.round(curveStepSec * sampleRate);
        const pts: number[] = [];
        for (let i = 0; i < curve.length; i += step) pts.push(curve[i]);
        curveDb = pts;
      }
      return t20(curve, sampleRate);
    });
    let reason: string | null = null;
    if (clipped) reason = "Clipped: the clap overloaded the microphone.";
    else if (dynamicRangeDb < 30) reason = `Only ${Math.round(dynamicRangeDb)} dB above the noise, 30 dB needed.`;
    else if (bands[1] === null || bands[2] === null) reason = "The mid bands did not decay cleanly.";
    return { index: idx + 1, valid: reason === null, clipped, dynamicRangeDb, bands, reason };
  });

  const usable = claps.filter((c) => c.valid);
  const pool = usable.length > 0 ? usable : claps;
  const avg = BANDS.map((_, b) => {
    const vals = pool.map((c) => c.bands[b]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  });
  if (avg[1] === null || avg[2] === null) {
    throw new Error("Could not fit a decay to any clap. Try a quieter moment and sharper claps.");
  }
  const midFallback = (avg[1] + avg[2]) / 2;
  const bands = avg.map((v) => v ?? midFallback) as BandValues;
  const dr = Math.min(...pool.map((c) => c.dynamicRangeDb));
  const validCount = usable.length;
  const confidence = validCount >= 3 && dr >= 40 ? "high" : validCount >= 2 ? "medium" : "low";
  return { bands, claps, validCount, dynamicRangeDb: dr, curveDb, curveStepSec, confidence, processingWarning };
}

export interface Recording {
  samples: Float32Array;
  sampleRate: number;
  processingWarning: boolean;
}

/** Records the microphone for a fixed window with browser voice processing switched off. */
export async function recordClaps(seconds: number, onLevel?: (peak: number) => void): Promise<Recording> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot open the microphone. Use Chrome, Edge or Safari over HTTPS.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  });
  const settings = stream.getAudioTracks()[0]?.getSettings();
  const processingWarning = Boolean(settings?.echoCancellation || settings?.noiseSuppression || settings?.autoGainControl);

  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const frameBuf = new Float32Array(analyser.fftSize);
  let raf = 0;
  const tick = () => {
    analyser.getFloatTimeDomainData(frameBuf);
    let p = 0;
    for (let i = 0; i < frameBuf.length; i++) p = Math.max(p, Math.abs(frameBuf[i]));
    onLevel?.(p);
    raf = requestAnimationFrame(tick);
  };
  tick();

  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  recorder.stop();
  await stopped;
  cancelAnimationFrame(raf);
  onLevel?.(0);
  stream.getTracks().forEach((t) => t.stop());

  const blob = new Blob(chunks, { type: recorder.mimeType });
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  return { samples: decoded.getChannelData(0).slice(), sampleRate: decoded.sampleRate, processingWarning };
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
export async function synthesizeImpulse(bands: BandValues, sampleRate: number): Promise<AudioBuffer> {
  const longest = Math.max(...bands);
  const length = Math.ceil(sampleRate * Math.min(longest * 1.1 + 0.15, 4));
  const ctx = new OfflineAudioContext(1, length, sampleRate);
  bands.forEach((rt, i) => {
    const noise = ctx.createBuffer(1, length, sampleRate);
    const d = noise.getChannelData(0);
    const rand = mulberry32(9001 + i * 31);
    const k = -3 / (sampleRate * Math.max(rt, 0.05)); // amplitude falls 60 dB over rt seconds
    for (let n = 0; n < length; n++) d[n] = (rand() * 2 - 1) * Math.pow(10, k * n);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = BANDS[i];
    f.Q.value = 1.1;
    src.connect(f).connect(ctx.destination);
    src.start();
  });
  const ir = await ctx.startRendering();
  const d = ir.getChannelData(0);
  let tail = 0;
  for (let n = 0; n < d.length; n++) tail += d[n] * d[n];
  // Reverberant energy is proportional to 1/A, so it grows with the decay time.
  const ratio = 2.2 * midRt60(bands);
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
  for (let i = 0; i < d.length; i++) d[i] = (d[i] / (peak || 1)) * 0.8;
  return out;
}

export interface DryVoice {
  buffer: AudioBuffer;
  label: string;
}

/**
 * Adapter for the dry source. TODO: drop a CC0 anechoic speech clip at
 * public/audio/dry-speech.wav (credit it in the README) and it is used automatically;
 * until then the formant synth above stands in and the UI says so.
 */
export async function loadDryVoice(sampleRate: number): Promise<DryVoice> {
  try {
    const res = await fetch("/audio/dry-speech.wav");
    if (res.ok) {
      const ctx = new OfflineAudioContext(1, 1, sampleRate);
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      return { buffer, label: "CC0 dry speech recording" };
    }
  } catch {
    // fall through to the synth
  }
  return { buffer: await synthesizeVoice(sampleRate), label: "synthetic dry voice (formant synth, recorded in no room)" };
}
