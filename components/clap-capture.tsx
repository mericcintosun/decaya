"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BAND_LABELS, type Measurement } from "@/lib/acoustics";
import { CAPTURE_SECONDS } from "@/lib/config";
import { getEngine } from "@/lib/engine";
import { coreError, isCoreError, type CoreError } from "@/lib/errors";
import type { AdapterMode } from "@/lib/types";

type Phase =
  | { kind: "idle" }
  | { kind: "recording"; secondsLeft: number }
  | { kind: "analyzing" }
  | { kind: "done"; m: Measurement }
  | { kind: "error"; err: CoreError };

/** A short title per error code. The sentence under it is the error's own hint. */
function errorTitle(err: CoreError): string {
  switch (err.error) {
    case "mic_denied":
      return "Microphone blocked.";
    case "mic_unavailable":
      return "No microphone available.";
    case "no_clap":
      return "No clap found.";
    case "fit_failed":
      return "No clean decay to fit.";
    case "parse_failure":
      return "Example data unreadable.";
    default:
      return "Something went wrong.";
  }
}

const CAPTURE_LABEL: Record<NonNullable<Measurement["capturePath"]>, string> = {
  worklet: "raw PCM (AudioWorklet)",
  mediarecorder: "compressed recording (MediaRecorder fallback)",
  fixture: "stored example, no capture",
};

/** Listens for the capture window, finds the claps, and reports RT60 per band with a quality grade. */
export function ClapCapture({
  mode,
  onResult,
  label = "Start listening",
}: {
  mode: AdapterMode;
  onResult: (m: Measurement) => void;
  label?: string;
}) {
  const engine = getEngine(mode);
  const live = engine.mode === "real";
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [level, setLevel] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Unmount: stop the countdown and abort a running capture (which stops the mic tracks).
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      abortRef.current?.abort();
    },
    [],
  );

  async function start() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const t0 = Date.now();
    setPhase(live ? { kind: "recording", secondsLeft: CAPTURE_SECONDS } : { kind: "analyzing" });
    if (live) {
      timer.current = setInterval(() => {
        const left = Math.max(0, CAPTURE_SECONDS - Math.floor((Date.now() - t0) / 1000));
        setPhase((p) => (p.kind === "recording" ? { kind: "recording", secondsLeft: left } : p));
        if (left === 0) setPhase((p) => (p.kind === "recording" ? { kind: "analyzing" } : p));
      }, 250);
    }
    try {
      const m = await engine.capture(setLevel, controller.signal);
      if (controller.signal.aborted) return;
      setPhase({ kind: "done", m });
      onResult(m);
    } catch (e) {
      if (controller.signal.aborted) return;
      setPhase({ kind: "error", err: isCoreError(e) ? e : coreError(live ? "mic_unavailable" : "parse_failure") });
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    }
  }

  const busy = phase.kind === "recording" || phase.kind === "analyzing";

  return (
    <Card className="decaya-ruled p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={start} disabled={busy} size="lg">
          <Mic aria-hidden />
          {phase.kind === "done" || phase.kind === "error" ? (live ? "Listen again" : "Load the example again") : label}
        </Button>
        <p className="text-sm" aria-live="polite">
          {phase.kind === "idle" &&
            (live
              ? "Stand in the middle of the room. Clap sharply three times, about two seconds apart."
              : "Sample mode: the button loads a stored example measurement. The microphone is not used.")}
          {phase.kind === "recording" && `Listening: clap now. ${phase.secondsLeft} s left.`}
          {phase.kind === "analyzing" &&
            (live ? "Splitting into five octave bands and fitting each decay..." : "Loading the stored example measurement...")}
          {phase.kind === "done" && engine.sourceNote}
        </p>
      </div>

      {phase.kind === "recording" && (
        <div className="mt-4 h-3 border border-foreground bg-background" aria-hidden>
          <div className={level > 0.98 ? "h-full bg-bad" : "h-full bg-primary"} style={{ width: `${Math.min(100, level * 100)}%` }} />
        </div>
      )}

      {phase.kind === "error" && (
        <div className="mt-4 space-y-3 border border-bad bg-background p-4" role="alert">
          <p className="text-sm text-bad">
            <span className="font-semibold">{errorTitle(phase.err)}</span> {phase.err.hint}
          </p>
          <Button variant="outline" size="sm" onClick={start}>
            <RotateCcw aria-hidden /> Try again
          </Button>
        </div>
      )}

      {phase.kind === "done" && <QualityReport m={phase.m} />}
    </Card>
  );
}

function QualityReport({ m }: { m: Measurement }) {
  return (
    <div className="mt-4 space-y-3 bg-background p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="stamp" className={m.validCount >= 2 ? "text-ok" : "text-bad"}>
          {m.validCount} of {m.claps.length} claps valid
        </Badge>
        <Badge variant={m.confidence === "high" ? "ok" : m.confidence === "medium" ? "warn" : "bad"}>
          {m.confidence} confidence
        </Badge>
        <span className="text-sm">Noise floor {Math.round(m.dynamicRangeDb)} dB under the clap.</span>
      </div>
      {m.processingWarning && (
        <p className="text-sm text-bad">
          Either this browser kept its voice processing on, or raw capture was not available and a compressed recording was
          used instead. Both can shorten or smear the decay tail, so read the number as a lower bound.
        </p>
      )}
      {m.capturePath && <p className="text-xs text-muted-foreground">Capture: {CAPTURE_LABEL[m.capturePath]}.</p>}
      <ul className="space-y-1 text-sm">
        {m.claps.map((c) => (
          <li key={c.index}>
            Clap {c.index}: {c.valid ? "kept" : c.reason}{" "}
            <span className="text-muted-foreground">
              ({c.bands.map((b, i) => `${BAND_LABELS[i]} ${b === null ? "n/a" : `${b.toFixed(2)} s`}`).join(", ")})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
