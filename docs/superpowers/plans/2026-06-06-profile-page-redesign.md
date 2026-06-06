# Profile Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переделать страницу `/profile` — добавить место в рейтинге, мини-рейтинг с соседями, график очков по этапам, аналитический блок (100% попадания, динамика, сравнение с группой, двойник) и расширенные карточки прогнозов с реальным счётом.

**Architecture:** Страница остаётся Server Component (`app/profile/page.tsx`) — вся логика на сервере, 5 запросов к БД. Вычислительная логика выносится в `lib/profile-stats.ts`. Флаги команд — в `lib/flags.ts`.

**Tech Stack:** Next.js 15 Server Components, Prisma ORM, TypeScript, Tailwind CSS, Vitest

---

## Структура файлов

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `lib/profile-stats.ts` | CREATE | Все вычисления: rank, streak, pointsByStage, twin, comparison |
| `lib/flags.ts` | CREATE | Хелпер `teamFlag(name)` → emoji-флаг |
| `__tests__/profile-stats.test.ts` | CREATE | Тесты для всех функций из profile-stats |
| `app/profile/page.tsx` | MODIFY | Полная переработка: новые запросы + новый UI |

---

## Task 1: Тесты для profile-stats.ts

**Files:**
- Create: `__tests__/profile-stats.test.ts`

- [ ] **Шаг 1.1: Написать тесты (все упадут — файл ещё не создан)**

```typescript
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
```

- [ ] **Шаг 1.2: Запустить тесты — убедиться что все падают**

```bash
cd /Users/nichegosebe/toto-2026 && npx vitest run __tests__/profile-stats.test.ts
```

Ожидаемый результат: ошибка `Cannot find module '@/lib/profile-stats'`

---

## Task 2: Реализовать lib/profile-stats.ts

**Files:**
- Create: `lib/profile-stats.ts`

- [ ] **Шаг 2.1: Создать файл**

```typescript
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
    if (!p.points) continue
    const key = p.match.stage === "GROUP"
      ? (matchTourMap[p.match.id] ?? "tour1")
      : p.match.stage
    result[key] = (result[key] ?? 0) + p.points
  }
  return result
}

type CrossPrediction = {
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
  const EXACT = new Set([11, 22, 32])
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

    if (pts === 0 && others.some(o => (o.points ?? 0) > 0)) {
      missedByOthersGot++
    }
  }

  return { uniquelyCorrect, missedByOthersGot, rarestMatch }
}
```

- [ ] **Шаг 2.2: Запустить тесты — убедиться что все проходят**

```bash
cd /Users/nichegosebe/toto-2026 && npx vitest run __tests__/profile-stats.test.ts
```

Ожидаемый результат: все тесты зелёные

- [ ] **Шаг 2.3: Закоммитить**

```bash
cd /Users/nichegosebe/toto-2026 && git add lib/profile-stats.ts __tests__/profile-stats.test.ts && git commit -m "feat: profile-stats helpers (rank, streak, twin, comparison)"
```

---

## Task 3: Создать lib/flags.ts

**Files:**
- Create: `lib/flags.ts`

- [ ] **Шаг 3.1: Создать файл**

```typescript
// lib/flags.ts

function iso(code: string): string {
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("")
}

const FLAGS: Record<string, string> = {
  // Южная Америка
  "Argentina": iso("AR"), "Brazil": iso("BR"), "Uruguay": iso("UY"),
  "Colombia": iso("CO"), "Ecuador": iso("EC"), "Chile": iso("CL"),
  "Paraguay": iso("PY"), "Bolivia": iso("BO"), "Peru": iso("PE"),
  "Venezuela": iso("VE"),
  // Северная и Центральная Америка
  "United States": iso("US"), "Mexico": iso("MX"), "Canada": iso("CA"),
  "Costa Rica": iso("CR"), "Panama": iso("PA"), "Honduras": iso("HN"),
  "Jamaica": iso("JM"), "El Salvador": iso("SV"), "Guatemala": iso("GT"),
  "Cuba": iso("CU"), "Haiti": iso("HT"), "Trinidad and Tobago": iso("TT"),
  // Европа
  "France": iso("FR"), "Germany": iso("DE"), "Spain": iso("ES"),
  "Portugal": iso("PT"), "Netherlands": iso("NL"), "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Italy": iso("IT"), "Belgium": iso("BE"), "Croatia": iso("HR"),
  "Denmark": iso("DK"), "Poland": iso("PL"), "Serbia": iso("RS"),
  "Switzerland": iso("CH"), "Austria": iso("AT"), "Turkey": iso("TR"),
  "Ukraine": iso("UA"), "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Czech Republic": iso("CZ"), "Slovakia": iso("SK"), "Hungary": iso("HU"),
  "Romania": iso("RO"), "Slovenia": iso("SI"), "Greece": iso("GR"),
  "Albania": iso("AL"), "Norway": iso("NO"), "Sweden": iso("SE"),
  "Finland": iso("FI"), "Iceland": iso("IS"), "Ireland": iso("IE"),
  "North Macedonia": iso("MK"), "Bosnia and Herzegovina": iso("BA"),
  // Африка
  "Morocco": iso("MA"), "Senegal": iso("SN"), "Nigeria": iso("NG"),
  "Egypt": iso("EG"), "Ghana": iso("GH"), "Cameroon": iso("CM"),
  "Ivory Coast": iso("CI"), "Algeria": iso("DZ"), "Tunisia": iso("TN"),
  "South Africa": iso("ZA"), "Mali": iso("ML"), "Congo DR": iso("CD"),
  "Burkina Faso": iso("BF"), "Guinea": iso("GN"),
  // Азия и Океания
  "Japan": iso("JP"), "South Korea": iso("KR"), "Australia": iso("AU"),
  "Saudi Arabia": iso("SA"), "Iran": iso("IR"), "Qatar": iso("QA"),
  "China": iso("CN"), "Indonesia": iso("ID"), "Uzbekistan": iso("UZ"),
  "Iraq": iso("IQ"), "Jordan": iso("JO"), "New Zealand": iso("NZ"),
}

export function teamFlag(teamName: string): string {
  return FLAGS[teamName] ?? ""
}
```

- [ ] **Шаг 3.2: Закоммитить**

```bash
cd /Users/nichegosebe/toto-2026 && git add lib/flags.ts && git commit -m "feat: teamFlag helper — emoji-флаги команд"
```

---

## Task 4: Переписать app/profile/page.tsx

**Files:**
- Modify: `app/profile/page.tsx`

- [ ] **Шаг 4.1: Заменить весь файл**

```tsx
// app/profile/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import {
  calcRank, calcStreak, buildMatchTourMap, calcPointsByStage,
  calcTwin, calcComparison, type RankedUser,
} from "@/lib/profile-stats"
import { teamFlag } from "@/lib/flags"

const EXACT_POINTS = new Set([11, 22, 32])

const STAGE_LABELS: Record<string, string> = {
  tour1: "Тур 1", tour2: "Тур 2", tour3: "Тур 3",
  R16: "1/8", QUARTERFINAL: "1/4", SEMIFINAL: "1/2",
  THIRD_PLACE: "3-е", FINAL: "Финал",
}

const STAGE_ORDER = ["tour1", "tour2", "tour3", "R16", "QUARTERFINAL", "SEMIFINAL", "FINAL"]

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id

  const [myPredictions, allUsers, totalMatches, groupMatches] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId },
      orderBy: { match: { kickoff: "asc" } },
      include: { match: true },
    }),
    prisma.user.findMany({
      where: { isAdmin: false },
      select: {
        id: true, name: true,
        predictions: { select: { points: true } },
        bonusPredictions: { select: { points: true } },
      },
    }),
    prisma.match.count(),
    prisma.match.findMany({
      where: { stage: "GROUP" },
      orderBy: { kickoff: "asc" },
      select: { id: true, group: true },
    }),
  ])

  const myMatchIds = myPredictions.map(p => p.matchId)
  const crossPredictions = myMatchIds.length > 0
    ? await prisma.prediction.findMany({
        where: { matchId: { in: myMatchIds } },
        select: { userId: true, matchId: true, homeScore: true, awayScore: true, points: true },
      })
    : []

  const rankedUsers: RankedUser[] = allUsers
    .map(u => ({
      id: u.id,
      name: u.name,
      total:
        u.predictions.reduce((s, p) => s + (p.points ?? 0), 0) +
        u.bonusPredictions.reduce((s, b) => s + (b.points ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total)

  const matchTourMap = buildMatchTourMap(groupMatches)
  const rankInfo = calcRank(userId, rankedUsers)
  const streak = calcStreak(myPredictions)
  const pointsByStage = calcPointsByStage(myPredictions, matchTourMap)
  const twin = calcTwin(userId, crossPredictions, rankedUsers)
  const comparison = calcComparison(userId, crossPredictions, myPredictions.map(p => p.match))

  const finished = myPredictions.filter(p => p.match.status === "FINISHED")
  const guessed = finished.filter(p => (p.points ?? 0) > 0).length
  const accuracy = finished.length > 0 ? Math.round(guessed / finished.length * 100) : 0
  const exactCount = finished.filter(p => EXACT_POINTS.has(p.points ?? 0)).length

  const maxStagePoints = Math.max(...STAGE_ORDER.map(s => pointsByStage[s] ?? 0), 1)
  const initials = (session.user.name ?? "?").charAt(0).toUpperCase()
  const leaderTotal = rankedUsers[0]?.total ?? 1

  return (
    <div className="space-y-6 pb-8">
      {/* 1. ШАПКА */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xl shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{session.user.name ?? "Без имени"}</h1>
          <p className="text-gray-400 text-sm truncate">{session.user.email ?? ""}</p>
        </div>
        {rankInfo.rank > 0 && (
          <div className="bg-yellow-500 text-black text-sm font-bold px-3 py-1.5 rounded-lg shrink-0">
            #{rankInfo.rank} место
          </div>
        )}
      </div>

      {/* 2. ЧЕТЫРЕ ПЛАШКИ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{rankInfo.total}</p>
          <p className="text-sm text-gray-400 mt-1">Очков всего</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{accuracy}%</p>
          <p className="text-sm text-gray-400 mt-1">Точность угаданий</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-orange-400">🔥 {streak}</p>
          <p className="text-sm text-gray-400 mt-1">Серия подряд</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Прогнозов</span>
            <span className="font-bold">{myPredictions.length} / {totalMatches}</span>
          </div>
          <div className="bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-yellow-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, Math.round(myPredictions.length / totalMatches * 100))}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {Math.round(myPredictions.length / totalMatches * 100)}% заполнено
          </p>
        </div>
      </div>

      {/* 3. МИНИ-РЕЙТИНГ */}
      {rankInfo.rank > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Рейтинг участников
          </h2>
          <div className="space-y-2">
            {rankInfo.above && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-7">#{rankInfo.above.rank}</span>
                <span className="text-gray-300 text-sm flex-1 truncate">{rankInfo.above.name}</span>
                <div className="bg-gray-700 rounded h-1 w-20 shrink-0">
                  <div className="bg-gray-500 h-1 rounded" style={{ width: `${rankInfo.above.total / leaderTotal * 100}%` }} />
                </div>
                <span className="text-gray-400 text-sm w-14 text-right shrink-0">{rankInfo.above.total} оч.</span>
              </div>
            )}
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-2 py-1.5 -mx-2">
              <span className="text-yellow-400 font-bold text-sm w-7">#{rankInfo.rank}</span>
              <span className="text-white font-bold text-sm flex-1 truncate">Ты</span>
              <div className="bg-gray-700 rounded h-1 w-20 shrink-0">
                <div className="bg-yellow-500 h-1 rounded" style={{ width: `${rankInfo.total / leaderTotal * 100}%` }} />
              </div>
              <span className="text-yellow-400 font-bold text-sm w-14 text-right shrink-0">{rankInfo.total} оч.</span>
            </div>
            {rankInfo.below && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-7">#{rankInfo.below.rank}</span>
                <span className="text-gray-300 text-sm flex-1 truncate">{rankInfo.below.name}</span>
                <div className="bg-gray-700 rounded h-1 w-20 shrink-0">
                  <div className="bg-gray-500 h-1 rounded" style={{ width: `${rankInfo.below.total / leaderTotal * 100}%` }} />
                </div>
                <span className="text-gray-400 text-sm w-14 text-right shrink-0">{rankInfo.below.total} оч.</span>
              </div>
            )}
          </div>
          {rankInfo.pointsToNext !== null && rankInfo.pointsToNext > 0 && (
            <p className="text-xs text-gray-500 text-center mt-3">
              До #{rankInfo.rank - 1} места: {rankInfo.pointsToNext} очков
            </p>
          )}
        </div>
      )}

      {/* 4. ГРАФИК ПО ЭТАПАМ */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Очки по этапам
        </h2>
        <div className="flex gap-1 items-end h-16">
          {STAGE_ORDER.map(stage => {
            const pts = pointsByStage[stage] ?? 0
            const heightPct = pts > 0 ? Math.max(10, Math.round(pts / maxStagePoints * 100)) : 4
            return (
              <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                {pts > 0 && <span className="text-xs text-gray-400">{pts}</span>}
                <div
                  className={`w-full rounded-sm ${pts > 0 ? "bg-yellow-500" : "bg-gray-700"}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex gap-1 mt-1">
          {STAGE_ORDER.map(stage => (
            <div key={stage} className="flex-1 text-center text-xs text-gray-500 truncate">
              {STAGE_LABELS[stage]}
            </div>
          ))}
        </div>
      </div>

      {/* 5. АНАЛИТИКА */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Аналитика
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* 5а. 100% попаданий */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">100% ПОПАДАНИЯ</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-green-400">{exactCount}</span>
              <span className="text-sm text-gray-500">из {finished.length}</span>
            </div>
            <div className="bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${finished.length > 0 ? exactCount / finished.length * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">точных счётов</p>
          </div>

          {/* 5б. Динамика */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">ДИНАМИКА</p>
            <div className="flex gap-0.5 items-end h-8 mb-1">
              {STAGE_ORDER.map(stage => {
                const pts = pointsByStage[stage] ?? 0
                const h = pts > 0 ? Math.max(4, Math.round(pts / maxStagePoints * 100)) : 3
                return (
                  <div
                    key={stage}
                    className={`flex-1 rounded-sm ${pts > 0 ? "bg-yellow-500" : "bg-gray-700"}`}
                    style={{ height: `${h}%` }}
                  />
                )
              })}
            </div>
            <div className="flex gap-0.5">
              {STAGE_ORDER.map(stage => {
                const pts = pointsByStage[stage] ?? 0
                const isBest = pts > 0 && pts === maxStagePoints
                return (
                  <div
                    key={stage}
                    className={`flex-1 text-center truncate ${isBest ? "text-yellow-400 font-bold" : "text-gray-500"}`}
                    style={{ fontSize: "7px" }}
                  >
                    {STAGE_LABELS[stage]}<br />{pts > 0 ? pts : "—"}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 5в. Сравнение с группой */}
          {finished.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-3">СРАВНЕНИЕ С ГРУППОЙ</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Угадал только ты</span>
                  <span className="font-bold text-green-400">{comparison.uniquelyCorrect}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Все угадали, кроме тебя</span>
                  <span className="font-bold text-red-400">{comparison.missedByOthersGot}</span>
                </div>
                {comparison.rarestMatch && (
                  <div className="border-t border-gray-800 pt-2">
                    <p className="text-xs text-gray-500 mb-1">Самый редкий прогноз</p>
                    <p className="text-xs text-white">
                      {teamFlag(comparison.rarestMatch.homeTeam)} {comparison.rarestMatch.homeTeam} — {teamFlag(comparison.rarestMatch.awayTeam)} {comparison.rarestMatch.awayTeam}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5г. Двойник */}
          {twin && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-3">ТВОЙ ДВОЙНИК</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {twin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold">{twin.name}</p>
                  <p className="text-xs text-gray-400">#{twin.rank} место</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded px-2 py-1 text-xs text-gray-300">
                Совпадают <span className="font-bold text-white">{twin.matchCount}</span> из {myPredictions.length} прогнозов
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. СПИСОК ПРОГНОЗОВ */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Мои прогнозы</h2>
        {myPredictions.length === 0 && (
          <p className="text-gray-500 text-center py-8">У вас пока нет прогнозов</p>
        )}
        <div className="space-y-2">
          {myPredictions.map(pred => {
            const isFinished = pred.match.status === "FINISHED"
            const pts = pred.points ?? 0
            const isExact = EXACT_POINTS.has(pts)
            const isCorrect = pts > 0 && !isExact
            const groupLetter = pred.match.group?.replace(/^GROUP_/, "") ?? ""
            const stageLabel = pred.match.stage === "GROUP" && groupLetter
              ? `Группа ${groupLetter}`
              : { R16: "1/8 финала", QUARTERFINAL: "1/4 финала", SEMIFINAL: "1/2 финала", THIRD_PLACE: "За 3-е место", FINAL: "Финал" }[pred.match.stage] ?? pred.match.stage
            const kickoffStr = new Date(pred.match.kickoff).toLocaleDateString("ru-RU", {
              day: "numeric", month: "short",
            })

            const leftBorder = !isFinished
              ? ""
              : isExact
              ? "border-l-4 border-l-green-500"
              : isCorrect
              ? "border-l-4 border-l-yellow-500"
              : "border-l-4 border-l-gray-600"

            const actualScoreColor = isExact
              ? "text-green-400"
              : isCorrect
              ? "text-yellow-400"
              : "text-gray-400"

            return (
              <div
                key={pred.id}
                className={`bg-gray-900 rounded-lg p-4 ${isFinished ? `border border-gray-800 ${leftBorder}` : "border border-dashed border-gray-700"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-sm">
                      {teamFlag(pred.match.homeTeam)} {pred.match.homeTeam} — {teamFlag(pred.match.awayTeam)} {pred.match.awayTeam}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">{kickoffStr} · {stageLabel}</p>
                  </div>
                  {isFinished ? (
                    <Badge className={
                      isExact ? "bg-green-900 text-green-200" :
                      isCorrect ? "bg-yellow-900 text-yellow-200" :
                      "bg-gray-800 text-gray-400"
                    }>
                      {pts > 0 ? `+${pts}` : "+0"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">
                      ожидается
                    </Badge>
                  )}
                </div>
                <div className="border-t border-gray-800 pt-3 flex gap-8">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Мой прогноз</p>
                    <p className="font-bold text-sm">{pred.homeScore} : {pred.awayScore}</p>
                  </div>
                  {isFinished && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Итог матча</p>
                      <p className={`font-bold text-sm ${actualScoreColor}`}>
                        {pred.match.homeScore ?? "?"} : {pred.match.awayScore ?? "?"}
                        {isExact && " ✓"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Шаг 4.2: Запустить dev-сервер и проверить страницу**

```bash
cd /Users/nichegosebe/toto-2026 && npm run dev
```

Открыть http://localhost:3000/profile — проверить:
- Шапка с местом в рейтинге
- 4 плашки (очки, точность, серия, прогресс)
- Мини-рейтинг с тремя строками
- График по этапам
- Блок аналитики (2×2)
- Список прогнозов с двумя счётами

- [ ] **Шаг 4.3: Запустить все тесты**

```bash
cd /Users/nichegosebe/toto-2026 && npx vitest run
```

Ожидаемый результат: все тесты зелёные

- [ ] **Шаг 4.4: Закоммитить**

```bash
cd /Users/nichegosebe/toto-2026 && git add app/profile/page.tsx && git commit -m "feat: редизайн страницы профиля — рейтинг, аналитика, карточки с двумя счётами"
```

---

## Task 5: Деплой

- [ ] **Шаг 5.1: Задеплоить на Vercel**

```bash
cd /Users/nichegosebe/toto-2026 && npx vercel --prod
```

- [ ] **Шаг 5.2: Проверить на https://toto-2026.vercel.app/profile**

Убедиться что страница открывается и отображает все блоки.
