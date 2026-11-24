import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { coreError } from "@/lib/errors";
import { slugSchema } from "@/lib/schemas";
import type { ApiResponse, Room } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const parsed = slugSchema.safeParse((await params).slug);
  if (!parsed.success) {
    const body: ApiResponse<Room> = {
      ok: false,
      ...coreError("invalid_input", "A room slug uses lowercase letters, digits and hyphens, at most 80 characters."),
    };
    return NextResponse.json(body, { status: 400 });
  }
  const slug = parsed.data;
  const adapter = getAdapter();
  const room = await adapter.getRoom(slug);
  if (!room) {
    const body: ApiResponse<Room> = {
      ok: false,
      ...coreError("not_found", "No seeded room has that slug. Rooms measured in a browser stay in that browser."),
    };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiResponse<Room> = { ok: true, data: room, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
