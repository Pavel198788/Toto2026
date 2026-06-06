// app/api/admin/trigger-sync/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runSync } from "@/lib/sync-matches"

export const maxDuration = 60

export async function POST() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = await runSync("all")
  return NextResponse.json({ success: true, ...result })
}
