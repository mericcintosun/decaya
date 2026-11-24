"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { analyzeRecording, BAND_LABELS, recordClaps, type Measurement } from "@/lib/acoustics";

const SECONDS = 7;

type Phase =
  | { kind: "idle" }
  | { kind: "recording"; secondsLeft: number }
  | { kind: "analyzing" }
  | { kind: "done"; m: Measurement }
  | { kind: "error"; message: string };

function explain(e: unknown): string {
  if (e instanceof DOMException && e.name === "NotAllowedError") {
    return "Microphone access was blocked. Allow it from the address bar, then try again.";
  }
  if (e instanceof DOMException && e.name === "NotFoundError") return "No microphone was found on this device.";
  return e instanceof Error ? e.message : "Something went wrong while listening.";
}

/** Listens for 7 seconds, finds the claps, and reports RT60 per band with a quality grade. */
export function ClapCapture({ onResult, label = "Start listening" }: { onResult: (m: Measurement) => void; label?: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [level, setLevel] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    const t0 = Date.now();
    setPhase({ kind: "recording", secondsLeft: SECONDS });
    timer.current = setInterval(() => {
      const left = Math.max(0, SECONDS - Math.floor((Date.now() - t0) / 1000));
      setPhase((p) => (p.kind === "recording" ? { kind: "recording", secondsLeft: left } : p));
    }, 250);
    try {
      const rec = await recordClaps(SECONDS, setLevel);
      if (timer.current) clearInterval(timer.current);
      setPhase({ kind: "analyzing" });
      const m = await analyzeRecording(rec.samples, rec.sampleRate, rec.processingWarning);
      setPhase({ kind: "done", m });
      onResult(m);
    } catch (e) {
      if (timer.current) clearInterval(timer.current);
      setPhase({ kind: "error", message: explain(e) });
    }
  }

  const busy = phase.kind === "recording" || phase.kind === "analyzing";

  return (
    <Card className="decaya-ruled p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={start} disabled={busy} size="lg">
          <Mic aria-hidden />
          {phase.kind === "done" || phase.kind === "error" ? "Listen again" : label}
        </Button>
        <p className="text-sm" aria-live="polite">
          {phase.kind === "idle" && "Stand in the middle of the room. Clap sharply three times, about two seconds apart."}
          {phase.kind === "recording" && `Listening: clap now. ${phase.secondsLeft} s left.`}
          {phase.kind === "analyzing" && "Splitting into five octave bands and fitting each decay..."}
          {phase.kind === "done" && `Measured in this browser. Nothing was uploaded.`}
          {phase.kind === "error" && <span className="text-bad">{phase.message}</span>}
        </p>
      </div>

      {phase.kind === "recording" && (
        <div className="mt-4 h-3 border border-foreground bg-background" aria-hidden>
          <div className={level > 0.98 ? "h-full bg-bad" : "h-full bg-primary"} style={{ width: `${Math.min(100, level * 100)}%` }} />
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
          This browser kept its voice processing on (echo cancellation or noise suppression). It can shorten the decay, so
          read the number as a lower bound.
        </p>
      )}
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
