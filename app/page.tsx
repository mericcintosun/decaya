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
    <section aria-labelledby="landing-heading" className="mt-14 grid gap-4 border-t border-foreground pt-8 lg:grid-cols-12 lg:items-baseline">
      <h2 id="landing-heading" className="text-3xl font-semibold leading-tight lg:col-span-4">
        It is the room, not the mic
      </h2>
      <div className="space-y-4 lg:col-span-8">
        <p className="max-w-[65ch] leading-7">
          For students who record in a dorm and are about to buy a new microphone. Seed rooms are illustrative examples, not
          measurements we took.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/about">How the measurement works</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
