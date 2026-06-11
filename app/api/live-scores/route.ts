import { NextResponse } from "next/server"

export const revalidate = 60

interface FDLiveMatch {
  id: number
  status: string
  score: {
    fullTime: { home: number | null; away: number | null }
  }
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return NextResponse.json({ matches: [] })

  const today = new Date().toISOString().split("T")[0]

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/2000/matches?dateFrom=${today}&dateTo=${today}`,
      {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 60 },
      }
    )
    if (!res.ok) return NextResponse.json({ matches: [] })

    const data = await res.json()
    const matches = (data.matches ?? []).map((m: FDLiveMatch) => ({
      externalId: m.id,
      status: m.status,
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
    }))

    return NextResponse.json({ matches })
  } catch {
    return NextResponse.json({ matches: [] })
  }
}
