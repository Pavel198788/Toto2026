// app/api/cron/sync-scores/route.ts
import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { Stage as PrismaStage, MatchStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getTodayMatches, getAllMatches, mapStage, mapStatus, resolveVenueLocation } from "@/lib/football-api"
import { calculatePoints } from "@/lib/scoring"
import { syncToGoogleSheets } from "@/lib/google-sheets"
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
    // Skip matches where teams aren't determined yet (knockout TBD slots)
    if (!fdMatch.homeTeam?.name || !fdMatch.awayTeam?.name) continue

    const stage = mapStage(fdMatch.stage)
    const status = mapStatus(fdMatch.status)
    const homeScore = fdMatch.score.fullTime.home
    const awayScore = fdMatch.score.fullTime.away
    const { city, country } = resolveVenueLocation(fdMatch.venue)

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
        venue: fdMatch.venue ?? null,
        city,
        country,
      },
      update: {
        homeScore,
        awayScore,
        status: status as MatchStatus,
        homeTeam: fdMatch.homeTeam.name,
        awayTeam: fdMatch.awayTeam.name,
        winner,
        venue: fdMatch.venue ?? null,
        city,
        country,
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

  // Recalculate bonus predictions based on known semi/finalists
  await recalculateBonusPoints()

  // Sync to Google Sheets (fire-and-forget, don't block response)
  syncToGoogleSheets().catch(() => {})

  return NextResponse.json({ success: true, updatedMatches })
}

async function recalculateBonusPoints() {
  // Semifinalists = all teams that played in SEMIFINAL stage matches
  const semifinalMatches = await prisma.match.findMany({ where: { stage: "SEMIFINAL" } })
  const semifinalists = new Set(semifinalMatches.flatMap((m) => [m.homeTeam, m.awayTeam]))

  if (semifinalists.size > 0) {
    const preds = await prisma.bonusPrediction.findMany({ where: { type: "SEMIFINAL" } })
    for (const pred of preds) {
      await prisma.bonusPrediction.update({
        where: { id: pred.id },
        data: { points: semifinalists.has(pred.team) ? 8 : 0 },
      })
    }
  }

  // Finalists = teams that played in the FINAL match
  const finalMatch = await prisma.match.findFirst({ where: { stage: "FINAL" } })
  if (finalMatch) {
    const finalists = new Set([finalMatch.homeTeam, finalMatch.awayTeam])
    const finalistPreds = await prisma.bonusPrediction.findMany({ where: { type: "FINALIST" } })
    for (const pred of finalistPreds) {
      await prisma.bonusPrediction.update({
        where: { id: pred.id },
        data: { points: finalists.has(pred.team) ? 15 : 0 },
      })
    }
  }

  // Champion = winner of the FINAL match
  const finishedFinal = await prisma.match.findFirst({
    where: { stage: "FINAL", status: "FINISHED" },
  })
  if (finishedFinal?.winner) {
    const champion = finishedFinal.winner
    const championPreds = await prisma.bonusPrediction.findMany({ where: { type: "CHAMPION" } })
    for (const pred of championPreds) {
      await prisma.bonusPrediction.update({
        where: { id: pred.id },
        data: { points: pred.team === champion ? 30 : 0 },
      })
    }
  }
}
