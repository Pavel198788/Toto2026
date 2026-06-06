// app/api/admin/trigger-sync/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const res = await fetch(
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/cron/sync-scores?mode=all`,
    {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }
  )

  const data = await res.json()
  return NextResponse.json(data)
}
