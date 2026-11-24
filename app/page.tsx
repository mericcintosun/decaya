import { HomeBento } from "@/components/home-bento";
import { RoomExplorer } from "@/components/room-explorer";
import { rooms } from "@/lib/data";

type SearchParams = Promise<{ q?: string; type?: string; verdict?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <>
      <HomeBento featured={rooms[0]} />
      <RoomExplorer
        seedRooms={rooms}
        initialQuery={sp.q ?? ""}
        initialType={sp.type ?? ""}
        initialVerdict={sp.verdict ?? ""}
      />
    </>
  );
}
