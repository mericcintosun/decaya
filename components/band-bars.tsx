"use client";

import { motion } from "motion/react";
import { BAND_LABELS, SPEECH_TARGET, type BandValues } from "@/lib/acoustics";
import { cn } from "@/lib/utils";

const pct = (v: number, max: number) => `${Math.min(100, (v / max) * 100)}%`;

/**
 * Per-band decay times as ruled bars. The green strip is the speech range
 * (0.3 to 0.5 s); the ink bar is the measured room, the grass bar the prediction.
 */
export function BandBars({
  measured,
  predicted,
  max = 1.8,
  className,
}: {
  measured: BandValues;
  predicted?: BandValues;
  max?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-x-auto">
      <div className="min-w-[18rem] space-y-2">
      {BAND_LABELS.map((label, i) => {
        const m = measured[i];
        const p = predicted?.[i];
        return (
          <div key={label} className="grid grid-cols-[3.75rem_1fr_6.5rem] items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            <div className="relative h-6 border border-border bg-background">
              <div
                aria-hidden
                className="absolute inset-y-0 border-x border-ok bg-ok/15"
                style={{ left: pct(SPEECH_TARGET.min, max), width: pct(SPEECH_TARGET.max - SPEECH_TARGET.min, max) }}
              />
              <motion.div
                aria-hidden
                className={cn("absolute left-0 bg-foreground", p === undefined ? "inset-y-1" : "top-0.5 h-2")}
                initial={false}
                animate={{ width: pct(m, max) }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              />
              {p !== undefined && (
                <motion.div
                  aria-hidden
                  className="absolute bottom-0.5 left-0 h-2 bg-primary"
                  initial={false}
                  animate={{ width: pct(p, max) }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                />
              )}
            </div>
            <span className="text-right text-xs tabular-nums">
              {m.toFixed(2)} s
              {p !== undefined && <span className="font-semibold text-primary"> / {p.toFixed(2)} s</span>}
            </span>
          </div>
        );
      })}
      </div>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-4 bg-foreground" /> measured
        </span>
        {predicted && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-4 bg-primary" /> predicted
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-4 border border-ok bg-ok/15" /> speech range 0.3 to 0.5 s
        </span>
      </p>
    </div>
  );
}
