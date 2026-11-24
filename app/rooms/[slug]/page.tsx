import type { Metadata } from "next";
import Link from "next/link";
import { RoomBench } from "@/components/room-bench";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";
import { getAdapter } from "@/lib/adapter";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const rooms = await getAdapter().listRooms();
  return rooms.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const room = await getAdapter().getRoom(slug);
  return { title: room ? room.name : "Your room" };
}

export default async function RoomPage({ params }: { params: Params }) {
  const { slug } = await params;
  const adapter = getAdapter();
  const [room, furnishings] = await Promise.all([adapter.getRoom(slug), adapter.listFurnishings()]);
  return (
    <div className="space-y-8">
      <Button asChild variant="link" size="sm" className="min-h-11">
        <Link href="/">All rooms in the fieldbook</Link>
      </Button>
      <RoomBench slug={slug} seedRoom={room} furnishings={furnishings} mode={adapter.mode} />
      <figure className="grid items-center gap-6 border-t border-border pt-8 md:grid-cols-[1fr_1.2fr]">
        <figcaption className="max-w-[60ch]">
          <h2 className="text-2xl font-semibold">Why the A/B is fair</h2>
          <p className="mt-2 text-muted-foreground">
            Both clips go through the same seeded noise, the same five octave filters and the same loudness match. Only the
            decay time per band changes, so what you hear is the curtain, not a different recording.
          </p>
        </figcaption>
        <SceneSlot
          n={2}
          alt="Two speech waveforms on ruled paper, the left one smeared by a long echo tail, the right one crisp after a curtain and a duvet are added"
          width={960}
          height={540}
          className="border border-border"
        />
      </figure>
    </div>
  );
}
