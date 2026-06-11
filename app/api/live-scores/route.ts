// app/api/live-scores/route.ts — ESPN API, server-cache 5 мин
import { NextResponse } from "next/server"

export const revalidate = 300 // 5 минут серверного кеша

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"

export async function GET() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")

  try {
    const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${today}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return NextResponse.json({ matches: [] })

    const data = await res.json()
    const matches = (data.events ?? []).flatMap((event: {
      id: string
      competitions: [{
        status: { type: { name: string; state: string } }
        competitors: Array<{ homeAway: string; score: string }>
      }]
    }) => {
      const comp = event.competitions[0]
      const state = comp.status.type.state
      const home = comp.competitors.find(c => c.homeAway === "home")
      const away = comp.competitors.find(c => c.homeAway === "away")
      if (!home || !away) return []

      const parseScore = (s: string) => { const n = parseInt(s, 10); return isNaN(n) ? null : n }

      const statusName = comp.status.type.name
      let status = "SCHEDULED"
      if (["STATUS_FULL_TIME", "STATUS_FINAL", "STATUS_FULL_PEN", "STATUS_FULL_ET"].includes(statusName)) status = "FINISHED"
      else if (["STATUS_IN_PROGRESS", "STATUS_EXTRA_TIME", "STATUS_PENALTY", "STATUS_FIRST_HALF", "STATUS_SECOND_HALF"].includes(statusName)) status = "IN_PLAY"
      else if (statusName === "STATUS_HALFTIME") status = "PAUSED"

      return [{
        externalId: parseInt(event.id, 10),
        status,
        homeScore: state !== "pre" ? parseScore(home.score) : null,
        awayScore: state !== "pre" ? parseScore(away.score) : null,
      }]
    })

    return NextResponse.json({ matches })
  } catch {
    return NextResponse.json({ matches: [] })
  }
}
