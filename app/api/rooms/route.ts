import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, Room } from "@/lib/types";

export async function GET() {
  const adapter = getAdapter();
  const body: ApiResponse<Room[]> = { ok: true, data: await adapter.listRooms(), mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
