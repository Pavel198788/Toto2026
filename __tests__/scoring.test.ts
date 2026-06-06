// __tests__/scoring.test.ts
import { describe, it, expect } from "vitest"
import { calculatePoints } from "@/lib/scoring"

describe("calculatePoints — групповой этап", () => {
  it("возвращает 11 за точный счёт", () => {
    expect(calculatePoints({
      stage: "GROUP",
      predictedHome: 2, predictedAway: 1,
      actualHome: 2, actualAway: 1,
    })).toBe(11)
  })

  it("возвращает 10−N за верный исход (пример из спека: 2:1 → 3:0 = 8)", () => {
    expect(calculatePoints({
      stage: "GROUP",
      predictedHome: 2, predictedAway: 1,
      actualHome: 3, actualAway: 0,
    })).toBe(8)
  })

  it("возвращает 0 за неверный исход", () => {
    expect(calculatePoints({
      stage: "GROUP",
      predictedHome: 2, predictedAway: 1,
      actualHome: 1, actualAway: 2,
    })).toBe(0)
  })

  it("считает ничью корректно: 1:1 → 0:0, N=2, итог 8", () => {
    expect(calculatePoints({
      stage: "GROUP",
      predictedHome: 1, predictedAway: 1,
      actualHome: 0, actualAway: 0,
    })).toBe(8)
  })

  it("не уходит в отрицательные очки при большой разнице", () => {
    expect(calculatePoints({
      stage: "GROUP",
      predictedHome: 0, predictedAway: 10,
      actualHome: 0, actualAway: 1,
    })).toBe(1) // 10 - 9 = 1
  })
})

describe("calculatePoints — плей-офф (R16/QUARTERFINAL/SEMIFINAL/THIRD_PLACE)", () => {
  it("возвращает 22 за точный счёт + верный победитель", () => {
    expect(calculatePoints({
      stage: "R16",
      predictedHome: 2, predictedAway: 1,
      actualHome: 2, actualAway: 1,
      predictedWinner: "Germany",
      actualWinner: "Germany",
    })).toBe(22)
  })

  it("возвращает (10−N)+10 за верный исход + верный победитель (не точный счёт)", () => {
    // прогноз 2:0 → результат 3:0, N=1, победитель верный → (10-1)+10=19
    expect(calculatePoints({
      stage: "R16",
      predictedHome: 2, predictedAway: 0,
      actualHome: 3, actualAway: 0,
      predictedWinner: "Germany",
      actualWinner: "Germany",
    })).toBe(19)
  })

  it("возвращает 10 за верный победитель при неверном исходе регл. времени", () => {
    // прогноз 0:1, результат 1:1+пен, победитель Germany верный
    expect(calculatePoints({
      stage: "R16",
      predictedHome: 0, predictedAway: 1,
      actualHome: 1, actualAway: 1,
      predictedWinner: "Germany",
      actualWinner: "Germany",
    })).toBe(10)
  })

  it("возвращает (10−N) за верный исход регл. времени, неверный победитель", () => {
    expect(calculatePoints({
      stage: "QUARTERFINAL",
      predictedHome: 2, predictedAway: 0,
      actualHome: 3, actualAway: 0,
      predictedWinner: "Germany",
      actualWinner: "Brazil",
    })).toBe(9) // (10-1) + 0
  })

  it("возвращает 0 за неверный исход и неверный победитель", () => {
    expect(calculatePoints({
      stage: "SEMIFINAL",
      predictedHome: 2, predictedAway: 0,
      actualHome: 0, actualAway: 2,
      predictedWinner: "Germany",
      actualWinner: "Brazil",
    })).toBe(0)
  })

  it("возвращает (10−N) за точный счёт, но неверный победитель", () => {
    // Exact score but wrong winner: gets outcome points only (N=0), no winner bonus
    expect(calculatePoints({
      stage: "R16",
      predictedHome: 2, predictedAway: 1,
      actualHome: 2, actualAway: 1,
      predictedWinner: "Germany",
      actualWinner: "Brazil",
    })).toBe(10) // (10-0) + 0 winner bonus
  })

  it("THIRD_PLACE обрабатывается как плей-офф: точный счёт + верный победитель = 22", () => {
    expect(calculatePoints({
      stage: "THIRD_PLACE",
      predictedHome: 1, predictedAway: 0,
      actualHome: 1, actualAway: 0,
      predictedWinner: "Croatia",
      actualWinner: "Croatia",
    })).toBe(22)
  })
})

describe("calculatePoints — финал", () => {
  it("возвращает 32 за точный счёт + верный победитель", () => {
    expect(calculatePoints({
      stage: "FINAL",
      predictedHome: 1, predictedAway: 0,
      actualHome: 1, actualAway: 0,
      predictedWinner: "Germany",
      actualWinner: "Germany",
    })).toBe(32)
  })

  it("возвращает (15−N)+15 за верный исход + верный победитель", () => {
    // прогноз 2:0 → 3:0, N=1 → (15-1)+15=29
    expect(calculatePoints({
      stage: "FINAL",
      predictedHome: 2, predictedAway: 0,
      actualHome: 3, actualAway: 0,
      predictedWinner: "Germany",
      actualWinner: "Germany",
    })).toBe(29)
  })

  it("возвращает 15 за только верный победитель (неверный исход)", () => {
    expect(calculatePoints({
      stage: "FINAL",
      predictedHome: 0, predictedAway: 1,
      actualHome: 1, actualAway: 1,
      predictedWinner: "Germany",
      actualWinner: "Germany",
    })).toBe(15)
  })

  it("возвращает 0 за неверный исход и неверный победитель", () => {
    expect(calculatePoints({
      stage: "FINAL",
      predictedHome: 2, predictedAway: 0,
      actualHome: 0, actualAway: 2,
      predictedWinner: "Germany",
      actualWinner: "Brazil",
    })).toBe(0)
  })

  it("возвращает (15−N) за верный исход регл. времени, неверный победитель", () => {
    // outcome correct (N=1), wrong winner: 15-1 = 14
    expect(calculatePoints({
      stage: "FINAL",
      predictedHome: 2, predictedAway: 0,
      actualHome: 3, actualAway: 0,
      predictedWinner: "Germany",
      actualWinner: "Brazil",
    })).toBe(14) // (15-1) + 0
  })
})
