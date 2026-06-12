import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { runSync } from "@/lib/sync-matches"

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const result = await runSync("today")
  return NextResponse.json({ ok: true, ...result })
}
