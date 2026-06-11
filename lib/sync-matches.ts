// lib/sync-matches.ts
import type { Stage as PrismaStage, MatchStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getTodayMatches, getAllMatches, mapStage, mapStatus, resolveVenueLocation } from "@/lib/football-api"
import { calculatePoints } from "@/lib/scoring"
import { syncToGoogleSheets } from "@/lib/google-sheets"
import { fetchSportsRuVenues } from "@/lib/sports-ru"
import type { Stage } from "@/lib/scoring"

// Нормализует название команды для сравнения между football-data.org и api-sports.io
function canonTeam(name: string): string {
  const n = name.trim().toLowerCase()
  if (/korea republic|south korea/.test(n)) return "south-korea"
  if (/korea\s*dpr|north korea/.test(n)) return "north-korea"
  if (/\busa\b|united states/.test(n)) return "usa"
  if (/ivory coast|c[oô]te d.?ivoire/.test(n)) return "ivory-coast"
  if (/\bdr\s+congo\b|congo\s+dr\b/.test(n)) return "dr-congo"
  if (/trinidad/.test(n)) return "trinidad"
  // sstats: "Czech Republic" ↔ DB: "Czechia"
  if (/czechia|czech republic/.test(n)) return "czech-republic"
  // sstats: "Bosnia & Herzegovina" ↔ DB: "Bosnia-Herzegovina"
  if (/bosnia/.test(n)) return "bosnia-herzegovina"
  // sstats: "Türkiye" ↔ DB: "Turkey"
  if (/t[üu]rkiye|turkey/.test(n)) return "turkey"
  return n.replace(/\s+/g, "-")
}

export async function runSync(mode: "today" | "all"): Promise<{ updatedMatches: number }> {
  const [fdMatches, sportsRuVenues] = await Promise.all([
    mode === "all" ? getAllMatches() : getTodayMatches(),
    fetchSportsRuVenues(),
  ])

  const validMatches = fdMatches.filter(m => m.homeTeam?.name && m.awayTeam?.name)

  // Предзагружаем все матчи из БД для быстрого поиска по названиям команд.
  // Это нужно для миграции: у нас в БД football-data.org IDs, а api-sports.io
  // использует свои IDs. Первый синк обновит externalId на AS-IDs через матчинг
  // по canonTeam(homeTeam) + canonTeam(awayTeam) + дата (UTC).
  const dbMatches = await prisma.match.findMany({
    select: { id: true, homeTeam: true, awayTeam: true, kickoff: true, externalId: true },
  })

  // Ключ: "canon_home|canon_away|YYYY-MM-DD"
  const byTeamDate = new Map<string, string>() // → match.id
  for (const m of dbMatches) {
    const dateStr = m.kickoff.toISOString().slice(0, 10)
    const key = `${canonTeam(m.homeTeam)}|${canonTeam(m.awayTeam)}|${dateStr}`
    byTeamDate.set(key, m.id)
  }
  // Ключ: externalId → match.id (для уже мигрированных записей)
  const byExtId = new Map<number, string>()
  for (const m of dbMatches) {
    byExtId.set(m.externalId, m.id)
  }

  const CHUNK = 10
  let updatedMatches = 0

  for (let i = 0; i < validMatches.length; i += CHUNK) {
    const chunk = validMatches.slice(i, i + CHUNK)
    const results = await Promise.all(chunk.map(async (fdMatch) => {
      const stage = mapStage(fdMatch.stage)
      const status = mapStatus(fdMatch.status)
      const homeScore = fdMatch.score.fullTime.home
      const awayScore = fdMatch.score.fullTime.away
      const asExternalId = fdMatch.id // api-sports.io fixture ID (Int)

      const fdVenue = resolveVenueLocation(fdMatch.venue)
      const srVenue = sportsRuVenues.get(`${fdMatch.homeTeam.name}|${fdMatch.awayTeam.name}`)
      const venueStr = fdMatch.venue ?? null
      const city = fdVenue.city ?? srVenue?.city ?? null
      const country = fdVenue.country ?? srVenue?.country ?? null

      let winner: string | null = null
      if (fdMatch.score.winner === "HOME_TEAM") winner = fdMatch.homeTeam.name
      else if (fdMatch.score.winner === "AWAY_TEAM") winner = fdMatch.awayTeam.name

      // Шаг 1: поиск по уже мигрированному externalId (api-sports.io)
      let existingId = byExtId.get(asExternalId)

      // Шаг 2: поиск по canonical имя команды + дата (миграция с FD-IDs)
      if (!existingId) {
        const kickoffDate = fdMatch.utcDate.slice(0, 10)
        const teamKey = `${canonTeam(fdMatch.homeTeam.name)}|${canonTeam(fdMatch.awayTeam.name)}|${kickoffDate}`
        existingId = byTeamDate.get(teamKey)
      }

      let match: { id: string; winner: string | null }

      if (existingId) {
        // Обновляем существующий матч (и обновляем externalId на ESPN-ID при миграции).
        // group НЕ перезаписываем — ESPN не возвращает букву группы, сохраняем из БД.
        match = await prisma.match.update({
          where: { id: existingId },
          data: {
            externalId: asExternalId,
            homeTeam: fdMatch.homeTeam.name,
            awayTeam: fdMatch.awayTeam.name,
            stage: stage as PrismaStage,
            ...(fdMatch.group !== null ? { group: fdMatch.group } : {}),
            kickoff: new Date(fdMatch.utcDate),
            homeScore,
            awayScore,
            status: status as MatchStatus,
            winner,
            ...(venueStr !== null ? { venue: venueStr } : {}),
            ...(city !== null ? { city } : {}),
            ...(country !== null ? { country } : {}),
          },
        })
      } else {
        // Новый матч (стадия плей-офф, не было в БД при старте)
        try {
          match = await prisma.match.create({
            data: {
              externalId: asExternalId,
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
          })
        } catch {
          // Если create упал на unique constraint — значит запись уже появилась
          // в другом чанке параллельно, пропускаем
          return false
        }
      }

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
