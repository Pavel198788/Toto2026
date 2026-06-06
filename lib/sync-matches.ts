// lib/sync-matches.ts
import type { Stage as PrismaStage, MatchStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getTodayMatches, getAllMatches, mapStage, mapStatus, resolveVenueLocation } from "@/lib/football-api"
import { calculatePoints } from "@/lib/scoring"
import { syncToGoogleSheets } from "@/lib/google-sheets"
import { fetchSportsRuVenues } from "@/lib/sports-ru"
import type { Stage } from "@/lib/scoring"

export async function runSync(mode: "today" | "all"): Promise<{ updatedMatches: number }> {
  // Запускаем все внешние запросы параллельно
  const [fdMatches, sportsRuVenues] = await Promise.all([
    mode === "all" ? getAllMatches() : getTodayMatches(),
    fetchSportsRuVenues(),
  ])

  const validMatches = fdMatches.filter(m => m.homeTeam?.name && m.awayTeam?.name)

  // Все upsert-ы параллельно — в 10 раз быстрее чем по одному
  const CHUNK = 10
  let updatedMatches = 0

  for (let i = 0; i < validMatches.length; i += CHUNK) {
    const chunk = validMatches.slice(i, i + CHUNK)
    const results = await Promise.all(chunk.map(async (fdMatch) => {
      const stage = mapStage(fdMatch.stage)
      const status = mapStatus(fdMatch.status)
      const homeScore = fdMatch.score.fullTime.home
      const awayScore = fdMatch.score.fullTime.away

      const fdVenue = resolveVenueLocation(fdMatch.venue)
      const srVenue = sportsRuVenues.get(`${fdMatch.homeTeam.name}|${fdMatch.awayTeam.name}`)
      const venueStr = fdMatch.venue ?? null
      const city = fdVenue.city ?? srVenue?.city ?? null
      const country = fdVenue.country ?? srVenue?.country ?? null

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
          venue: venueStr,
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
          ...(venueStr !== null ? { venue: venueStr } : {}),
          ...(city !== null ? { city } : {}),
          ...(country !== null ? { country } : {}),
        },
      })

      if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
        const predictions = await prisma.prediction.findMany({ where: { matchId: match.id } })
        await Promise.all(predictions.map(pred => {
          const points = calculatePoints({
            stage: stage as Stage,
            predictedHome: pred.homeScore,
            predictedAway: pred.awayScore,
            actualHome: homeScore,
            actualAway: awayScore,
            predictedWinner: pred.winner,
            actualWinner: match.winner,
          })
          return prisma.prediction.update({ where: { id: pred.id }, data: { points } })
        }))
        return true
      }
      return false
    }))
    updatedMatches += results.filter(Boolean).length
  }

  await recalculateBonusPoints()
  syncToGoogleSheets().catch(() => {})

  return { updatedMatches }
}

async function recalculateBonusPoints() {
  const semifinalMatches = await prisma.match.findMany({ where: { stage: "SEMIFINAL" } })
  const semifinalists = new Set(semifinalMatches.flatMap((m) => [m.homeTeam, m.awayTeam]))

  if (semifinalists.size > 0) {
    const preds = await prisma.bonusPrediction.findMany({ where: { type: "SEMIFINAL" } })
    await Promise.all(preds.map(pred =>
      prisma.bonusPrediction.update({
        where: { id: pred.id },
        data: { points: semifinalists.has(pred.team) ? 10 : 0 },
      })
    ))
  }

  const finalMatch = await prisma.match.findFirst({ where: { stage: "FINAL" } })
  if (finalMatch) {
    const finalists = new Set([finalMatch.homeTeam, finalMatch.awayTeam])
    const finalistPreds = await prisma.bonusPrediction.findMany({ where: { type: "FINALIST" } })
    await Promise.all(finalistPreds.map(pred =>
      prisma.bonusPrediction.update({
        where: { id: pred.id },
        data: { points: finalists.has(pred.team) ? 20 : 0 },
      })
    ))
  }

  const finishedFinal = await prisma.match.findFirst({ where: { stage: "FINAL", status: "FINISHED" } })
  if (finishedFinal?.winner) {
    const champion = finishedFinal.winner
    const championPreds = await prisma.bonusPrediction.findMany({ where: { type: "CHAMPION" } })
    await Promise.all(championPreds.map(pred =>
      prisma.bonusPrediction.update({
        where: { id: pred.id },
        data: { points: pred.team === champion ? 40 : 0 },
      })
    ))
  }
}
