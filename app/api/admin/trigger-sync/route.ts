// app/api/admin/trigger-sync/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/cron/sync-scores?mode=all`,
      {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }
    )
    if (!res.ok) {
      return NextResponse.json({ error: `Sync failed: ${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Sync unreachable" }, { status: 502 })
  }
}
