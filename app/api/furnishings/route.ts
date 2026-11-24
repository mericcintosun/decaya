import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, Furnishing } from "@/lib/types";

export async function GET() {
  const adapter = getAdapter();
  const body: ApiResponse<Furnishing[]> = { ok: true, data: await adapter.listFurnishings(), mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
