// __tests__/analytics-stats.test.ts
import { describe, it, expect } from "vitest"
import {
  calcRecentDelta,
  calcCumulative,
  calcHotHand,
  calcContrarians,
  calcMatchesOfTour,
  type MatchRow,
  type PredRow,
  type UserRow,
} from "@/lib/analytics-stats"

// ── Фикстуры ──────────────────────────────────────────────────────────────

const USERS: UserRow[] = [
  { id: "u1", name: "Алиса" },
  { id: "u2", name: "Борис" },
  { id: "u3", name: "Вера" },
]

function makeMatch(id: string, offset: number, extra: Partial<MatchRow> = {}): MatchRow {
  return {
    id,
    kickoff: new Date(2026, 5, 11 + offset),
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 1,
    awayScore: 0,
    stage: "GROUP",
    group: "GROUP_A",
    ...extra,
  }
}

function makePred(userId: string, matchId: string, points: number, homeScore = 1, awayScore = 0): PredRow {
  return { userId, matchId, homeScore, awayScore, points }
}

// ── calcRecentDelta ───────────────────────────────────────────────────────

describe("calcRecentDelta", () => {
  const matches = [
    makeMatch("m1", 0),
    makeMatch("m2", 1),
    makeMatch("m3", 2),
    makeMatch("m4", 3),
    makeMatch("m5", 4),
    makeMatch("m6", 5),
  ]

  it("берёт последние n матчей и считает дельту", () => {
    const predictions: PredRow[] = [
      makePred("u1", "m2", 7),   // в окне n=5 (последние 5 из 6: m2-m6)
      makePred("u1", "m3", 12),  // в окне
      makePred("u1", "m4", 7),
      makePred("u1", "m5", 0),
      makePred("u1", "m6", 12),
      makePred("u2", "m3", 0),
      makePred("u2", "m6", 7),
    ]
    const result = calcRecentDelta(matches, predictions, [USERS[0], USERS[1]], 5)
    const alice = result.find(e => e.userId === "u1")!
    const boris = result.find(e => e.userId === "u2")!
    expect(alice.delta).toBe(38)   // 7+12+7+0+12 = 38 (m2-m6 все в окне)
    expect(boris.delta).toBe(7)    // только m6
  })

  it("первый в списке isFirst=true, последний isLast=true", () => {
    const predictions = [
      makePred("u1", "m6", 12),
      makePred("u2", "m6", 0),
    ]
    const result = calcRecentDelta([makeMatch("m6", 0)], predictions, [USERS[0], USERS[1]])
    expect(result[0].isFirst).toBe(true)
    expect(result[result.length - 1].isLast).toBe(true)
  })

  it("maxDelta одинаков для всех записей", () => {
    const predictions = [
      makePred("u1", "m1", 12),
      makePred("u2", "m1", 7),
      makePred("u3", "m1", 0),
    ]
    const result = calcRecentDelta([makeMatch("m1", 0)], predictions, USERS)
    const maxDeltas = result.map(e => e.maxDelta)
    expect(new Set(maxDeltas).size).toBe(1)
    expect(maxDeltas[0]).toBe(12)
  })
})

// ── calcCumulative ────────────────────────────────────────────────────────

describe("calcCumulative", () => {
  it("накапливает очки по матчам в хронологическом порядке", () => {
    const matches = [makeMatch("m1", 0), makeMatch("m2", 1), makeMatch("m3", 2)]
    const predictions: PredRow[] = [
      makePred("u1", "m1", 7),
      makePred("u1", "m3", 12),
      makePred("u2", "m2", 11),
    ]
    const result = calcCumulative(matches, predictions, USERS)
    const alice = result.find(e => e.userId === "u1")!
    const boris = result.find(e => e.userId === "u2")!
    expect(alice.points).toEqual([7, 7, 19])   // m1=7, m2=0, m3=12
    expect(boris.points).toEqual([0, 11, 11])  // m1=0, m2=11, m3=0
  })

  it("длина массива points равна количеству матчей", () => {
    const matches = [makeMatch("m1", 0), makeMatch("m2", 1)]
    const result = calcCumulative(matches, [], [USERS[0]])
    expect(result[0].points).toHaveLength(2)
    expect(result[0].points).toEqual([0, 0])
  })
})

// ── calcHotHand ───────────────────────────────────────────────────────────

describe("calcHotHand", () => {
  it("считает серию с конца", () => {
    const matches = [makeMatch("m1", 0), makeMatch("m2", 1), makeMatch("m3", 2)]
    const predictions: PredRow[] = [
      makePred("u1", "m1", 0),
      makePred("u1", "m2", 7),
      makePred("u1", "m3", 12),
      makePred("u2", "m1", 7),
      makePred("u2", "m2", 7),
      makePred("u2", "m3", 0),
    ]
    const result = calcHotHand(matches, predictions, [USERS[0], USERS[1]])
    const alice = result.find(e => e.userId === "u1")!
    const boris = result.find(e => e.userId === "u2")!
    expect(alice.streak).toBe(2)
    expect(boris.streak).toBe(0)
  })

  it("серия прерывается при отсутствии прогноза", () => {
    const matches = [makeMatch("m1", 0), makeMatch("m2", 1), makeMatch("m3", 2)]
    const predictions: PredRow[] = [
      makePred("u1", "m1", 7),
      // m2 — нет прогноза
      makePred("u1", "m3", 7),
    ]
    const result = calcHotHand(matches, predictions, [USERS[0]])
    expect(result[0].streak).toBe(1)  // только m3 (m2 прерывает)
  })

  it("label зависит от длины серии", () => {
    const matches = Array.from({ length: 8 }, (_, i) => makeMatch(`m${i}`, i))
    const predictions = matches.map(m => makePred("u1", m.id, 7))
    const result = calcHotHand(matches, predictions, [USERS[0]])
    expect(result[0].label).toContain("ОГОНЬ")
  })

  it("maxStreak одинаков для всех", () => {
    const matches = [makeMatch("m1", 0)]
    const predictions = [makePred("u1", "m1", 7), makePred("u2", "m1", 0)]
    const result = calcHotHand(matches, predictions, [USERS[0], USERS[1]])
    expect(result.every(e => e.maxStreak === 1)).toBe(true)
  })
})

// ── calcContrarians ───────────────────────────────────────────────────────

describe("calcContrarians", () => {
  it("засчитывает contrarian win если ставил против большинства и угадал", () => {
    // u1, u2, u3 поставили П1; u4 поставил X (25% ≤ 40%) и набрал очки
    const u4: UserRow = { id: "u4", name: "Гриша" }
    const match = makeMatch("m1", 0, { homeScore: 0, awayScore: 0 })
    const predictions: PredRow[] = [
      { userId: "u1", matchId: "m1", homeScore: 1, awayScore: 0, points: 0 },
      { userId: "u2", matchId: "m1", homeScore: 1, awayScore: 0, points: 0 },
      { userId: "u3", matchId: "m1", homeScore: 1, awayScore: 0, points: 0 },
      { userId: "u4", matchId: "m1", homeScore: 0, awayScore: 0, points: 7 },
    ]
    const result = calcContrarians([match], predictions, [...USERS, u4])
    const grischa = result.find(e => e.userId === "u4")!
    expect(grischa.wins).toBe(1)
    expect(grischa.attempts).toBe(1)
    expect(grischa.pct).toBe(100)
  })

  it("не считает как contrarian если ≥41% поставили тот же исход", () => {
    // u1, u2 поставили П1 (2/4 = 50% > 40%)
    const match = makeMatch("m1", 0)
    const predictions: PredRow[] = [
      { userId: "u1", matchId: "m1", homeScore: 1, awayScore: 0, points: 7 },
      { userId: "u2", matchId: "m1", homeScore: 1, awayScore: 0, points: 7 },
      { userId: "u3", matchId: "m1", homeScore: 0, awayScore: 1, points: 0 },
      { userId: "u4", matchId: "m1", homeScore: 0, awayScore: 1, points: 0 },
    ]
    const u4: UserRow = { id: "u4", name: "Гриша" }
    const result = calcContrarians([match], predictions, [...USERS, u4])
    expect(result.every(e => e.wins === 0)).toBe(true)
  })
})

// ── calcMatchesOfTour ─────────────────────────────────────────────────────

describe("calcMatchesOfTour", () => {
  // GROUP_A: m1,m2 = tour1; m3,m4 = tour2; m5,m6 = tour3
  const groupMatches: MatchRow[] = [
    makeMatch("m1", 0), makeMatch("m2", 1),
    makeMatch("m3", 2), makeMatch("m4", 3),
    makeMatch("m5", 4), makeMatch("m6", 5),
  ]

  it("выбирает матч с наибольшим spread очков", () => {
    const predictions: PredRow[] = [
      // tour1: m1 — spread = 12-0=12; m2 — spread = 7-7=0
      makePred("u1", "m1", 12), makePred("u2", "m1", 0), makePred("u3", "m1", 0),
      makePred("u1", "m2", 7),  makePred("u2", "m2", 7),
      // tour2 остальные
      makePred("u1", "m3", 7),  makePred("u2", "m3", 0),
    ]
    const result = calcMatchesOfTour(groupMatches, predictions, USERS)
    const tour1 = result.find(r => r.tour === "tour1")!
    expect(tour1.matchId).toBe("m1")
  })

  it("jackpotNames содержит участников с максимальными очками", () => {
    const predictions: PredRow[] = [
      makePred("u1", "m1", 12),
      makePred("u2", "m1", 12),
      makePred("u3", "m1", 0),
    ]
    const result = calcMatchesOfTour([groupMatches[0]], predictions, USERS)
    const tour1 = result.find(r => r.tour === "tour1")!
    expect(tour1.jackpotNames).toContain("Алиса")
    expect(tour1.jackpotNames).toContain("Борис")
    expect(tour1.jackpotNames).not.toContain("Вера")
  })

  it("missedExtra = кол-во промахнувшихся минус 2", () => {
    const predictions: PredRow[] = [
      makePred("u1", "m1", 12),
      makePred("u2", "m1", 0),
      makePred("u3", "m1", 0),
    ]
    const result = calcMatchesOfTour([groupMatches[0]], predictions, USERS)
    const tour1 = result.find(r => r.tour === "tour1")!
    expect(tour1.missedNames).toHaveLength(2)
    expect(tour1.missedExtra).toBe(0)
  })
})
