import type { Metadata } from "next";
import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BAND_LABELS } from "@/lib/acoustics";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = { title: "Method" };

const STEPS = [
  {
    title: "Catch the clap",
    body: "Three claps are recorded with voice processing off, and a frame that jumps 25 dB over the quiet floor marks each one.",
  },
  {
    title: "Split into octaves",
    body: "An OfflineAudioContext filters every clap into five bands, 250 Hz to 4 kHz, with 1.5 s of tail each.",
  },
  {
    title: "Integrate backwards, fit 20 dB",
    body: "Schroeder integration, then a line from -5 to -25 dB gives RT60 (T20, because phone mics rarely give 35 clean dB).",
  },
  {
    title: "Grade the claps",
    body: "A clap that clipped or stood under 30 dB above the noise is thrown out; the result averages the rest.",
  },
  {
    title: "Solve Sabine both ways",
    body: "RT60 = 0.161 V / A, solved backwards for the absorption already there, then forwards with each item added.",
  },
  {
    title: "Play it back",
    body: "Two impulse responses from the same seeded noise run the same dry phrase through a ConvolverNode at matched loudness.",
  },
];

export default async function AboutPage() {
  const adapter = getAdapter();
  const furnishings = await adapter.listFurnishings();
  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="max-w-[65ch]">
          <h1 className="text-4xl font-semibold">How Decaya measures a room</h1>
          <p className="mt-4 leading-7">
            A number alone does not tell you what to put in a room, so Decaya measures the decay, predicts what an item would
            change, and lets you listen. Every step runs in your browser with the Web Audio API.
          </p>
        </div>
        <SceneSlot n={3} alt="A field notebook page with an absorption chart pinned beside a curtain, a folded duvet and a bookshelf, each tagged with a specimen label" width={960} height={720} className="border border-border" />
      </section>

      <section aria-labelledby="pipeline">
        <h2 id="pipeline" className="text-3xl font-semibold">
          From clap to curtain
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6">{s.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="coefficients">
        <h2 id="coefficients" className="text-3xl font-semibold">
          The absorption table
        </h2>
        <details className="group mt-4 border border-border bg-card">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Show the coefficients per band for all {furnishings.length} items (duvet, bookshelf and bean bag are our estimates)
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-foreground">
                <tr>
                  <th className="p-3 font-semibold">Item</th>
                  <th className="p-3 font-semibold">Area</th>
                  {BAND_LABELS.map((b) => (
                    <th key={b} className="p-3 text-right font-semibold">
                      {b}
                    </th>
                  ))}
                  <th className="p-3 text-right font-semibold">Cost</th>
                  <th className="p-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {furnishings.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-semibold">{f.name}</td>
                    <td className="p-3 tabular-nums">{f.areaM2} m²</td>
                    {f.alpha.map((a, i) => (
                      <td key={i} className="p-3 text-right tabular-nums">
                        {a.toFixed(2)}
                      </td>
                    ))}
                    <td className="p-3 text-right tabular-nums">{f.costUsd === 0 ? "free" : `$${f.costUsd}`}</td>
                    <td className="p-3 text-muted-foreground">{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section aria-labelledby="limits" className="grid items-start gap-8 md:grid-cols-2">
        <div className="max-w-[65ch]">
          <h2 id="limits" className="text-3xl font-semibold">
            Where it is rough
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            <li>Sabine assumes a diffuse field, so every number after an item is added is labelled a prediction.</li>
            <li>Some phones keep voice processing on; Decaya flags it and calls the number a lower bound.</li>
            <li>The preview has no early reflections: a fair A/B of two states, not a recording of your room.</li>
            <li>
              {adapter.mode === "real"
                ? "If the microphone is blocked, the measuring page offers a stored example measurement and labels the saved room as one."
                : "This deploy runs without the microphone: the measuring page loads a stored example and labels it as one."}
            </li>
          </ul>
        </div>
        <figure className="space-y-4">
          <SceneSlot n={6} alt="A pair of headphones resting on a ruled notebook page next to a curtain swatch and a duvet corner, with a specimen tag reading listen first" width={800} height={600} className="border border-border" />
          <figcaption className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-display text-xl">Listen before you buy.</span>
            <Button asChild variant="outline">
              <Link href="/new">Try it on your room</Link>
            </Button>
          </figcaption>
        </figure>
      </section>
    </div>
  );
}
