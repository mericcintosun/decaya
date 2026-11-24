"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BandBars } from "@/components/band-bars";
import { SceneSlot } from "@/components/scene-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { joinNames, midRt60, predictRt60, SPEECH_TARGET, VERDICT_LABEL, verdictFor } from "@/lib/acoustics";
import { averageCut, furnishings, rooms, type Room } from "@/lib/data";

const PREVIEW_ITEMS = ["heavy-curtain", "duvet-wall", "area-rug", "foam-panels"];

/** The home composition (ARCHETYPE L4): six unequal cells, no hero paragraph above. */
export function HomeBento({ featured }: { featured: Room }) {
  const [picked, setPicked] = useState<string[]>([]);
  const items = furnishings.filter((f) => picked.includes(f.id));
  const predicted = useMemo(() => predictRt60(featured.measured, featured.dims, items), [featured, items]);
  const before = midRt60(featured.measured);
  const after = midRt60(predicted);
  const verdict = verdictFor(items.length ? after : before);
  const cost = items.reduce((s, i) => s + i.costUsd, 0);

  const missing = rooms.filter((r) => verdictFor(midRt60(r.measured)) !== "speech-ready").length;
  const duvetCut = Math.round(averageCut("duvet-wall") * 100);
  const foamCut = Math.round(averageCut("foam-panels") * 100);

  return (
    <section aria-label="Decaya at a glance" className="decaya-drop-in grid gap-4 lg:auto-rows-[minmax(13rem,auto)] lg:grid-cols-12">
      {/* Largest cell: the claim plus the live product, on a real seeded room. */}
      <Card className="decaya-specimen p-6 lg:col-span-7 lg:row-span-2">
        <h1 className="max-w-[18ch] text-4xl font-semibold leading-[1.05] sm:text-5xl">
          Clap once. Hear your room fixed before you buy a thing.
        </h1>
        <p className="mt-3 max-w-[62ch] text-muted-foreground">
          {featured.owner} clapped three times in {featured.name}. Pick what you would add and watch the decay drop,
          band by band.
        </p>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Items to add">
          {PREVIEW_ITEMS.map((id) => {
            const f = furnishings.find((x) => x.id === id)!;
            const on = picked.includes(id);
            return (
              <Button
                key={id}
                variant="outline"
                size="sm"
                aria-pressed={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== id) : [...p, id]))}
              >
                {f.name} {f.costUsd === 0 ? "(free)" : `$${f.costUsd}`}
              </Button>
            );
          })}
        </div>
        <BandBars className="mt-5" measured={featured.measured} predicted={items.length ? predicted : undefined} />
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Badge variant={verdict === "speech-ready" ? "ok" : verdict === "too-live" ? "bad" : "warn"}>
            {VERDICT_LABEL[verdict]}
          </Badge>
          <p className="text-sm">
            {items.length === 0
              ? `Mid-band decay is ${before.toFixed(2)} s. Speech stays clear under ${SPEECH_TARGET.max} s.`
              : `${before.toFixed(2)} s now, ${after.toFixed(2)} s with ${joinNames(items)}, for $${cost}.`}
          </p>
          <Button asChild variant="link" size="sm" className="ml-auto">
            <Link href={`/rooms/${featured.slug}`}>Listen to the difference</Link>
          </Button>
        </div>
      </Card>

      {/* Pure image cell. */}
      <div className="overflow-hidden border border-border bg-muted lg:col-span-5">
        <SceneSlot
          n={1}
          alt="A student sitting on a dorm bed clapping once while a phone on the desk listens, sound rings drawn as ruled arcs fading toward bare walls"
          width={960}
          height={640}
          className="h-full object-cover"
        />
      </div>

      {/* The one primary CTA. */}
      <Card className="flex flex-col justify-between gap-4 bg-deep p-5 lg:col-span-3">
        <div>
          <h2 className="text-2xl font-semibold leading-tight">Your room next</h2>
          <p className="mt-2 text-sm text-muted-foreground">Three claps, about ten seconds, nothing installed.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/new">Measure your room</Link>
        </Button>
      </Card>

      {/* Measurement quality stamp. */}
      <Card className="flex flex-col items-start justify-center gap-3 p-5 lg:col-span-2">
        <Badge variant="stamp" className="text-ok">
          {featured.claps.valid} of {featured.claps.total} claps valid
        </Badge>
        <p className="text-sm">
          Noise floor {featured.dynamicRangeDb} dB under the clap. Below 30 dB we throw the clap out.
        </p>
      </Card>

      {/* Speech target. */}
      <Card className="decaya-ruled p-5 lg:col-span-4">
        <h2 className="text-xl font-semibold">The 0.3 to 0.5 second window</h2>
        <p className="mt-2 text-sm leading-7">
          A spoken word stays clear when the room forgets it within half a second. {missing} of the {rooms.length} rooms in
          this fieldbook miss that window, most of them dorms and shared spaces with hard floors.
        </p>
      </Card>

      {/* The finding that makes the product worth it. */}
      <Card className="p-5 lg:col-span-8">
        <h2 className="text-xl font-semibold">Old duvet, {duvetCut}% less echo. $79 foam pack, {foamCut}%.</h2>
        <p className="mt-2 max-w-[70ch] text-sm leading-7 text-muted-foreground">
          Averaged over every room here that rings longer than 0.5 s. Twelve foam squares cover about one square meter; a
          duvet hung off the wall covers four. Area wins, and Decaya lets you hear that before you spend anything.
        </p>
      </Card>
    </section>
  );
}
