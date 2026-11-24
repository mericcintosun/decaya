import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, Room } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const adapter = getAdapter();
  const room = await adapter.getRoom(slug);
  if (!room) {
    const body: ApiResponse<Room> = {
      ok: false,
      error: {
        code: "not_found",
        message: `No seeded room has the slug "${slug}". Rooms measured in a browser stay in that browser.`,
      },
    };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiResponse<Room> = { ok: true, data: room, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
