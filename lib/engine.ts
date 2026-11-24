// The measurement engine seam. No "use client", no env access: safe to import from client
// components. Server pages read getAdapter().mode (lib/adapter.ts, the only reader of
// ADAPTER_MODE) and pass it down as a prop; components call getEngine(mode).
import fixtureJson from "../fixtures/measurement.json";
import {
  analyzeRecording,
  loadDryVoice,
  recordClaps,
  synthesizeDryVoice,
  type DryVoice,
  type Measurement,
  type Recording,
} from "./acoustics";
import { CAPTURE_SECONDS, FAKE_CAPTURE_DELAY_MS, LOG_PREFIX } from "./config";
import { coreError, CoreFailure, isCoreError, type CoreError } from "./errors";
import { measurementSchema } from "./schemas";
import type { AdapterMode } from "./types";

export interface MeasureEngine {
  mode: AdapterMode;
  /** Records (or loads) a clap measurement. Rejects with a CoreError. */
  capture(onLevel?: (peak: number) => void, signal?: AbortSignal): Promise<Measurement>;
  /** The dry phrase both sides of the A/B play. */
  dryVoice(sampleRate: number): Promise<DryVoice>;
  /** One plain sentence saying where the numbers come from. */
  sourceNote: string;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : 0);

/** Maps anything thrown during capture or analysis to a typed CoreError (never message text). */
export function toCoreError(e: unknown, stage: "capture" | "analysis"): CoreError {
  if (isCoreError(e)) return e;
  if (e instanceof CoreFailure) return coreError(e.code, e.message);
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    if (e.name === "NotAllowedError" || e.name === "SecurityError") return coreError("mic_denied");
    return coreError("mic_unavailable");
  }
  return coreError(stage === "capture" ? "mic_unavailable" : "fit_failed");
}

function isAbort(e: unknown): boolean {
  return typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError";
}

/** Live engine: microphone, raw PCM capture, octave filters, Schroeder and T20, in this browser. */
export const realEngine: MeasureEngine = {
  mode: "real",
  sourceNote: "Live measurement: your microphone, analyzed in this browser. Nothing leaves your device.",
  async capture(onLevel, signal) {
    console.info(`${LOG_PREFIX} capture started, window ${CAPTURE_SECONDS} s`);
    let rec: Recording;
    try {
      rec = await recordClaps(CAPTURE_SECONDS, onLevel, signal);
    } catch (e) {
      if (isAbort(e)) throw e;
      const err = toCoreError(e, "capture");
      console.warn(`${LOG_PREFIX} capture failed: ${err.error}`);
      throw err;
    }
    console.info(
      `${LOG_PREFIX} capture done via ${rec.path}, ${rec.samples.length} samples, ${(rec.samples.length / rec.sampleRate).toFixed(2)} s at ${rec.sampleRate} Hz`,
    );
    const t0 = now();
    try {
      const m = await analyzeRecording(rec.samples, rec.sampleRate, rec.processingWarning);
      console.info(
        `${LOG_PREFIX} analysis done, ${m.validCount} of ${m.claps.length} claps valid, ${Math.round(now() - t0)} ms`,
      );
      return { ...m, capturePath: rec.path };
    } catch (e) {
      const err = toCoreError(e, "analysis");
      console.warn(`${LOG_PREFIX} analysis failed: ${err.error}`);
      throw err;
    }
  },
  dryVoice: (sampleRate) => loadDryVoice(sampleRate),
};

/** Sample engine: a stored dorm-room measurement, validated, after a short fixed delay. No microphone. */
export const fakeEngine: MeasureEngine = {
  mode: "fake",
  sourceNote: "Sample data: this is a stored example measurement, no microphone was used.",
  async capture(onLevel, signal) {
    console.info(`${LOG_PREFIX} fake capture: loading fixtures/measurement.json`);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, FAKE_CAPTURE_DELAY_MS);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("The capture was cancelled.", "AbortError"));
      });
    });
    onLevel?.(0);
    const parsed = measurementSchema.safeParse(fixtureJson);
    if (!parsed.success) {
      console.warn(`${LOG_PREFIX} fake capture: fixture failed validation`);
      throw coreError("parse_failure", "The stored example measurement could not be read.");
    }
    const m: Measurement = parsed.data;
    console.info(`${LOG_PREFIX} fake capture done, ${m.validCount} of ${m.claps.length} claps valid`);
    return m;
  },
  dryVoice: (sampleRate) => synthesizeDryVoice(sampleRate),
};

/** The only switch between the two engines. */
export function getEngine(mode: AdapterMode): MeasureEngine {
  return mode === "real" ? realEngine : fakeEngine;
}
