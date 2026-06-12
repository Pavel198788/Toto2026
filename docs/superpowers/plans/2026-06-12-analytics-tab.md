# Analytics Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить вкладку `/analytics` с 5 секциями групповой аналитики: дельта-карточки гонки, SVG-график накопленных очков, горячая рука, самый смелый контрарианин, матч тура.

**Architecture:** Server Component (`app/analytics/page.tsx`) делает один Prisma-запрос и передаёт данные UI-компонентам. Вся вычислительная логика изолирована в `lib/analytics-stats.ts` (чистые функции, покрыты тестами). SVG-график выделен в `components/analytics-race-chart.tsx` как Client Component (нужен hover).

**Tech Stack:** Next.js 16 App Router, Prisma, Tailwind CSS 4, Vitest, SVG (без внешних chart-библиотек).

---

## File Map

| Файл | Действие | Ответственность |
|------|----------|----------------|
| `components/nav-tabs.tsx` | Modify | Добавить вкладку АНАЛИТИКА |
| `lib/analytics-stats.ts` | Create | Чистые функции вычисления данных для всех 5 секций |
| `__tests__/analytics-stats.test.ts` | Create | Тесты всех функций из analytics-stats.ts |
| `components/analytics-race-chart.tsx` | Create | Client Component — SVG-график с hover |
| `app/analytics/page.tsx` | Create | Server Component — страница с 5 секциями |

---

## Task 1: Добавить вкладку АНАЛИТИКА в навигацию

**Files:**
- Modify: `components/nav-tabs.tsx`

- [ ] **Step 1: Открыть `components/nav-tabs.tsx` и добавить вкладку**

Найти массив `TABS` и вставить вкладку АНАЛИТИКА после РЕЙТИНГ:

```ts
const TABS = [
  { href: "/matches", label: "МАТЧИ" },
  { href: "/leaderboard", label: "РЕЙТИНГ" },
  { href: "/analytics", label: "АНАЛИТИКА" },   // ← добавить
  { href: "/profile", label: "ПРОФИЛЬ" },
  { href: "/standings", label: "ГРУППЫ" },
  { href: "/grid", label: "СЕТКА" },
  { href: "/bonus", label: "БОНУС" },
  { href: "/rules", label: "ПРАВИЛА" },
]
```

- [ ] **Step 2: Убедиться, что файл компилируется**

```bash
cd /Users/nichegosebe/toto-2026 && npx tsc --noEmit 2>&1 | head -20
```

Ожидаемый результат: нет ошибок (или только ошибки не связанные с nav-tabs).

- [ ] **Step 3: Коммит**

```bash
cd /Users/nichegosebe/toto-2026 && git add components/nav-tabs.tsx && git commit -m "feat(analytics): add АНАЛИТИКА nav tab"
```

---

## Task 2: Создать `lib/analytics-stats.ts`

**Files:**
- Create: `lib/analytics-stats.ts`

- [ ] **Step 1: Создать файл с типами и пятью функциями**

```ts
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
```

- [ ] **Step 2: Проверить компиляцию**

```bash
cd /Users/nichegosebe/toto-2026 && npx tsc --noEmit 2>&1 | head -30
```

Ожидаемый результат: нет ошибок в `lib/analytics-stats.ts`.

- [ ] **Step 3: Коммит**

```bash
cd /Users/nichegosebe/toto-2026 && git add lib/analytics-stats.ts && git commit -m "feat(analytics): pure computation functions for 5 analytics sections"
```

---

## Task 3: Написать тесты для `lib/analytics-stats.ts`

**Files:**
- Create: `__tests__/analytics-stats.test.ts`

- [ ] **Step 1: Создать тестовый файл**

```ts
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
      makePred("u1", "m2", 7),   // вне окна n=5
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
    expect(alice.delta).toBe(31)   // 12+7+0+12 = 31 (m2 — вне окна)
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
```

- [ ] **Step 2: Запустить тесты и убедиться что все зелёные**

```bash
cd /Users/nichegosebe/toto-2026 && npx vitest run __tests__/analytics-stats.test.ts --reporter=verbose 2>&1
```

Ожидаемый результат: все тесты PASS. Если падают — исправить функции в `lib/analytics-stats.ts` до зелёного.

- [ ] **Step 3: Коммит**

```bash
cd /Users/nichegosebe/toto-2026 && git add __tests__/analytics-stats.test.ts lib/analytics-stats.ts && git commit -m "test(analytics): vitest coverage for all 5 analytics functions"
```

---

## Task 4: Создать SVG-график `components/analytics-race-chart.tsx`

**Files:**
- Create: `components/analytics-race-chart.tsx`

- [ ] **Step 1: Создать файл**

```tsx
// components/analytics-race-chart.tsx
"use client"

import { useState } from "react"
import type { CumulativeEntry } from "@/lib/analytics-stats"

interface Props {
  series: CumulativeEntry[]
  matchCount: number
  tourBoundaries: number[]  // индексы матчей, с которых начинается новый тур
  leaderUserId: string
}

const STEP = 14          // пикселей на матч
const LEFT_PAD = 8
const RIGHT_PAD = 88     // место для подписей имён
const TOP_PAD = 10
const BOTTOM_PAD = 24
const CHART_HEIGHT = 160

const PALETTE = [
  "#facc15",  // жёлтый — лидер
  "#4ade80",  // зелёный
  "#60a5fa",  // синий
  "#f97316",  // оранжевый
  "#a78bfa",  // фиолетовый
  "#f472b6",  // розовый
  "#34d399",  // изумрудный
  "#fb923c",
  "#818cf8",
  "#2dd4bf",
  "#e879f9",
  "#a3e635",
  "#f87171",
  "#94a3b8",
]

export function AnalyticsRaceChart({ series, matchCount, tourBoundaries, leaderUserId }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (matchCount === 0 || series.length === 0) return null

  const svgW = LEFT_PAD + matchCount * STEP + RIGHT_PAD
  const svgH = TOP_PAD + CHART_HEIGHT + BOTTOM_PAD
  const plotH = CHART_HEIGHT

  const maxPoints = Math.max(...series.map(s => s.points[matchCount - 1] ?? 0), 1)

  function xOf(i: number) {
    return LEFT_PAD + i * STEP
  }
  function yOf(pts: number) {
    return TOP_PAD + plotH - (pts / maxPoints) * plotH
  }

  // Сортируем: лидер первым, затем по убыванию итогового счёта
  const sorted = [...series].sort((a, b) => {
    if (a.userId === leaderUserId) return -1
    if (b.userId === leaderUserId) return 1
    return (b.points[matchCount - 1] ?? 0) - (a.points[matchCount - 1] ?? 0)
  })

  function polylinePoints(pts: number[]) {
    return pts.map((p, i) => `${xOf(i)},${yOf(p)}`).join(" ")
  }

  function colorOf(userId: string, rankIdx: number) {
    return userId === leaderUserId ? PALETTE[0] : PALETTE[Math.min(rankIdx, PALETTE.length - 1)]
  }

  const TOP5_IDS = new Set(sorted.slice(0, 5).map(s => s.userId))

  // Tooltip data
  const tooltipEntries =
    hoverIndex !== null
      ? sorted
          .slice(0, 5)
          .map(s => ({ name: s.name, pts: s.points[hoverIndex] ?? 0 }))
          .sort((a, b) => b.pts - a.pts)
      : []

  return (
    <div className="relative">
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <svg
          width={svgW}
          height={svgH}
          style={{ display: "block" }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="leader-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Разделители туров */}
          {tourBoundaries.map(bi => (
            <line
              key={bi}
              x1={xOf(bi)}
              y1={TOP_PAD}
              x2={xOf(bi)}
              y2={TOP_PAD + plotH}
              stroke="#2a2000"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ))}

          {/* Подписи туров */}
          {tourBoundaries.map((bi, i) => {
            const label = `ТУР ${i + 2}`
            return (
              <text
                key={label}
                x={xOf(bi) + 3}
                y={TOP_PAD + plotH + 14}
                fill="#5a4500"
                fontSize={8}
                fontFamily="monospace"
              >
                {label}
              </text>
            )
          })}
          <text
            x={LEFT_PAD}
            y={TOP_PAD + plotH + 14}
            fill="#5a4500"
            fontSize={8}
            fontFamily="monospace"
          >
            ТУР 1
          </text>

          {/* Серые линии (не топ-5) */}
          {sorted.map((s, rankIdx) =>
            !TOP5_IDS.has(s.userId) ? (
              <polyline
                key={s.userId}
                points={polylinePoints(s.points)}
                fill="none"
                stroke="#374151"
                strokeWidth={0.8}
                opacity={0.4}
              />
            ) : null
          )}

          {/* Заливка под лидером */}
          {(() => {
            const leader = sorted.find(s => s.userId === leaderUserId)
            if (!leader) return null
            const pts = leader.points
            const topPoints = pts.map((p, i) => `${xOf(i)},${yOf(p)}`).join(" ")
            const bottomRight = `${xOf(matchCount - 1)},${TOP_PAD + plotH}`
            const bottomLeft = `${xOf(0)},${TOP_PAD + plotH}`
            return (
              <polygon
                points={`${topPoints} ${bottomRight} ${bottomLeft}`}
                fill="url(#leader-fill)"
              />
            )
          })()}

          {/* Цветные линии топ-5 (кроме лидера) */}
          {sorted.map((s, rankIdx) =>
            TOP5_IDS.has(s.userId) && s.userId !== leaderUserId ? (
              <polyline
                key={s.userId}
                points={polylinePoints(s.points)}
                fill="none"
                stroke={colorOf(s.userId, rankIdx)}
                strokeWidth={1.5}
              />
            ) : null
          )}

          {/* Линия лидера поверх всех */}
          {(() => {
            const leader = sorted.find(s => s.userId === leaderUserId)
            if (!leader) return null
            return (
              <polyline
                points={polylinePoints(leader.points)}
                fill="none"
                stroke="#facc15"
                strokeWidth={2.5}
              />
            )
          })()}

          {/* Подписи имён справа у конца линии (топ-5) */}
          {sorted.slice(0, 5).map((s, rankIdx) => {
            const lastPts = s.points[matchCount - 1] ?? 0
            const y = yOf(lastPts)
            return (
              <text
                key={s.userId}
                x={xOf(matchCount - 1) + 5}
                y={Math.max(TOP_PAD + 8, Math.min(TOP_PAD + plotH - 2, y + 3))}
                fill={colorOf(s.userId, rankIdx)}
                fontSize={9}
                fontFamily="monospace"
              >
                {s.name.split(" ")[0]}
              </text>
            )
          })}

          {/* Вертикальная линия hover */}
          {hoverIndex !== null && (
            <line
              x1={xOf(hoverIndex)}
              y1={TOP_PAD}
              x2={xOf(hoverIndex)}
              y2={TOP_PAD + plotH}
              stroke="#facc1540"
              strokeWidth={1}
            />
          )}

          {/* Hit-areas для hover (невидимые rect на каждый матч) */}
          {Array.from({ length: matchCount }, (_, i) => (
            <rect
              key={i}
              x={LEFT_PAD + i * STEP - STEP / 2}
              y={TOP_PAD}
              width={STEP}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {hoverIndex !== null && tooltipEntries.length > 0 && (
        <div className="absolute left-2 top-1 bg-[#0d0d0d] border border-[#2a2000] rounded-sm px-2 py-1.5 pointer-events-none z-10">
          {tooltipEntries.map(e => (
            <div key={e.name} className="flex gap-3 text-xs">
              <span className="text-gray-400 w-20 truncate">{e.name.split(" ")[0]}</span>
              <span className="text-yellow-400 font-bold">{e.pts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Проверить компиляцию**

```bash
cd /Users/nichegosebe/toto-2026 && npx tsc --noEmit 2>&1 | head -30
```

Ожидаемый результат: нет новых ошибок.

- [ ] **Step 3: Коммит**

```bash
cd /Users/nichegosebe/toto-2026 && git add components/analytics-race-chart.tsx && git commit -m "feat(analytics): SVG race chart with hover tooltips"
```

---

## Task 5: Создать страницу `app/analytics/page.tsx`

**Files:**
- Create: `app/analytics/page.tsx`

- [ ] **Step 1: Создать директорию и файл**

```bash
mkdir -p /Users/nichegosebe/toto-2026/app/analytics
```

- [ ] **Step 2: Написать Server Component**

```tsx
// app/analytics/page.tsx
import { prisma } from "@/lib/db"
import { teamFlag } from "@/lib/flags"
import { buildMatchTourMap } from "@/lib/profile-stats"
import {
  calcRecentDelta,
  calcCumulative,
  calcHotHand,
  calcContrarians,
  calcMatchesOfTour,
} from "@/lib/analytics-stats"
import { AnalyticsRaceChart } from "@/components/analytics-race-chart"

const AVATAR_COLORS = [
  "bg-yellow-600", "bg-green-700", "bg-blue-700", "bg-orange-700",
  "bg-violet-700", "bg-pink-700", "bg-emerald-700", "bg-orange-600",
  "bg-indigo-700", "bg-teal-700", "bg-fuchsia-700", "bg-lime-700",
  "bg-red-700", "bg-slate-600",
]

export default async function AnalyticsPage() {
  const [matches, users] = await Promise.all([
    prisma.match.findMany({
      where: { status: "FINISHED" },
      orderBy: { kickoff: "asc" },
      select: {
        id: true, kickoff: true, homeTeam: true, awayTeam: true,
        homeScore: true, awayScore: true, stage: true, group: true,
      },
    }),
    prisma.user.findMany({
      where: { isAdmin: false },
      select: { id: true, name: true },
    }),
  ])

  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Аналитика</h1>
        <p className="text-sm text-gray-500 py-12 text-center">
          Аналитика появится после первых матчей — следи за обновлениями!
        </p>
      </div>
    )
  }

  const matchIds = matches.map(m => m.id)
  const predictions = await prisma.prediction.findMany({
    where: { matchId: { in: matchIds } },
    select: { userId: true, matchId: true, homeScore: true, awayScore: true, points: true },
  })

  // Вычисляем данные для всех секций
  const recentN = Math.min(5, matches.length)
  const deltas = calcRecentDelta(matches, predictions, users, recentN)
  const cumulative = calcCumulative(matches, predictions, users)
  const hotHand = calcHotHand(matches, predictions, users)
  const contrarians = calcContrarians(matches, predictions, users)
  const matchesOfTour = calcMatchesOfTour(matches, predictions, users)

  // Лидер — userId с максимальной накопленной суммой
  const leaderUserId = cumulative
    .map(s => ({ id: s.userId, pts: s.points[s.points.length - 1] ?? 0 }))
    .sort((a, b) => b.pts - a.pts)[0]?.id ?? ""

  // Границы туров для графика (индексы матчей где начинается тур 2 и 3)
  const groupMatches = matches
    .filter(m => m.stage === "GROUP")
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())
  const tourMap = buildMatchTourMap(groupMatches.map(m => ({ id: m.id, group: m.group })))
  const tourBoundaries: number[] = []
  let prevTour: string | null = null
  matches.forEach((m, i) => {
    const t = tourMap[m.id]
    if (t && t !== prevTour && prevTour !== null) tourBoundaries.push(i)
    if (t) prevTour = t
  })

  const topHot = hotHand.filter(e => e.streak > 0).slice(0, 5)
  const topContrarians = contrarians.filter(e => e.wins > 0).slice(0, 5)

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Аналитика</h1>

      {/* ── СЕКЦИЯ 1: ГОНКА — ПОСЛЕДНИЕ N МАТЧЕЙ ── */}
      <div>
        <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-3">
          Гонка · последние {recentN} матчей
        </h2>
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
          <div className="flex gap-3 w-max">
            {deltas.map(entry => (
              <div
                key={entry.userId}
                className={[
                  "w-36 shrink-0 rounded-sm p-3 border",
                  entry.isFirst
                    ? "border-green-600/50 bg-green-900/10"
                    : entry.isLast
                    ? "border-red-900/40 bg-red-900/5"
                    : "border-[#1a1500] bg-[#111]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-gray-500 tracking-widest">#{entry.rank}</span>
                  {entry.isFirst && <span className="text-xs">🔥</span>}
                </div>
                <p className="text-xs font-semibold text-gray-300 truncate mb-2">{entry.name}</p>
                <p
                  className={[
                    "text-2xl font-black mb-1",
                    entry.isFirst
                      ? "text-green-400"
                      : entry.isLast
                      ? "text-red-400"
                      : "text-gray-200",
                  ].join(" ")}
                >
                  +{entry.delta}
                </p>
                <div className="bg-gray-800 rounded-full h-1 mb-1">
                  <div
                    className={[
                      "h-1 rounded-full",
                      entry.isFirst ? "bg-green-500" : entry.isLast ? "bg-red-800" : "bg-yellow-700",
                    ].join(" ")}
                    style={{ width: `${entry.maxDelta > 0 ? Math.round((entry.delta / entry.maxDelta) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[9px] text-gray-600">очков</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── СЕКЦИЯ 2: ДИНАМИКА ГОНКИ ── */}
      <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
        <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-4">
          Динамика гонки
        </h2>
        <AnalyticsRaceChart
          series={cumulative}
          matchCount={matches.length}
          tourBoundaries={tourBoundaries}
          leaderUserId={leaderUserId}
        />
      </div>

      {/* ── СЕКЦИЯ 3: ГОРЯЧАЯ РУКА ── */}
      <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
        <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-4">
          Горячая рука 🔥
        </h2>
        {topHot.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Все остыли — ждём следующих матчей</p>
        ) : (
          <div className="space-y-4">
            {topHot.map(entry => (
              <div key={entry.userId}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-200">{entry.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{entry.streak} подряд</span>
                    <span className="text-[10px] font-black tracking-widest text-yellow-400">{entry.label}</span>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${entry.maxStreak > 0 ? Math.round((entry.streak / entry.maxStreak) * 100) : 0}%`,
                      background: "linear-gradient(to right, #eab308, #22c55e)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── СЕКЦИЯ 4: САМЫЙ СМЕЛЫЙ ── */}
      {topContrarians.length >= 1 && (
        <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
          <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-1">
            Самый смелый 🎯
          </h2>
          <p className="text-xs text-gray-600 mb-4">Ставил против большинства — и угадал</p>
          <div className="space-y-4">
            {topContrarians.map((entry, idx) => (
              <div key={entry.userId}>
                <div className="flex items-center gap-3 mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
                  >
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-200 truncate">{entry.name}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                        {entry.wins} из {entry.attempts} · {entry.pct}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-yellow-500 h-1.5 rounded-full"
                    style={{ width: `${entry.maxWins > 0 ? Math.round((entry.wins / entry.maxWins) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── СЕКЦИЯ 5: МАТЧ ТУРА ── */}
      {matchesOfTour.length > 0 && (
        <div>
          <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-3">
            Матч тура
          </h2>
          <div className="space-y-3">
            {matchesOfTour.map(mot => (
              <div key={mot.matchId} className="bg-[#111] border border-[#1a1500] rounded-sm overflow-hidden">
                {/* Шапка */}
                <div className="px-4 py-2 bg-[#1a1500] border-b border-[#2a2000]">
                  <span className="text-[9px] font-black text-yellow-400 tracking-widest">
                    {mot.tourLabel} · МАТЧ ТУРА
                  </span>
                </div>
                <div className="p-4">
                  {/* Матч */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg">{teamFlag(mot.homeTeam)}</span>
                    <span className="text-sm font-semibold text-gray-200 flex-1">{mot.homeTeam}</span>
                    <span className="text-xl font-black text-yellow-400 px-2">
                      {mot.homeScore} : {mot.awayScore}
                    </span>
                    <span className="text-sm font-semibold text-gray-200 flex-1 text-right">{mot.awayTeam}</span>
                    <span className="text-lg">{teamFlag(mot.awayTeam)}</span>
                  </div>

                  {/* Угадали / точно */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">
                        {mot.guessedCount} из {mot.totalCount} угадали исход
                        {mot.exactCount > 0 && ` · ${mot.exactCount} в счёт`}
                      </span>
                      <span className="text-gray-400">
                        {mot.totalCount > 0 ? Math.round((mot.guessedCount / mot.totalCount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-yellow-500 h-1.5 rounded-full"
                        style={{
                          width: `${mot.totalCount > 0 ? Math.round((mot.guessedCount / mot.totalCount) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Кто сорвал куш / промахнулся */}
                  {mot.jackpotNames.length > 0 && (
                    <p className="text-xs text-gray-400">
                      <span className="text-green-400 font-semibold">Сорвали куш: </span>
                      {mot.jackpotNames.join(", ")}
                    </p>
                  )}
                  {mot.missedNames.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="text-red-400 font-semibold">Промахнулись: </span>
                      {mot.missedNames.join(", ")}
                      {mot.missedExtra > 0 && ` и ещё ${mot.missedExtra}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Проверить компиляцию**

```bash
cd /Users/nichegosebe/toto-2026 && npx tsc --noEmit 2>&1 | head -30
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 4: Запустить все тесты**

```bash
cd /Users/nichegosebe/toto-2026 && npx vitest run 2>&1
```

Ожидаемый результат: все тесты PASS.

- [ ] **Step 5: Коммит**

```bash
cd /Users/nichegosebe/toto-2026 && git add app/analytics/page.tsx && git commit -m "feat(analytics): АНАЛИТИКА page — race, chart, hot hand, contrarian, match of tour"
```

---

## Task 6: Деплой и проверка

- [ ] **Step 1: Задеплоить на Vercel**

```bash
cd /Users/nichegosebe/toto-2026 && npx vercel --prod 2>&1
```

- [ ] **Step 2: Открыть `toto-2026.vercel.app/analytics` и проверить все 5 секций**

Что проверить:
- Вкладка АНАЛИТИКА видна в навигации
- Секция 1 (дельта-карточки): горизонтальный скролл работает, у топ-1 зелёная рамка, у последнего красноватая
- Секция 2 (график): линии отрисованы, жёлтая линия лидера выделена, hover показывает tooltip
- Секция 3 (горячая рука): серия > 0 показывается с баром
- Секция 4 (самый смелый): видны кружки с инициалами, бары
- Секция 5 (матч тура): карточки по турам с флагами и счётом

- [ ] **Step 3: Финальный коммит**

```bash
cd /Users/nichegosebe/toto-2026 && git add -A && git status
```

Убедиться, что всё закоммичено (`nothing to commit`).

---

## Self-Review: соответствие спеку

| Требование из спека | Задача |
|---------------------|--------|
| Новая вкладка /analytics | Task 1 |
| Дельта-карточки за последние 5 матчей | Task 2 (calcRecentDelta), Task 5 (секция 1) |
| Цвета: зелёный у топ-1, красный у последнего | Task 5 (секция 1) |
| SVG-график накопленных очков | Task 4, Task 5 (секция 2) |
| Лидер — жёлтая линия с градиентной заливкой | Task 4 |
| Топ-3 цветные линии, остальные серые | Task 4 |
| Имена подписаны у конца линии (топ-5) | Task 4 |
| Вертикальные разделители туров | Task 4 |
| Hover tooltip | Task 4 |
| Горячая рука: серия + статус-метка | Task 2 (calcHotHand), Task 5 (секция 3) |
| Самый смелый: ≤40% + угадал | Task 2 (calcContrarians), Task 5 (секция 4) |
| Матч тура: max spread | Task 2 (calcMatchesOfTour), Task 5 (секция 5) |
| Заглушка если нет матчей | Task 5 |
| Серия прерывается при отсутствии прогноза | Task 2, Task 3 |
| Nav tab после РЕЙТИНГ | Task 1 |
