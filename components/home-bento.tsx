"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { BandBars } from "@/components/band-bars";
import { RoomSizeHandle } from "@/components/room-size-handle";
import { SceneSlot } from "@/components/scene-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  joinNames,
  midRt60,
  predictRt60,
  SPEECH_TARGET,
  VERDICT_LABEL,
  verdictFor,
  type RoomDims,
} from "@/lib/acoustics";
import { averageCut } from "@/lib/data";
import type { Furnishing, Room } from "@/lib/types";

const PREVIEW_ITEMS = ["heavy-curtain", "duvet-wall", "area-rug", "foam-panels"];
/** Right edge of the speech window scale, in seconds. */
const SCALE_MAX = 1.8;
const pct = (v: number) => `${Math.min(100, Math.max(0, (v / SCALE_MAX) * 100))}%`;

/**
 * The home composition (ARCHETYPE L4): six unequal cells, no hero paragraph above.
 * Signature 2 lives in the largest cell: drag the room width and the predicted bars move
 * through predictRt60 on the seeded room. The clap quality cell expands on hover or focus.
 */
export function HomeBento({ featured, rooms, furnishings }: { featured: Room; rooms: Room[]; furnishings: Furnishing[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [dims, setDims] = useState<RoomDims>(featured.dims);
  const [stampOpen, setStampOpen] = useState(false);
  const items = useMemo(() => furnishings.filter((f) => picked.includes(f.id)), [furnishings, picked]);
  const predicted = useMemo(() => predictRt60(featured.measured, dims, items), [featured.measured, dims, items]);
  const before = midRt60(featured.measured);
  const after = midRt60(predicted);
  const verdict = verdictFor(items.length ? after : before);
  const cost = items.reduce((s, i) => s + i.costUsd, 0);
  const volume = dims.length * dims.width * dims.height;
  const previewItems = PREVIEW_ITEMS.map((id) => furnishings.find((x) => x.id === id)).filter(
    (f): f is Furnishing => Boolean(f),
  );

  const mids = rooms.map((r) => ({ slug: r.slug, name: r.name, mid: midRt60(r.measured) }));
  const tooLong = mids.filter((r) => r.mid > SPEECH_TARGET.max).length;
  const duvet = furnishings.find((f) => f.id === "duvet-wall");
  const foam = furnishings.find((f) => f.id === "foam-panels");
  const duvetCut = Math.round(averageCut("duvet-wall", rooms, furnishings) * 100);
  const foamCut = Math.round(averageCut("foam-panels", rooms, furnishings) * 100);
  const cutMax = Math.max(duvetCut, foamCut, 1);

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Decaya at a glance" className="decaya-drop-in grid gap-4 lg:grid-cols-12">
        {/* Largest cell: the claim plus the live product, on a real seeded room. */}
        <Card className="decaya-specimen p-6 sm:p-8 lg:col-span-7 lg:row-span-2">
          <h1 className="pr-6">
            <span className="block text-4xl font-semibold leading-[1.05] sm:text-5xl">Clap once in your room.</span>
            <span className="mt-3 block max-w-[36ch] text-xl font-normal leading-snug sm:text-2xl">
              Decaya measures the echo, works out which rug or curtain will fix it, and lets you hear the result before you buy.
            </span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Try it on {featured.name}, an illustrative example room. Every number after you add an item is a prediction.
          </p>

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Items to add">
            {previewItems.map((f) => {
              const on = picked.includes(f.id);
              return (
                <Button
                  key={f.id}
                  variant="outline"
                  className="h-auto min-h-11 whitespace-normal py-2"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))}
                >
                  {f.name} {f.costUsd === 0 ? "(free)" : `$${f.costUsd}`}
                </Button>
              );
            })}
          </div>

          <BandBars className="mt-5" measured={featured.measured} predicted={items.length ? predicted : undefined} />

          {/* Signature 2: drag, arrow keys or the width box all write the same dims state. */}
          <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_7rem] sm:items-end">
            <RoomSizeHandle value={dims.width} onChange={(w) => setDims((d) => ({ ...d, width: w }))} />
            <label htmlFor="bento-width" className="text-xs text-muted-foreground">
              Width in meters
              <Input
                id="bento-width"
                type="number"
                step="0.1"
                min="2"
                max="6"
                value={dims.width}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 2 && v <= 6) setDims((d) => ({ ...d, width: v }));
                }}
                className="mt-1"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            Room {dims.length} x {dims.width.toFixed(1)} x {dims.height} m, {volume.toFixed(1)} m³.{" "}
            {items.length === 0
              ? "Add an item, then drag: the same item covers less of a bigger room."
              : "Wider room, same items: the predicted decay rises."}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Badge variant={verdict === "speech-ready" ? "ok" : verdict === "too-live" ? "bad" : "warn"}>
              {VERDICT_LABEL[verdict]}
            </Badge>
            <p className="text-sm tabular-nums" aria-live="polite">
              {items.length === 0
                ? `Mid-band decay is ${before.toFixed(2)} s. Speech stays clear under ${SPEECH_TARGET.max} s.`
                : `${before.toFixed(2)} s now, predicted ${after.toFixed(2)} s with ${joinNames(items)}, for $${cost}.`}
            </p>
            <Button asChild variant="link" className="ml-auto min-h-11">
              <Link href={`/rooms/${featured.slug}`}>Listen to the difference</Link>
            </Button>
          </div>
        </Card>

        {/* Pure image cell. */}
        <div className="overflow-hidden border border-border bg-background lg:col-span-5">
          <SceneSlot n={1} alt="A student between a dorm bed and a desk clapping once, sound rings drawn as ruled arcs fading toward bare walls, and a specimen tag reading 0.93 s" width={960} height={640} className="h-full object-cover" />
        </div>

        {/* The one primary CTA: DEMO step 2. */}
        <Card className="flex flex-col gap-4 bg-deep p-5 lg:col-span-3">
          <h2 className="text-2xl font-semibold leading-tight">Your room next</h2>
          <ol className="space-y-0 text-sm">
            {["Name the room", "Clap three times", "Save it to the fieldbook"].map((step, i) => (
              <li key={step} className="flex items-baseline gap-3 border-b border-line py-2 last:border-0">
                <span className="font-display text-muted-foreground">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <Button asChild size="lg" className="mt-auto">
            <Link href="/new">Measure your room</Link>
          </Button>
        </Card>

        {/* Measurement quality stamp: expands on hover or focus. The outer div carries the drop entrance. */}
        <div className="lg:col-span-2">
          <motion.div
            layout
            tabIndex={0}
            aria-label={`Clap quality for ${featured.name}`}
            className="flex h-full flex-col items-start justify-center gap-3 border border-border bg-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            whileHover={{ scale: 1.04, rotate: -0.6 }}
            whileFocus={{ scale: 1.04, rotate: -0.6 }}
            onHoverStart={() => setStampOpen(true)}
            onHoverEnd={() => setStampOpen(false)}
            onFocus={() => setStampOpen(true)}
            onBlur={() => setStampOpen(false)}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            <Badge variant="stamp" className="text-ok">
              {featured.claps.valid} of {featured.claps.total} claps valid
            </Badge>
            <p className="text-sm tabular-nums">Noise floor {featured.dynamicRangeDb} dB under the clap.</p>
            <AnimatePresence initial={false}>
              {stampOpen && (
                <motion.p
                  key="more"
                  layout
                  className="text-xs text-muted-foreground"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  A clap with under 30 dB of range is thrown out, so one noisy clap never sets the number.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Speech target: every seeded room on one scale. */}
        <Card className="p-5 lg:col-span-4">
          <h2 className="text-xl font-semibold">The 0.3 to 0.5 s window</h2>
          <div className="mt-4" role="img" aria-label="Mid-band decay of every room in the fieldbook">
            <div className="relative h-10 border border-foreground bg-background">
              <div
                aria-hidden
                className="absolute inset-y-0 border-x border-ok bg-ok/15"
                style={{ left: pct(SPEECH_TARGET.min), width: pct(SPEECH_TARGET.max - SPEECH_TARGET.min) }}
              />
              {mids.map((r) => (
                <span
                  key={r.slug}
                  title={`${r.name}: ${r.mid.toFixed(2)} s`}
                  className={r.mid > SPEECH_TARGET.max ? "absolute inset-y-1 w-0.5 bg-bad" : "absolute inset-y-1 w-0.5 bg-foreground"}
                  style={{ left: pct(r.mid) }}
                />
              ))}
            </div>
            <div aria-hidden className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>0 s</span>
              <span>{(SCALE_MAX / 2).toFixed(1)} s</span>
              <span>{SCALE_MAX} s</span>
            </div>
          </div>
          <p className="mt-3 text-sm">
            {tooLong} of {rooms.length} example rooms ring past it.
          </p>
          <ul className="sr-only">
            {mids.map((r) => (
              <li key={r.slug}>
                {r.name}: {r.mid.toFixed(2)} s
              </li>
            ))}
          </ul>
        </Card>

        {/* The finding that makes the product worth it: duvet vs foam, as two bars. */}
        <Card className="p-5 lg:col-span-8">
          <h2 className="text-xl font-semibold">
            An old duvet beats {foam ? `the $${foam.costUsd} foam pack` : "the foam pack"}.
          </h2>
          <dl className="mt-4 space-y-3">
            {[
              { label: "Duvet on the wall, free", cut: duvetCut, area: duvet?.areaM2, tone: "bg-primary" },
              { label: foam ? `Foam panels, $${foam.costUsd}` : "Foam panels", cut: foamCut, area: foam?.areaM2, tone: "bg-foreground" },
            ].map((row) => (
              <div key={row.label} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[12rem_1fr_7rem]">
                <dt className="text-sm font-semibold">
                  {row.label}
                  {row.area !== undefined && <span className="block text-xs font-normal text-muted-foreground">{row.area} m² covered</span>}
                </dt>
                <dd className="h-4 border border-border bg-background">
                  <div className={`h-full ${row.tone}`} style={{ width: `${(row.cut / cutMax) * 100}%` }} />
                </dd>
                <dd className="text-sm tabular-nums">{row.cut}% less echo</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Predicted mid-band cut, averaged over the example rooms that ring past 0.5 s. Area wins.
          </p>
        </Card>
      </section>
    </MotionConfig>
  );
}
