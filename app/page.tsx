import type { Metadata } from "next";
import Link from "next/link";
import { HomeBento } from "@/components/home-bento";
import { RoomExplorer } from "@/components/room-explorer";
import { Button } from "@/components/ui/button";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = { title: "Rooms" };

type SearchParams = Promise<{ q?: string; type?: string; verdict?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const adapter = getAdapter();
  const [rooms, furnishings] = await Promise.all([adapter.listRooms(), adapter.listFurnishings()]);
  const featured = rooms[0] ?? null;
  return (
    <>
      {featured && <HomeBento featured={featured} rooms={rooms} furnishings={furnishings} />}
      <Landing />
      <RoomExplorer
        seedRooms={rooms}
        furnishings={furnishings}
        initialQuery={sp.q ?? ""}
        initialType={sp.type ?? ""}
        initialVerdict={sp.verdict ?? ""}
      />
    </>
  );
}

/**
 * The landing section. ARCHETYPE L4 bans a lead paragraph above the grid, so it sits
 * below the bento. Server rendered, no animation, readable with JavaScript off.
 */
function Landing() {
  return (
    <section aria-labelledby="landing-heading" className="mt-14 grid gap-6 border-t border-foreground pt-8 lg:grid-cols-12">
      <h2 id="landing-heading" className="text-3xl font-semibold leading-tight lg:col-span-4">
        What Decaya does, and for whom
      </h2>
      <div className="space-y-4 lg:col-span-8">
        <p className="max-w-[68ch] leading-7">
          Decaya measures how long your room rings from three claps, predicts what a rug, a thick curtain or a duvet on the
          wall would change, and plays the same sentence before and after so you can hear the difference. It all runs in your
          browser tab. Every number after you add an item is a prediction, and the rooms in the fieldbook below are
          illustrative examples, not measurements we took.
        </p>
        <p className="max-w-[68ch] leading-7 text-muted-foreground">
          It is for students who record podcasts, covers or voice homework in a dorm room and are about to buy a new
          microphone. Most of the time the microphone is fine and the room is the problem, and an old duvet may fix it for
          free.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/new">Start with three claps</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/about">See the 90-second path</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
