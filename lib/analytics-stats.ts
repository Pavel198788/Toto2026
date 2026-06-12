// lib/analytics-stats.ts
import { buildMatchTourMap } from "@/lib/profile-stats"

// ── Входные типы (соответствуют Prisma select) ────────────────────────────

export type MatchRow = {
  id: string
  kickoff: Date
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  stage: string
  group: string | null
}

export type PredRow = {
  userId: string
  matchId: string
  homeScore: number
  awayScore: number
  points: number | null
}

export type UserRow = {
  id: string
  name: string | null
}

// ── Секция 1: дельта-карточки гонки ──────────────────────────────────────

export type UserDelta = {
  userId: string
  name: string
  rank: number      // общий рейтинг
  delta: number     // очки за последние n матчей
  maxDelta: number  // максимальная дельта среди всех (для ширины бара)
  isFirst: boolean
  isLast: boolean
}

export function calcRecentDelta(
  matches: MatchRow[],
  predictions: PredRow[],
  users: UserRow[],
  n = 5
): UserDelta[] {
  const sorted = [...matches].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())
  const recentSet = new Set(sorted.slice(-Math.min(n, sorted.length)).map(m => m.id))

  // Общий рейтинг по всем очкам
  const totalByUser = new Map<string, number>()
  for (const p of predictions) {
    totalByUser.set(p.userId, (totalByUser.get(p.userId) ?? 0) + (p.points ?? 0))
  }
  const rankMap = new Map(
    [...users]
      .sort((a, b) => (totalByUser.get(b.id) ?? 0) - (totalByUser.get(a.id) ?? 0))
      .map((u, i) => [u.id, i + 1])
  )

  // Дельта за последние n матчей
  const deltaByUser = new Map<string, number>()
  for (const p of predictions) {
    if (!recentSet.has(p.matchId)) continue
    deltaByUser.set(p.userId, (deltaByUser.get(p.userId) ?? 0) + (p.points ?? 0))
  }

  const entries = users
    .map(u => ({
      userId: u.id,
      name: u.name ?? "?",
      rank: rankMap.get(u.id) ?? users.length,
      delta: deltaByUser.get(u.id) ?? 0,
      maxDelta: 0,
      isFirst: false,
      isLast: false,
    }))
    .sort((a, b) => b.delta - a.delta || a.rank - b.rank)

  const maxDelta = entries[0]?.delta ?? 0
  return entries.map((e, i) => ({
    ...e,
    maxDelta,
    isFirst: i === 0,
    isLast: i === entries.length - 1,
  }))
}

// ── Секция 2: накопленные очки для графика ────────────────────────────────

export type CumulativeEntry = {
  userId: string
  name: string
  points: number[]  // накопленные очки на каждом матче (индекс = порядковый номер матча)
}

export function calcCumulative(
  matches: MatchRow[],
  predictions: PredRow[],
  users: UserRow[]
): CumulativeEntry[] {
  const sorted = [...matches].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())

  // matchId → userId → points
  const predMap = new Map<string, Map<string, number>>()
  for (const p of predictions) {
    if (!predMap.has(p.matchId)) predMap.set(p.matchId, new Map())
    predMap.get(p.matchId)!.set(p.userId, p.points ?? 0)
  }

  return users.map(u => {
    let cum = 0
    const points: number[] = []
    for (const m of sorted) {
      cum += predMap.get(m.id)?.get(u.id) ?? 0
      points.push(cum)
    }
    return { userId: u.id, name: u.name ?? "?", points }
  })
}

// ── Секция 3: горячая рука ────────────────────────────────────────────────

export type HotHandEntry = {
  userId: string
  name: string
  streak: number
  maxStreak: number
  label: string
}

function streakLabel(n: number): string {
  if (n >= 7) return "ОГОНЬ 🔥🔥🔥"
  if (n >= 5) return "В УДАРЕ 🔥🔥"
  if (n >= 3) return "В УДАРЕ ⚡"
  return "Неплохо 👍"
}

export function calcHotHand(
  matches: MatchRow[],
  predictions: PredRow[],
  users: UserRow[]
): HotHandEntry[] {
  const sorted = [...matches].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())

  // matchId → userId → points
  const predMap = new Map<string, Map<string, number>>()
  for (const p of predictions) {
    if (!predMap.has(p.matchId)) predMap.set(p.matchId, new Map())
    predMap.get(p.matchId)!.set(p.userId, p.points ?? 0)
  }

  const entries = users
    .map(u => {
      let streak = 0
      for (let i = sorted.length - 1; i >= 0; i--) {
        const byUser = predMap.get(sorted[i].id)
        if (!byUser?.has(u.id)) break   // нет прогноза — серия прерывается
        if ((byUser.get(u.id) ?? 0) > 0) streak++
        else break
      }
      return {
        userId: u.id,
        name: u.name ?? "?",
        streak,
        maxStreak: 0,
        label: streakLabel(streak),
      }
    })
    .sort((a, b) => b.streak - a.streak)

  const maxStreak = entries[0]?.streak ?? 0
  return entries.map(e => ({ ...e, maxStreak }))
}

// ── Секция 4: самый смелый (контрарианин) ────────────────────────────────

export type ContrarianEntry = {
  userId: string
  name: string
  wins: number
  attempts: number
  pct: number       // процент попаданий среди попыток
  maxWins: number
}

function outcome(h: number, a: number): "P1" | "X" | "P2" {
  return h > a ? "P1" : h < a ? "P2" : "X"
}

export function calcContrarians(
  matches: MatchRow[],
  predictions: PredRow[],
  users: UserRow[]
): ContrarianEntry[] {
  // matchId → все прогнозы
  const matchPreds = new Map<string, PredRow[]>()
  for (const p of predictions) {
    if (!matchPreds.has(p.matchId)) matchPreds.set(p.matchId, [])
    matchPreds.get(p.matchId)!.push(p)
  }

  const winsMap = new Map<string, number>()
  const attemptsMap = new Map<string, number>()

  for (const preds of matchPreds.values()) {
    if (preds.length === 0) continue
    const counts = { P1: 0, X: 0, P2: 0 }
    for (const p of preds) counts[outcome(p.homeScore, p.awayScore)]++

    for (const p of preds) {
      const o = outcome(p.homeScore, p.awayScore)
      const pct = counts[o] / preds.length
      if (pct <= 0.4) {
        attemptsMap.set(p.userId, (attemptsMap.get(p.userId) ?? 0) + 1)
        if ((p.points ?? 0) > 0) {
          winsMap.set(p.userId, (winsMap.get(p.userId) ?? 0) + 1)
        }
      }
    }
  }

  const entries = users
    .map(u => {
      const wins = winsMap.get(u.id) ?? 0
      const attempts = attemptsMap.get(u.id) ?? 0
      return {
        userId: u.id,
        name: u.name ?? "?",
        wins,
        attempts,
        pct: attempts > 0 ? Math.round((wins / attempts) * 100) : 0,
        maxWins: 0,
      }
    })
    .sort((a, b) => b.wins - a.wins || b.pct - a.pct)

  const maxWins = entries[0]?.wins ?? 0
  return entries.map(e => ({ ...e, maxWins }))
}

// ── Секция 5: матч тура ───────────────────────────────────────────────────

export type MatchOfTour = {
  tour: string       // "tour1" | "tour2" | "tour3"
  tourLabel: string  // "ТУР 1" и т.д.
  matchId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  guessedCount: number
  totalCount: number
  exactCount: number
  jackpotNames: string[]
  missedNames: string[]    // первые 2
  missedExtra: number      // остаток
}

const TOUR_LABELS: Record<string, string> = {
  tour1: "ТУР 1",
  tour2: "ТУР 2",
  tour3: "ТУР 3",
}

const EXACT_PTS = new Set([12, 25, 35])

export function calcMatchesOfTour(
  matches: MatchRow[],
  predictions: PredRow[],
  users: UserRow[]
): MatchOfTour[] {
  const nameMap = new Map(users.map(u => [u.id, u.name ?? "?"]))

  const groupMatches = matches
    .filter(m => m.stage === "GROUP")
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())
    .map(m => ({ id: m.id, group: m.group }))

  const tourMap = buildMatchTourMap(groupMatches)

  // matchId → прогнозы
  const predsByMatch = new Map<string, PredRow[]>()
  for (const p of predictions) {
    if (!predsByMatch.has(p.matchId)) predsByMatch.set(p.matchId, [])
    predsByMatch.get(p.matchId)!.push(p)
  }

  // Выбираем лучший матч по spread (max pts - min pts) для каждого тура
  const tourBests = new Map<string, { match: MatchRow; spread: number }>()
  for (const m of matches) {
    const tour = tourMap[m.id]
    if (!tour) continue
    const preds = predsByMatch.get(m.id) ?? []
    if (preds.length === 0) continue
    const pts = preds.map(p => p.points ?? 0)
    const spread = Math.max(...pts) - Math.min(...pts)
    const current = tourBests.get(tour)
    if (!current || spread > current.spread) {
      tourBests.set(tour, { match: m, spread })
    }
  }

  const result: MatchOfTour[] = []
  for (const [tour, { match }] of tourBests) {
    const preds = predsByMatch.get(match.id) ?? []
    if (preds.length === 0) continue
    const maxPts = Math.max(...preds.map(p => p.points ?? 0))
    const jackpotNames = preds
      .filter(p => (p.points ?? 0) === maxPts && maxPts > 0)
      .map(p => nameMap.get(p.userId) ?? "?")
    const missed = preds.filter(p => (p.points ?? 0) === 0)

    result.push({
      tour,
      tourLabel: TOUR_LABELS[tour] ?? tour,
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      guessedCount: preds.filter(p => (p.points ?? 0) > 0).length,
      totalCount: preds.length,
      exactCount: preds.filter(p => EXACT_PTS.has(p.points ?? 0)).length,
      jackpotNames,
      missedNames: missed.slice(0, 2).map(p => nameMap.get(p.userId) ?? "?"),
      missedExtra: Math.max(0, missed.length - 2),
    })
  }

  return result.sort((a, b) => a.tour.localeCompare(b.tour))
}

// ── Секция: близнецы ──────────────────────────────────────────────────────

export type TwinPair = {
  userId1: string
  name1: string
  userId2: string
  name2: string
  commonMatches: number
  sameCount: number
  pct: number
}

function predOutcome(h: number, a: number): "P1" | "X" | "P2" {
  return h > a ? "P1" : h < a ? "P2" : "X"
}

export function calcTwins(
  predictions: PredRow[],
  users: UserRow[],
  minMatches = 3
): TwinPair[] {
  const predMap = new Map<string, Map<string, "P1" | "X" | "P2">>()
  for (const p of predictions) {
    if (!predMap.has(p.matchId)) predMap.set(p.matchId, new Map())
    predMap.get(p.matchId)!.set(p.userId, predOutcome(p.homeScore, p.awayScore))
  }

  const pairs: TwinPair[] = []
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const u1 = users[i]
      const u2 = users[j]
      let common = 0
      let same = 0
      for (const byUser of predMap.values()) {
        const o1 = byUser.get(u1.id)
        const o2 = byUser.get(u2.id)
        if (o1 !== undefined && o2 !== undefined) {
          common++
          if (o1 === o2) same++
        }
      }
      if (common < minMatches) continue
      pairs.push({
        userId1: u1.id,
        name1: u1.name ?? "?",
        userId2: u2.id,
        name2: u2.name ?? "?",
        commonMatches: common,
        sameCount: same,
        pct: Math.round((same / common) * 100),
      })
    }
  }

  return pairs.sort((a, b) => b.pct - a.pct || b.commonMatches - a.commonMatches)
}

// ── Секция: снайпер ───────────────────────────────────────────────────────

// ── Секция: снайпер ───────────────────────────────────────────────────────

export type SniperEntry = {
  userId: string
  name: string
  exactCount: number
  totalFinished: number
  pct: number
  maxCount: number
}

const EXACT_PTS_SET = new Set([12, 25, 35])

export function calcSniper(
  predictions: PredRow[],
  users: UserRow[]
): SniperEntry[] {
  const exactByUser = new Map<string, number>()
  const totalByUser = new Map<string, number>()

  for (const p of predictions) {
    if (p.points === null) continue
    totalByUser.set(p.userId, (totalByUser.get(p.userId) ?? 0) + 1)
    if (EXACT_PTS_SET.has(p.points)) {
      exactByUser.set(p.userId, (exactByUser.get(p.userId) ?? 0) + 1)
    }
  }

  const entries = users
    .map(u => {
      const exactCount = exactByUser.get(u.id) ?? 0
      const totalFinished = totalByUser.get(u.id) ?? 0
      return {
        userId: u.id,
        name: u.name ?? "?",
        exactCount,
        totalFinished,
        pct: totalFinished > 0 ? Math.round(exactCount / totalFinished * 100) : 0,
        maxCount: 0,
      }
    })
    .filter(e => e.exactCount > 0)
    .sort((a, b) => b.exactCount - a.exactCount || b.pct - a.pct)

  const maxCount = entries[0]?.exactCount ?? 0
  return entries.map(e => ({ ...e, maxCount }))
}

// ── Секция: бомбардир ─────────────────────────────────────────────────────

export type BombarderEntry = {
  userId: string
  name: string
  guessedCount: number
  totalFinished: number
  pct: number
  maxCount: number
}

export function calcBombardier(
  predictions: PredRow[],
  users: UserRow[]
): BombarderEntry[] {
  const guessedByUser = new Map<string, number>()
  const totalByUser = new Map<string, number>()

  for (const p of predictions) {
    if (p.points === null) continue
    totalByUser.set(p.userId, (totalByUser.get(p.userId) ?? 0) + 1)
    if ((p.points) > 0) {
      guessedByUser.set(p.userId, (guessedByUser.get(p.userId) ?? 0) + 1)
    }
  }

  const entries = users
    .map(u => {
      const guessedCount = guessedByUser.get(u.id) ?? 0
      const totalFinished = totalByUser.get(u.id) ?? 0
      return {
        userId: u.id,
        name: u.name ?? "?",
        guessedCount,
        totalFinished,
        pct: totalFinished > 0 ? Math.round(guessedCount / totalFinished * 100) : 0,
        maxCount: 0,
      }
    })
    .filter(e => e.guessedCount > 0)
    .sort((a, b) => b.guessedCount - a.guessedCount || b.pct - a.pct)

  const maxCount = entries[0]?.guessedCount ?? 0
  return entries.map(e => ({ ...e, maxCount }))
}
