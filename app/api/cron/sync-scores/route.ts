// app/api/cron/sync-scores/route.ts
import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { runSync } from "@/lib/sync-matches"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`
  const isValidSecret =
    authHeader != null &&
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  if (!isValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mode = req.nextUrl.searchParams.get("mode") === "all" ? "all" : "today"
  const result = await runSync(mode)
  return NextResponse.json({ success: true, ...result })
}
