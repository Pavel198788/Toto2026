// __tests__/bonus-utils.test.ts
import { describe, it, expect } from "vitest"
import { computeBonusPoints } from "@/lib/bonus-utils"

describe("computeBonusPoints", () => {
  it("возвращает null если нет прогнозов", () => {
    expect(computeBonusPoints([])).toBeNull()
  })

  it("возвращает null если все points = null (очки ещё не начислены)", () => {
    expect(computeBonusPoints([
      { points: null },
      { points: null },
      { points: null },
    ])).toBeNull()
  })

  it("суммирует начисленные очки (нули учитываются, null — нет)", () => {
    expect(computeBonusPoints([
      { points: 8 },
      { points: 0 },
      { points: null },
    ])).toBe(8)
  })

  it("суммирует несколько начисленных позиций", () => {
    expect(computeBonusPoints([
      { points: 8 },
      { points: 8 },
      { points: 15 },
      { points: 15 },
      { points: 30 },
    ])).toBe(76)
  })
})
