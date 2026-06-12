// app/api/live-scores/route.ts — sstats.net API, server-cache 60 сек
import { NextResponse } from "next/server"

export const revalidate = 60

function sstatsStatus(code: number): string {
  if (code === 8) return "FINISHED"
  if (code === 5) return "PAUSED"
  if ([3, 4, 6, 7].includes(code)) return "IN_PLAY"
  if (code === 9) return "POSTPONED"
  return "SCHEDULED"
}

export async function GET() {
  try {
    const res = await fetch("https://api.sstats.net/games/list?LeagueId=1&today=true", {
      next: { revalidate: 60 },
    })
    if (!res.ok) return NextResponse.json({ matches: [] })

    const data = await res.json()
    const matches = (data.data ?? []).map((g: {
      id: number
      date: string
      status: number
      homeResult: number | null
      awayResult: number | null
      homeFTResult: number | null
      awayFTResult: number | null
    }) => {
      const status = sstatsStatus(g.status)
      const isStarted = status !== "SCHEDULED"
      const homeScore = isStarted ? (status === "FINISHED" ? g.homeFTResult : g.homeResult) : null
      const awayScore = isStarted ? (status === "FINISHED" ? g.awayFTResult : g.awayResult) : null
      return { externalId: g.id, utcDate: g.date, status, homeScore, awayScore }
    })

    return NextResponse.json({ matches })
  } catch {
    return NextResponse.json({ matches: [] })
  }
}
