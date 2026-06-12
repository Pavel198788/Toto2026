import { NextResponse } from "next/server"
import { runSync } from "@/lib/sync-matches"

export async function POST() {
  const result = await runSync("today")
  return NextResponse.json({ ok: true, ...result })
}
