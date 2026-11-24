import type { Metadata } from "next";
import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BAND_LABELS } from "@/lib/acoustics";
import { furnishings } from "@/lib/data";

export const metadata: Metadata = { title: "Method" };

const STEPS = [
  {
    title: "Catch the clap",
    body: "getUserMedia opens the microphone with echo cancellation, noise suppression and auto gain switched off. Seven seconds are recorded, then split into 10 ms frames. A frame that jumps 25 dB above the quietest fifth of the recording, and 6 dB above the frame before it, is a clap onset.",
  },
  {
    title: "Split into octaves",
    body: "An OfflineAudioContext runs the recording through two cascaded bandpass BiquadFilterNodes at 250, 500, 1000, 2000 and 4000 Hz. Each clap gets 1.5 s of tail per band, cut short if the next clap arrives first.",
  },
  {
    title: "Integrate backwards, fit 20 dB",
    body: "The band's noise power (measured just before the clap) is subtracted, then the squared signal is integrated from the end back to the start (Schroeder). A straight line fitted from -5 to -25 dB gives the slope; 60 dB divided by that slope is RT60. We use T20, not T30, because phone microphones rarely give 35 clean decibels.",
  },
  {
    title: "Grade the claps",
    body: "A clap is thrown out if it clipped, if it stood less than 30 dB above the noise, or if the mid bands did not decay cleanly. Three good claps with 40 dB of range earn high confidence. The result is the average of the claps that passed.",
  },
  {
    title: "Solve Sabine both ways",
    body: "RT60 = 0.161 V / A. From your room size and measured decay we recover A, the absorption already there. Each item adds its area times the gap between its coefficient and the average of the surface it covers. Solving forwards gives the new decay per band.",
  },
  {
    title: "Play it back",
    body: "Two impulse responses are built from seeded noise, filtered per octave and faded at each band's decay rate. A ConvolverNode runs the same dry phrase through each. Loudness is matched, so the only thing that changes between A and B is the decay.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-12">
      <section className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="max-w-[68ch]">
          <h1 className="text-4xl font-semibold">How Decaya measures a room</h1>
          <p className="mt-4">
            Students recording podcasts, covers and class presentations in dorm rooms blame the microphone and buy a new one.
            Most of the time the problem is the room: hard floors and bare walls keep every syllable ringing for close to a
            second. Measuring tools exist (Room EQ Wizard wants a measurement mic and a desktop, ClapIR is iOS only), but a
            number alone does not answer the real question: what should I put in this room, and will I hear the difference?
          </p>
          <p className="mt-3 text-muted-foreground">
            Decaya answers both, in a browser tab, with no server and no account. Every step below runs on your device using
            the Web Audio API.
          </p>
        </div>
        <SceneSlot
          n={3}
          alt="A field notebook page with an absorption chart pinned beside a curtain, a folded duvet and a bookshelf, each tagged with a specimen label"
          width={960}
          height={720}
          className="border border-border"
        />
      </section>

      <section aria-labelledby="pipeline">
        <h2 id="pipeline" className="text-3xl font-semibold">
          From clap to curtain
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {STEPS.map((s) => (
            <Card key={s.title} className="decaya-specimen">
              <CardHeader>
                <CardTitle>{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="max-w-[65ch] text-sm leading-6">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="coefficients">
        <h2 id="coefficients" className="text-3xl font-semibold">
          The absorption table
        </h2>
        <p className="mt-2 max-w-[68ch] text-muted-foreground">
          Coefficients from 0 (reflects everything) to 1 (absorbs everything). Duvet, bookshelf and bean bag are our estimates
          and are labelled that way. Prices are what a student actually pays: free for things you own.
        </p>
        <Card className="mt-5 overflow-x-auto">
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
        </Card>
      </section>

      <section aria-labelledby="limits" className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <div className="max-w-[65ch]">
          <h2 id="limits" className="text-3xl font-semibold">
            Where it is rough
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            <li>Sabine assumes a diffuse field. Small, cluttered rooms break that, so every prediction is labelled a prediction.</li>
            <li>Some phones keep voice processing on even when asked not to. Decaya detects it and tells you the number is a lower bound.</li>
            <li>The preview has no early reflections. It is a fair comparison between two states of your room, not a recording of it.</li>
          </ul>
        </div>
        <Card className="decaya-ruled flex flex-col justify-between gap-4 p-6">
          <p className="font-display text-xl leading-snug">
            No sponsor SDK, no API key, no model. Just the Web Audio API that ships in every modern browser.
          </p>
          <Button asChild variant="outline" className="self-start">
            <Link href="/new">Try it on your room</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}
