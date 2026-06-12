// lib/profile-stats.ts

export type RankedUser = {
  id: string
  name: string
  total: number
}

export type RankInfo = {
  rank: number
  total: number
  above: { rank: number; name: string; total: number } | null
  below: { rank: number; name: string; total: number } | null
  pointsToNext: number | null
}

export function calcRank(userId: string, sortedUsers: RankedUser[]): RankInfo {
  const idx = sortedUsers.findIndex(u => u.id === userId)
  if (idx === -1) return { rank: 0, total: 0, above: null, below: null, pointsToNext: null }
  const rank = idx + 1
  const total = sortedUsers[idx].total
  const above = idx > 0
    ? { rank: idx, name: sortedUsers[idx - 1].name, total: sortedUsers[idx - 1].total }
    : null
  const below = idx < sortedUsers.length - 1
    ? { rank: idx + 2, name: sortedUsers[idx + 1].name, total: sortedUsers[idx + 1].total }
    : null
  return { rank, total, above, below, pointsToNext: above ? above.total - total : null }
}

export function calcStreak(
  predictions: Array<{ points: number | null; match: { status: string } }>
): number {
  const finished = predictions.filter(p => p.match.status === "FINISHED")
  let streak = 0
  for (let i = finished.length - 1; i >= 0; i--) {
    if ((finished[i].points ?? 0) > 0) streak++
    else break
  }
  return streak
}

// Assumes groupMatches is sorted by kickoff asc — the order determines tour assignment.
export function buildMatchTourMap(
  groupMatches: Array<{ id: string; group: string | null }>
): Record<string, string> {
  const buckets: Record<string, string[]> = {}
  for (const m of groupMatches) {
    const g = m.group ?? "?"
    if (!buckets[g]) buckets[g] = []
    buckets[g].push(m.id)
  }
  const map: Record<string, string> = {}
  for (const ids of Object.values(buckets)) {
    ids.forEach((id, i) => {
      map[id] = i < 2 ? "tour1" : i < 4 ? "tour2" : "tour3"
    })
  }
  return map
}

export function calcPointsByStage(
  predictions: Array<{ points: number | null; match: { stage: string; id: string } }>,
  matchTourMap: Record<string, string>
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of predictions) {
    if (p.points == null) continue
    const key = p.match.stage === "GROUP"
      ? (matchTourMap[p.match.id] ?? "tour1")
      : p.match.stage
    result[key] = (result[key] ?? 0) + p.points
  }
  return result
}

export type CrossPrediction = {
  userId: string
  matchId: string
  homeScore: number
  awayScore: number
  points: number | null
}

export type TwinInfo = {
  name: string
  rank: number
  matchCount: number
  total: number
}

export function calcTwin(
  userId: string,
  allPredictions: CrossPrediction[],
  sortedUsers: RankedUser[]
): TwinInfo | null {
  const myPreds = allPredictions.filter(p => p.userId === userId)
  if (myPreds.length < 3) return null

  const myMap = new Map(myPreds.map(p => [p.matchId, { h: p.homeScore, a: p.awayScore }]))

  let bestId: string | null = null
  let bestCount = 0

  for (const user of sortedUsers) {
    if (user.id === userId) continue
    const count = allPredictions
      .filter(p => p.userId === user.id)
      .reduce((n, p) => {
        const mine = myMap.get(p.matchId)
        return n + (mine && mine.h === p.homeScore && mine.a === p.awayScore ? 1 : 0)
      }, 0)
    if (count > bestCount) { bestCount = count; bestId = user.id }
  }

  if (!bestId) return null
  const idx = sortedUsers.findIndex(u => u.id === bestId)
  const user = sortedUsers[idx]
  return { name: user.name, rank: idx + 1, matchCount: bestCount, total: user.total }
}

export type ComparisonStats = {
  uniquelyCorrect: number
  missedByOthersGot: number
  rarestMatch: { homeTeam: string; awayTeam: string; sharedCount: number } | null
}

export function calcComparison(
  userId: string,
  allPredictions: CrossPrediction[],
  matches: Array<{ id: string; homeTeam: string; awayTeam: string; status: string }>
): ComparisonStats {
  const EXACT = new Set([12, 25, 35])
  const matchMap = new Map(matches.map(m => [m.id, m]))
  const finishedIds = new Set(matches.filter(m => m.status === "FINISHED").map(m => m.id))

  const myPreds = allPredictions.filter(p => p.userId === userId && finishedIds.has(p.matchId))
  const othersByMatch = new Map<string, CrossPrediction[]>()
  for (const p of allPredictions) {
    if (p.userId === userId || !finishedIds.has(p.matchId)) continue
    if (!othersByMatch.has(p.matchId)) othersByMatch.set(p.matchId, [])
    othersByMatch.get(p.matchId)!.push(p)
  }

  let uniquelyCorrect = 0
  let missedByOthersGot = 0
  let rarestMatch: ComparisonStats["rarestMatch"] = null
  let rarestCount = Infinity

  for (const pred of myPreds) {
    const others = othersByMatch.get(pred.matchId) ?? []
    const pts = pred.points ?? 0

    if (EXACT.has(pts)) {
      const shared = others.filter(o => o.homeScore === pred.homeScore && o.awayScore === pred.awayScore).length
      if (shared === 0) uniquelyCorrect++
      if (shared < rarestCount) {
        rarestCount = shared
        const m = matchMap.get(pred.matchId)
        if (m) rarestMatch = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, sharedCount: shared }
      }
    }

    if (pts === 0 && others.length > 0) {
      const othersCorrect = others.filter(o => (o.points ?? 0) > 0).length
      if (othersCorrect / others.length >= 0.6) missedByOthersGot++
    }
  }

  return { uniquelyCorrect, missedByOthersGot, rarestMatch }
}
