import type { Metadata } from "next";
import { HomeBento } from "@/components/home-bento";
import { RoomExplorer } from "@/components/room-explorer";
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
