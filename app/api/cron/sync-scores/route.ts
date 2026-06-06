// app/api/cron/sync-scores/route.ts
import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { Stage as PrismaStage, MatchStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getTodayMatches, getAllMatches, mapStage, mapStatus } from "@/lib/football-api"
import { calculatePoints } from "@/lib/scoring"
import type { Stage } from "@/lib/scoring"

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

  const mode = req.nextUrl.searchParams.get("mode") ?? "today"
  const fdMatches = mode === "all" ? await getAllMatches() : await getTodayMatches()

  let updatedMatches = 0

  for (const fdMatch of fdMatches) {
    const stage = mapStage(fdMatch.stage)
    const status = mapStatus(fdMatch.status)
    const homeScore = fdMatch.score.fullTime.home
    const awayScore = fdMatch.score.fullTime.away

    let winner: string | null = null
    if (fdMatch.score.winner === "HOME_TEAM") winner = fdMatch.homeTeam.name
    else if (fdMatch.score.winner === "AWAY_TEAM") winner = fdMatch.awayTeam.name

    const match = await prisma.match.upsert({
      where: { externalId: fdMatch.id },
      create: {
        externalId: fdMatch.id,
        homeTeam: fdMatch.homeTeam.name,
        awayTeam: fdMatch.awayTeam.name,
        stage: stage as PrismaStage,
        group: fdMatch.group ?? null,
        kickoff: new Date(fdMatch.utcDate),
        homeScore,
        awayScore,
        status: status as MatchStatus,
        winner,
      },
      update: {
        homeScore,
        awayScore,
        status: status as MatchStatus,
        homeTeam: fdMatch.homeTeam.name,
        awayTeam: fdMatch.awayTeam.name,
        winner,
      },
    })

    if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
      const predictions = await prisma.prediction.findMany({
        where: { matchId: match.id },
      })

      for (const pred of predictions) {
        const points = calculatePoints({
          stage: stage as Stage,
          predictedHome: pred.homeScore,
          predictedAway: pred.awayScore,
          actualHome: homeScore,
          actualAway: awayScore,
          predictedWinner: pred.winner,
          actualWinner: match.winner,
        })
        await prisma.prediction.update({
          where: { id: pred.id },
          data: { points },
        })
      }

      updatedMatches++
    }
  }

  return NextResponse.json({ success: true, updatedMatches })
}
