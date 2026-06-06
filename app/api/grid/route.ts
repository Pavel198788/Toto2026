// app/api/grid/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: {
      predictions: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  })

  const result = matches.map((match) => ({
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    stage: match.stage,
    group: match.group,
    kickoff: match.kickoff,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    predictions: match.predictions
      .filter((p) => match.status === "FINISHED" || p.userId === session.user!.id)
      .map((p) => ({
        userId: p.userId,
        userName: p.user.name,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        winner: p.winner,
        points: p.points,
      })),
  }))

  return NextResponse.json(result)
}
