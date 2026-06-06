// __tests__/profile-stats.test.ts
import { describe, it, expect } from "vitest"
import {
  calcRank,
  calcStreak,
  buildMatchTourMap,
  calcPointsByStage,
  calcTwin,
  calcComparison,
} from "@/lib/profile-stats"

const USERS = [
  { id: "u1", name: "Алиса", total: 52 },
  { id: "u2", name: "Борис", total: 47 },
  { id: "u3", name: "Вера",  total: 43 },
]

describe("calcRank", () => {
  it("возвращает корректное место и соседей", () => {
    const r = calcRank("u2", USERS)
    expect(r.rank).toBe(2)
    expect(r.total).toBe(47)
    expect(r.above?.name).toBe("Алиса")
    expect(r.below?.name).toBe("Вера")
    expect(r.pointsToNext).toBe(5)
  })

  it("первое место — нет above и нет pointsToNext", () => {
    const r = calcRank("u1", USERS)
    expect(r.rank).toBe(1)
    expect(r.above).toBeNull()
    expect(r.pointsToNext).toBeNull()
  })

  it("последнее место — нет below", () => {
    const r = calcRank("u3", USERS)
    expect(r.rank).toBe(3)
    expect(r.below).toBeNull()
  })
})

describe("calcStreak", () => {
  it("считает подряд с конца", () => {
    const preds = [
      { points: 0,  match: { status: "FINISHED" } },
      { points: 7,  match: { status: "FINISHED" } },
      { points: 11, match: { status: "FINISHED" } },
      { points: 7,  match: { status: "FINISHED" } },
    ]
    expect(calcStreak(preds)).toBe(3)
  })

  it("серия обнуляется при points=0", () => {
    const preds = [
      { points: 11, match: { status: "FINISHED" } },
      { points: 0,  match: { status: "FINISHED" } },
      { points: 7,  match: { status: "FINISHED" } },
    ]
    expect(calcStreak(preds)).toBe(1)
  })

  it("игнорирует незавершённые матчи", () => {
    const preds = [
      { points: 7,  match: { status: "FINISHED" } },
      { points: null, match: { status: "SCHEDULED" } },
    ]
    expect(calcStreak(preds)).toBe(1)
  })

  it("возвращает 0 если нет завершённых", () => {
    const preds = [{ points: null, match: { status: "SCHEDULED" } }]
    expect(calcStreak(preds)).toBe(0)
  })
})

describe("buildMatchTourMap", () => {
  it("первые 2 матча группы = tour1, следующие 2 = tour2, последние 2 = tour3", () => {
    const matches = [
      { id: "m1", group: "GROUP_A" },
      { id: "m2", group: "GROUP_A" },
      { id: "m3", group: "GROUP_A" },
      { id: "m4", group: "GROUP_A" },
      { id: "m5", group: "GROUP_A" },
      { id: "m6", group: "GROUP_A" },
    ]
    const map = buildMatchTourMap(matches)
    expect(map["m1"]).toBe("tour1")
    expect(map["m2"]).toBe("tour1")
    expect(map["m3"]).toBe("tour2")
    expect(map["m4"]).toBe("tour2")
    expect(map["m5"]).toBe("tour3")
    expect(map["m6"]).toBe("tour3")
  })
})

describe("calcPointsByStage", () => {
  it("суммирует очки по этапам", () => {
    const tourMap = { m1: "tour1", m2: "tour2" }
    const preds = [
      { points: 11, match: { stage: "GROUP", id: "m1" } },
      { points: 7,  match: { stage: "GROUP", id: "m1" } },
      { points: 9,  match: { stage: "GROUP", id: "m2" } },
      { points: 22, match: { stage: "R16",   id: "m3" } },
      { points: null, match: { stage: "GROUP", id: "m4" } },
    ]
    const result = calcPointsByStage(preds, tourMap)
    expect(result["tour1"]).toBe(18)
    expect(result["tour2"]).toBe(9)
    expect(result["R16"]).toBe(22)
    expect(result["tour3"]).toBeUndefined()
  })
})

describe("calcTwin", () => {
  it("находит пользователя с наибольшим числом совпадений", () => {
    const allPreds = [
      // Мой прогноз
      { userId: "me", matchId: "m1", homeScore: 2, awayScore: 1, points: 11 },
      { userId: "me", matchId: "m2", homeScore: 0, awayScore: 0, points: 7 },
      { userId: "me", matchId: "m3", homeScore: 1, awayScore: 1, points: 0 },
      // u1 совпадает 2 раза
      { userId: "u1", matchId: "m1", homeScore: 2, awayScore: 1, points: 11 },
      { userId: "u1", matchId: "m2", homeScore: 0, awayScore: 0, points: 7 },
      { userId: "u1", matchId: "m3", homeScore: 2, awayScore: 0, points: 0 },
      // u2 совпадает 1 раз
      { userId: "u2", matchId: "m1", homeScore: 2, awayScore: 1, points: 11 },
      { userId: "u2", matchId: "m2", homeScore: 1, awayScore: 0, points: 0 },
    ]
    const users = [
      { id: "me", name: "Я", total: 18 },
      { id: "u1", name: "Двойник", total: 18 },
      { id: "u2", name: "Другой", total: 11 },
    ]
    const twin = calcTwin("me", allPreds, users)
    expect(twin?.name).toBe("Двойник")
    expect(twin?.matchCount).toBe(2)
  })

  it("возвращает null если прогнозов меньше 3", () => {
    const preds = [
      { userId: "me", matchId: "m1", homeScore: 1, awayScore: 0, points: 11 },
      { userId: "me", matchId: "m2", homeScore: 1, awayScore: 0, points: 11 },
    ]
    expect(calcTwin("me", preds, [{ id: "me", name: "Я", total: 22 }])).toBeNull()
  })
})

describe("calcComparison", () => {
  it("считает уникально угаданные и пропущенные", () => {
    const allPreds = [
      // m1 — я угадал точно (11), никто другой не угадал
      { userId: "me", matchId: "m1", homeScore: 2, awayScore: 1, points: 11 },
      { userId: "u1", matchId: "m1", homeScore: 1, awayScore: 0, points:  0 },
      // m2 — я не угадал (0), другой угадал
      { userId: "me", matchId: "m2", homeScore: 1, awayScore: 0, points: 0 },
      { userId: "u1", matchId: "m2", homeScore: 0, awayScore: 0, points: 7 },
    ]
    const matches = [
      { id: "m1", homeTeam: "Бразилия", awayTeam: "Аргентина", status: "FINISHED" },
      { id: "m2", homeTeam: "Франция",  awayTeam: "Германия",  status: "FINISHED" },
    ]
    const r = calcComparison("me", allPreds, matches)
    expect(r.uniquelyCorrect).toBe(1)
    expect(r.missedByOthersGot).toBe(1)
    expect(r.rarestMatch?.homeTeam).toBe("Бразилия")
  })
})
