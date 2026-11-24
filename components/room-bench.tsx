"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Play, Square } from "lucide-react";
import { BandBars } from "@/components/band-bars";
import { ClapCapture } from "@/components/clap-capture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BAND_LABELS,
  joinNames,
  loadDryVoice,
  midRt60,
  predictRt60,
  synthesizeImpulse,
  VERDICT_LABEL,
  verdictFor,
  type BandValues,
  type DryVoice,
  type Furnishing,
  type Measurement,
  type RoomDims,
} from "@/lib/acoustics";
import { fixFor, loadLocalRooms, saveLocalRoom } from "@/lib/data";
import type { Room } from "@/lib/types";

/** True when the room carries five finite, positive band decay times. */
function hasBandData(room: Room): boolean {
  return (
    Array.isArray(room.measured) &&
    room.measured.length === 5 &&
    room.measured.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0)
  );
}

/** Detail page body. Seeded rooms arrive from the server; rooms measured here load from localStorage. */
export function RoomBench({ slug, seedRoom, furnishings }: { slug: string; seedRoom: Room | null; furnishings: Furnishing[] }) {
  const [room, setRoom] = useState<Room | null>(seedRoom);
  const [loaded, setLoaded] = useState(Boolean(seedRoom));

  useEffect(() => {
    if (seedRoom) return;
    setRoom(loadLocalRooms().find((r) => r.slug === slug) ?? null);
    setLoaded(true);
  }, [seedRoom, slug]);

  if (!loaded) {
    return (
      <Card className="decaya-ruled p-8">
        <p className="font-display text-xl">Opening this room from your browser...</p>
      </Card>
    );
  }
  if (!room) {
    return (
      <Card className="decaya-ruled p-8">
        <h1 className="text-3xl font-semibold">This room is not in the fieldbook</h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          Rooms you measure are kept in the browser you measured them in. This one is not here, or the link is wrong.
        </p>
        <div className="mt-4 flex gap-3">
          <Button asChild>
            <Link href="/new">Measure a room</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Browse the fieldbook</Link>
          </Button>
        </div>
      </Card>
    );
  }
  if (!hasBandData(room)) {
    return (
      <Card className="decaya-specimen decaya-ruled p-8">
        <span className="decaya-stamp text-warn">No band data</span>
        <h1 className="mt-3 text-3xl font-semibold">{room.name} has no decay numbers yet</h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          The bench needs five band decay times to draw the curve, predict a fix and play the before and after. Measure the
          room with three claps to fill them in.
        </p>
        <div className="mt-4 flex gap-3">
          <Button asChild>
            <Link href="/new">Measure a room</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Browse the fieldbook</Link>
          </Button>
        </div>
      </Card>
    );
  }
  return <Bench room={room} furnishings={furnishings} />;
}

function Bench({ room, furnishings }: { room: Room; furnishings: Furnishing[] }) {
  const [measured, setMeasured] = useState<BandValues>(room.measured);
  const [dims, setDims] = useState<RoomDims>(room.dims);
  const [picked, setPicked] = useState<string[]>(() => fixFor(room, furnishings).items.map((i) => i.id));
  const [liveCurve, setLiveCurve] = useState<{ db: number[]; step: number } | null>(null);
  const [claps, setClaps] = useState(room.claps);
  const [dr, setDr] = useState(room.dynamicRangeDb);

  const items = useMemo(() => furnishings.filter((f) => picked.includes(f.id)), [furnishings, picked]);
  const predicted = useMemo(() => predictRt60(measured, dims, items), [measured, dims, items]);
  const before = midRt60(measured);
  const after = midRt60(predicted);
  const vBefore = verdictFor(before);
  const vAfter = verdictFor(after);
  const cost = items.reduce((s, i) => s + i.costUsd, 0);

  function onMeasured(m: Measurement) {
    setMeasured(m.bands);
    setLiveCurve(m.curveDb.length ? { db: m.curveDb, step: m.curveStepSec } : null);
    const nextClaps = { valid: m.validCount, total: m.claps.length };
    setClaps(nextClaps);
    setDr(Math.round(m.dynamicRangeDb));
    if (room.source === "local") {
      saveLocalRoom({ ...room, measured: m.bands, claps: nextClaps, dynamicRangeDb: Math.round(m.dynamicRangeDb), dims });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="decaya-specimen p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pr-6">
          <div>
            <h1 className="text-4xl font-semibold leading-tight">{room.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {room.owner}, {room.city} ·{" "}
              {room.source === "fieldbook" ? `illustrative example values, dated ${room.measuredOn}` : `measured ${room.measuredOn}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="stamp" className={claps.valid === claps.total ? "text-ok" : "text-bad"}>
              {claps.valid} of {claps.total} claps valid
            </Badge>
            <span className="text-xs text-muted-foreground">noise floor {dr} dB under the clap</span>
          </div>
        </div>
        <p className="mt-4 max-w-[70ch]">{room.notes}</p>
        <p className="mt-4 font-display text-2xl">
          {before.toFixed(2)} s mid-band decay.{" "}
          <span className="text-muted-foreground">{VERDICT_LABEL[vBefore]} for a voice.</span>
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>How the room forgets a clap</CardTitle>
            <CardDescription>
              Schroeder decay per band. Lines inside the green wedge die out within the speech range.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <DecayCurve measured={measured} predicted={items.length ? predicted : null} floorDb={dr} liveCurve={liveCurve} />
            <BandBars measured={measured} predicted={items.length ? predicted : undefined} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What would you add?</CardTitle>
            <CardDescription>Sabine solved backwards from your measurement, then forwards with the new absorption.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <fieldset className="grid grid-cols-3 gap-2">
              <legend className="mb-2 text-sm font-semibold">Room size in meters</legend>
              {(["length", "width", "height"] as const).map((k) => (
                <label key={k} className="text-xs text-muted-foreground">
                  {k}
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={dims[k]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) setDims((d) => ({ ...d, [k]: v }));
                    }}
                  />
                </label>
              ))}
            </fieldset>
            <ul className="space-y-2">
              {furnishings.map((f) => {
                const on = picked.includes(f.id);
                const alone = midRt60(predictRt60(measured, dims, [f]));
                return (
                  <li key={f.id}>
                    <Button
                      variant="outline"
                      aria-pressed={on}
                      className="h-auto w-full justify-between whitespace-normal px-3 py-2 text-left"
                      onClick={() => setPicked((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))}
                    >
                      <span>
                        <span className="block">{f.name}</span>
                        <span className="block text-xs font-normal opacity-80">{f.detail}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs">
                        {f.costUsd === 0 ? "free" : `$${f.costUsd}`}
                        <span className="block font-normal opacity-80">alone: {alone.toFixed(2)} s</span>
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-border pt-3 text-sm">
              {items.length === 0
                ? "Nothing added yet. Tap an item to see the prediction."
                : `With ${joinNames(items)} ($${cost}): ${after.toFixed(2)} s, ${VERDICT_LABEL[vAfter].toLowerCase()}.`}
            </p>
          </CardContent>
        </Card>
      </div>

      <ListenAB measured={measured} predicted={predicted} afterLabel={items.length ? `With ${joinNames(items)}` : "Nothing added"} />

      <Card>
        <CardHeader>
          <CardTitle>Measure this room again</CardTitle>
          <CardDescription>Standing in it right now? A new measurement replaces the numbers above.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClapCapture onResult={onMeasured} label="Re-measure with claps" />
        </CardContent>
      </Card>
    </div>
  );
}

/** The wow moment: the same phrase through the measured room, then through the predicted one. */
function ListenAB({ measured, predicted, afterLabel }: { measured: BandValues; predicted: BandValues; afterLabel: string }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const voiceRef = useRef<DryVoice | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "now" | "after" | "error">("idle");
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);

  useEffect(() => () => void ctxRef.current?.close(), []);

  function stop() {
    srcRef.current?.stop();
    srcRef.current = null;
    setState("idle");
  }

  async function play(which: "now" | "after") {
    try {
      srcRef.current?.stop();
      setState("loading");
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume();
      if (!voiceRef.current) {
        voiceRef.current = await loadDryVoice(ctx.sampleRate);
        setVoiceLabel(voiceRef.current.label);
      }
      const ir = await synthesizeImpulse(which === "now" ? measured : predicted, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = voiceRef.current.buffer;
      const conv = ctx.createConvolver();
      conv.normalize = false;
      conv.buffer = ir;
      const gain = ctx.createGain();
      gain.gain.value = 0.9;
      src.connect(conv).connect(gain).connect(ctx.destination);
      src.onended = () => {
        if (srcRef.current === src) {
          srcRef.current = null;
          setTimeout(() => setState((s) => (s === which ? "idle" : s)), ir.duration * 1000);
        }
      };
      srcRef.current = src;
      src.start();
      setState(which);
    } catch {
      setState("error");
    }
  }

  return (
    <Card className="border-foreground bg-deep">
      <CardHeader>
        <CardTitle className="text-2xl">Listen before you buy</CardTitle>
        <CardDescription>
          The same dry phrase, played through a decay built from each set of band values. Both sides use identical noise, so
          the only difference you hear is the decay time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" variant="outline" aria-pressed={state === "now"} onClick={() => play("now")} disabled={state === "loading"}>
            <Play aria-hidden /> Your room now ({midRt60(measured).toFixed(2)} s)
          </Button>
          <Button size="lg" aria-pressed={state === "after"} onClick={() => play("after")} disabled={state === "loading"}>
            <Play aria-hidden /> {afterLabel} ({midRt60(predicted).toFixed(2)} s)
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {(state === "now" || state === "after") && (
            <Button variant="ghost" size="sm" onClick={stop}>
              <Square aria-hidden /> Stop
            </Button>
          )}
          <span aria-live="polite">
            {state === "loading" && "Building the impulse responses..."}
            {state === "error" && <span className="text-bad">This browser could not start audio. Tap again, or try Chrome.</span>}
            {voiceLabel && state !== "error" && state !== "loading" && `Source: ${voiceLabel}.`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          A relative preview: the synthetic decay has no early reflections, so it will not sound exactly like your room. It
          does let you compare {BAND_LABELS.length} bands of before and after by ear.
        </p>
      </CardContent>
    </Card>
  );
}

/** Canvas plot of energy decay in dB against time, with the speech-range wedge shaded. */
function DecayCurve({
  measured,
  predicted,
  floorDb,
  liveCurve,
}: {
  measured: BandValues;
  predicted: BandValues | null;
  floorDb: number;
  liveCurve: { db: number[]; step: number } | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const onResize = () => setWidth(ref.current?.clientWidth ?? 0);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim();
    const line = css.getPropertyValue("--line").trim();
    const grass = css.getPropertyValue("--grass").trim();
    const ok = css.getPropertyValue("--ok-tone").trim();

    const pad = { l: 40, r: 10, t: 10, b: 24 };
    const maxT = Math.max(1, Math.ceil(Math.max(...measured) * 1.2 * 5) / 5);
    const x = (t: number) => pad.l + (t / maxT) * (w - pad.l - pad.r);
    const y = (db: number) => pad.t + (Math.min(-db, 60) / 60) * (h - pad.t - pad.b);
    const floor = -Math.min(Math.max(floorDb, 20), 60);

    g.font = "11px sans-serif";
    g.lineWidth = 1;
    for (let db = 0; db >= -60; db -= 10) {
      g.strokeStyle = line;
      g.beginPath();
      g.moveTo(pad.l, y(db));
      g.lineTo(w - pad.r, y(db));
      g.stroke();
      g.fillStyle = ink;
      g.fillText(`${db}`, 6, y(db) + 4);
    }
    for (let t = 0; t <= maxT + 1e-6; t += 0.2) g.fillText(`${t.toFixed(1)}s`, x(t) - 10, h - 6);

    g.globalAlpha = 0.18;
    g.fillStyle = ok;
    g.beginPath();
    g.moveTo(x(0), y(0));
    g.lineTo(x(0.3), y(-60));
    g.lineTo(x(0.5), y(-60));
    g.closePath();
    g.fill();
    g.globalAlpha = 1;

    const decayLine = (rt: number, color: string, widthPx: number, alpha: number, dash: number[] = []) => {
      const tFloor = (rt * -floor) / 60;
      g.strokeStyle = color;
      g.lineWidth = widthPx;
      g.globalAlpha = alpha;
      g.setLineDash(dash);
      g.beginPath();
      g.moveTo(x(0), y(0));
      g.lineTo(x(Math.min(tFloor, maxT)), y(Math.max(floor, (-60 * maxT) / rt)));
      if (tFloor < maxT) g.lineTo(x(maxT), y(floor));
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
    };

    measured.forEach((rt) => decayLine(rt, ink, 1, 0.3));
    if (liveCurve) {
      g.strokeStyle = ink;
      g.lineWidth = 2;
      g.beginPath();
      liveCurve.db.forEach((db, i) => {
        const t = i * liveCurve.step;
        if (t > maxT) return;
        if (i === 0) g.moveTo(x(t), y(db));
        else g.lineTo(x(t), y(db));
      });
      g.stroke();
    } else {
      decayLine(midRt60(measured), ink, 2.5, 1);
    }
    if (predicted) decayLine(midRt60(predicted), grass, 2.5, 1, [6, 4]);
  }, [measured, predicted, floorDb, liveCurve, width]);

  return (
    <div className="overflow-x-auto">
      <canvas
        ref={ref}
        className="h-56 w-full min-w-[18rem] border border-border bg-background"
        role="img"
        aria-label={`Decay curve. Mid-band decay ${midRt60(measured).toFixed(2)} seconds${predicted ? `, predicted ${midRt60(predicted).toFixed(2)} seconds` : ""}.`}
      />
    </div>
  );
}
