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
  joinNames,
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
import { RoomSizeHandle } from "@/components/room-size-handle";
import { BenchSkeleton, EmptyState } from "@/components/states";
import { useLocalRooms } from "@/components/use-local-rooms";
import { fixFor, measurementNote } from "@/lib/data";
import { IMPULSE_SEED } from "@/lib/config";
import { getEngine } from "@/lib/engine";
import { HINTS } from "@/lib/errors";
import { storedRoomSchema } from "@/lib/schemas";
import { saveRoom } from "@/lib/store";
import type { AdapterMode, Room } from "@/lib/types";

/** True when the room carries five finite, positive band decay times. */
function hasBandData(room: Room): boolean {
  return (
    Array.isArray(room.measured) &&
    room.measured.length === 5 &&
    room.measured.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0)
  );
}

/** Detail page body. Seeded rooms arrive from the server; rooms measured here come from useLocalRooms(). */
export function RoomBench({
  slug,
  seedRoom,
  furnishings,
  mode,
}: {
  slug: string;
  seedRoom: Room | null;
  furnishings: Furnishing[];
  mode: AdapterMode;
}) {
  // The only reader of rooms measured in this browser on this route.
  const local = useLocalRooms();
  const room = seedRoom ?? local.rooms.find((r) => r.slug === slug) ?? null;

  // Not a seed slug and the browser store is not read yet (server render, hydration):
  // show the bench skeleton, never a flash of "not found".
  if (!seedRoom && !local.ready) {
    return <BenchSkeleton stamp="Opening your room" line="Reading this room from your browser..." />;
  }
  if (!room) {
    return (
      <EmptyState
        as="h1"
        stamp="No specimen"
        title="This room is not in the fieldbook"
        body={HINTS.not_found}
        ctaHref="/new"
        ctaLabel="Measure a room"
        secondaryHref="/"
        secondaryLabel="Browse the fieldbook"
      />
    );
  }
  if (!hasBandData(room)) {
    return (
      <Card className="decaya-specimen decaya-ruled p-8">
        <span className="decaya-stamp text-warn">No band data</span>
        <h1 className="mt-3 break-words text-3xl font-semibold" title={room.name}>
          {room.name} has no decay numbers yet
        </h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          The decay curve, the predicted bars, the room size handle and the before and after player appear here once the room
          has five band decay times. Measure the room with three claps, or press &quot;Use the sample measurement&quot; on the
          measuring page, to fill them in.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
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
  return <Bench key={room.slug} room={room} furnishings={furnishings} mode={mode} />;
}

function Bench({ room, furnishings, mode }: { room: Room; furnishings: Furnishing[]; mode: AdapterMode }) {
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

  // Re-measure: a local room gets a pending save; the button is disabled while saving.
  const [pending, setPending] = useState<Measurement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onMeasured(m: Measurement) {
    setMeasured(m.bands);
    setLiveCurve(m.curveDb.length ? { db: m.curveDb, step: m.curveStepSec } : null);
    setClaps({ valid: m.validCount, total: m.claps.length });
    setDr(Math.round(m.dynamicRangeDb));
    setSaveMsg(null);
    if (room.source === "local") setPending(m);
  }

  function saveRemeasure() {
    if (!pending || saving) return;
    setSaving(true);
    const next: Room = {
      ...room,
      measured: pending.bands,
      claps: { valid: pending.validCount, total: pending.claps.length },
      dynamicRangeDb: Math.round(pending.dynamicRangeDb),
      dims,
      measuredOn: new Date().toISOString().slice(0, 10),
      notes: measurementNote(pending),
    };
    const checked = storedRoomSchema.safeParse(next);
    if (!checked.success) {
      setSaving(false);
      setSaveMsg({ ok: false, text: `${HINTS.invalid_input} Check the room size: each side between 0.5 and 50 m.` });
      return;
    }
    // Same slug as the stored room: saveRoom (lib/store.ts) replaces it in place.
    const result = saveRoom(checked.data);
    setSaving(false);
    if (!result.ok) {
      setSaveMsg({ ok: false, text: result.hint });
      return;
    }
    setPending(null);
    setSaveMsg({ ok: true, text: "Saved. The fieldbook shows the new numbers." });
  }

  return (
    <div className="space-y-6">
      <Card className="decaya-specimen p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pr-6">
          <div className="min-w-0">
            <h1 className="break-words text-4xl font-semibold leading-tight" title={room.name}>
              {room.name}
            </h1>
            <p className="mt-1 break-words text-muted-foreground">
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
        <p className="mt-4 max-w-[70ch] break-words">{room.notes}</p>
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
                <label key={k} className="min-w-0 text-xs text-muted-foreground">
                  {k}
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    aria-label={`Room ${k} in meters`}
                    value={dims[k]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) setDims((d) => ({ ...d, [k]: v }));
                    }}
                  />
                </label>
              ))}
            </fieldset>
            {/* Signature 2: drag the width. Same dims state as the inputs above, same predictRt60. */}
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-sm">
                <span className="font-semibold">Predicted, from your room size:</span>{" "}
                <span className="font-display text-lg tabular-nums">{after.toFixed(2)} s</span> mid-band decay
              </p>
              <RoomSizeHandle value={dims.width} onChange={(w) => setDims((d) => ({ ...d, width: w }))} />
              {/* Below lg the band card sits above this one, so a copy of the bars moves here while you drag. */}
              <div className="lg:hidden" aria-hidden>
                <BandBars measured={measured} predicted={items.length ? predicted : undefined} />
              </div>
              <p className="text-xs text-muted-foreground">
                {items.length === 0
                  ? "Tap an item below first. With nothing added the prediction equals your measurement at any size."
                  : "The same items cover less of a bigger room, so the predicted decay rises as you widen it. This is a Sabine prediction, not a measurement."}
              </p>
            </div>
            <ul className="space-y-2">
              {furnishings.map((f) => {
                const on = picked.includes(f.id);
                const alone = midRt60(predictRt60(measured, dims, [f]));
                return (
                  <li key={f.id}>
                    <Button
                      variant="outline"
                      aria-pressed={on}
                      className="h-auto min-h-11 w-full justify-between whitespace-normal px-3 py-2 text-left"
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

      <ListenAB
        mode={mode}
        measured={measured}
        predicted={predicted}
        afterLabel={items.length ? `With ${joinNames(items)}` : "Nothing added"}
      />

      <Card>
        <CardHeader>
          <CardTitle>Measure this room again</CardTitle>
          <CardDescription>Standing in it right now? A new measurement replaces the numbers above.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClapCapture mode={mode} onResult={onMeasured} label="Re-measure with claps" />
          {room.source === "local" ? (
            <div className="flex flex-wrap items-center gap-4">
              <Button className="min-h-11" onClick={saveRemeasure} disabled={!pending || saving}>
                {saving ? "Saving..." : "Save the new numbers"}
              </Button>
              {saveMsg && <p className={saveMsg.ok ? "text-sm text-ok" : "text-sm text-bad"}>{saveMsg.text}</p>}
              {!pending && !saveMsg && (
                <p className="text-sm text-muted-foreground">You can save once the room is measured again.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This is an example room, so a new measurement updates this page only and is not saved.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** The wow moment: the same phrase through the measured room, then through the predicted one. */
function ListenAB({
  mode,
  measured,
  predicted,
  afterLabel,
}: {
  mode: AdapterMode;
  measured: BandValues;
  predicted: BandValues;
  afterLabel: string;
}) {
  const engine = getEngine(mode);
  const ctxRef = useRef<AudioContext | null>(null);
  const voiceRef = useRef<DryVoice | null>(null);
  // Both impulse responses, built together for one pair of band values.
  const irsRef = useRef<{ key: string; now: AudioBuffer; after: AudioBuffer } | null>(null);
  const playingRef = useRef<{ src: AudioBufferSourceNode; out: GainNode } | null>(null);
  const tokenRef = useRef(0);
  const [state, setState] = useState<"idle" | "loading" | "now" | "after" | "error">("idle");
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);

  /** Fades the current clip and its reverb tail out over 30 ms, so A and B never overlap. */
  function fadeOut() {
    const p = playingRef.current;
    const ctx = ctxRef.current;
    playingRef.current = null;
    if (!p || !ctx) return;
    const t = ctx.currentTime;
    p.out.gain.cancelScheduledValues(t);
    p.out.gain.setValueAtTime(p.out.gain.value, t);
    p.out.gain.linearRampToValueAtTime(0, t + 0.03);
    try {
      p.src.stop(t + 0.04);
    } catch {
      // already stopped
    }
    setTimeout(() => p.out.disconnect(), 120);
  }

  useEffect(
    () => () => {
      fadeOut();
      void ctxRef.current?.close();
    },
    [],
  );

  function stop() {
    tokenRef.current++;
    fadeOut();
    setState("idle");
  }

  async function play(which: "now" | "after") {
    const token = ++tokenRef.current;
    fadeOut();
    try {
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume();
      const key = JSON.stringify([measured, predicted, ctx.sampleRate]);
      let voice = voiceRef.current;
      let irs = irsRef.current;
      if (!voice || !irs || irs.key !== key) {
        setState("loading");
        if (!voice) {
          voice = await engine.dryVoice(ctx.sampleRate);
          voiceRef.current = voice;
          setVoiceLabel(voice.label);
        }
        if (!irs || irs.key !== key) {
          // Same function, same seed, same loudness match: only the band values differ.
          // Both buffers exist before either plays, so switching sides has no build gap.
          const [nowIr, afterIr] = await Promise.all([
            synthesizeImpulse(measured, ctx.sampleRate, IMPULSE_SEED),
            synthesizeImpulse(predicted, ctx.sampleRate, IMPULSE_SEED),
          ]);
          irs = { key, now: nowIr, after: afterIr };
          irsRef.current = irs;
        }
      }
      if (token !== tokenRef.current) return;
      const ir = which === "now" ? irs.now : irs.after;
      const src = ctx.createBufferSource();
      src.buffer = voice.buffer;
      const conv = ctx.createConvolver();
      conv.normalize = false;
      conv.buffer = ir;
      const out = ctx.createGain();
      out.gain.value = 0.9;
      src.connect(conv).connect(out).connect(ctx.destination);
      const playing = { src, out };
      src.onended = () => {
        // Let the reverb tail ring out before the button returns to idle.
        setTimeout(() => {
          if (playingRef.current === playing) {
            playingRef.current = null;
            setState((s) => (s === which ? "idle" : s));
          }
        }, ir.duration * 1000);
      };
      playingRef.current = playing;
      src.start();
      setState(which);
    } catch {
      if (token === tokenRef.current) setState("error");
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
          <Button
            size="lg"
            variant="outline"
            className="h-auto min-h-11 whitespace-normal py-2"
            aria-pressed={state === "now"}
            onClick={() => play("now")}
            disabled={state === "loading"}
          >
            <Play aria-hidden /> Your room now ({midRt60(measured).toFixed(2)} s)
          </Button>
          <Button
            size="lg"
            className="h-auto min-h-11 whitespace-normal py-2"
            aria-pressed={state === "after"}
            onClick={() => play("after")}
            disabled={state === "loading"}
          >
            <Play aria-hidden /> {afterLabel} ({midRt60(predicted).toFixed(2)} s)
          </Button>
        </div>
        <p className="text-sm">
          <span className="font-semibold">Voice:</span> {voiceLabel ?? "named here after the first play"}.
        </p>
        <p className="text-xs text-muted-foreground">
          Both versions use the same synthetic room model, so this is a relative preview, not a recording of your room.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {(state === "now" || state === "after") && (
            <Button variant="ghost" className="min-h-11" onClick={stop}>
              <Square aria-hidden /> Stop
            </Button>
          )}
          <span aria-live="polite">
            {state === "loading" && "Building both impulse responses..."}
            {state === "error" && <span className="text-bad">This browser could not start audio. Tap again, or try Chrome.</span>}
          </span>
        </div>
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
