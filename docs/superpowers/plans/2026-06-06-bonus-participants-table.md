# Bonus Participants Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в `/bonus` таблицу с бонусными прогнозами всех участников, видимую только после начала ЧМ (когда `locked === true`), и новый API endpoint `GET /api/bonus/all` для её данных.

**Architecture:** Новый endpoint в `app/api/bonus/all/route.ts` делает Prisma-запрос всех не-admin пользователей с их `bonusPredictions`, и возвращает 403 если ЧМ ещё не начался. Страница `app/bonus/page.tsx` делает второй fetch к `/api/bonus/all` только после того как убеждается что `locked === true` из первого ответа `/api/bonus`. Логика форматирования очков вынесена в `lib/bonus-utils.ts` для тестируемости.

**Tech Stack:** Next.js 15 App Router (route handlers), Prisma ORM, React hooks (useState/useEffect), Tailwind CSS, Vitest

---

## Spec

`docs/superpowers/specs/2026-06-06-bonus-participants-table-design.md`

---

## File Map

| Файл | Действие | Что делает |
|---|---|---|
| `lib/bonus-utils.ts` | Создать | Чистая функция `computeBonusPoints` |
| `__tests__/bonus-utils.test.ts` | Создать | Тесты для `computeBonusPoints` |
| `app/api/bonus/all/route.ts` | Создать | GET endpoint — все участники с прогнозами |
| `app/bonus/page.tsx` | Изменить | Добавить секцию таблицы участников внизу |

---

## Task 1: `lib/bonus-utils.ts` — чистый хелпер для вычисления очков

**Files:**
- Create: `lib/bonus-utils.ts`
- Create: `__tests__/bonus-utils.test.ts`

- [ ] **Step 1: Написать тест**

```typescript
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
```

- [ ] **Step 2: Убедиться что тест падает**

```bash
cd /Users/nichegosebe/toto-2026 && npx vitest run __tests__/bonus-utils.test.ts
```

Ожидаемый вывод: ошибка `Cannot find module '@/lib/bonus-utils'`

- [ ] **Step 3: Реализовать хелпер**

```typescript
// lib/bonus-utils.ts
export function computeBonusPoints(
  predictions: { points: number | null }[]
): number | null {
  if (predictions.length === 0) return null
  const hasAny = predictions.some((p) => p.points !== null)
  if (!hasAny) return null
  return predictions.reduce((s, p) => s + (p.points ?? 0), 0)
}
```

- [ ] **Step 4: Убедиться что тесты проходят**

```bash
cd /Users/nichegosebe/toto-2026 && npx vitest run __tests__/bonus-utils.test.ts
```

Ожидаемый вывод: `4 passed`

- [ ] **Step 5: Коммит**

```bash
git add lib/bonus-utils.ts __tests__/bonus-utils.test.ts
git commit -m "feat: add computeBonusPoints helper with tests"
```

---

## Task 2: `app/api/bonus/all/route.ts` — endpoint для всех прогнозов

**Files:**
- Create: `app/api/bonus/all/route.ts`

- [ ] **Step 1: Создать файл endpoint**

```typescript
// app/api/bonus/all/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const firstMatch = await prisma.match.findFirst({
    orderBy: { kickoff: "asc" },
    select: { kickoff: true },
  })
  const locked = firstMatch ? new Date() >= new Date(firstMatch.kickoff) : false

  if (!locked) {
    return NextResponse.json(
      { error: "Данные скрыты до начала ЧМ" },
      { status: 403 }
    )
  }

  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      bonusPredictions: {
        select: { type: true, team: true, points: true },
      },
    },
  })

  return NextResponse.json({
    locked: true,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      predictions: u.bonusPredictions,
    })),
  })
}
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd /Users/nichegosebe/toto-2026 && npx tsc --noEmit
```

Ожидаемый вывод: без ошибок

- [ ] **Step 3: Коммит**

```bash
git add app/api/bonus/all/route.ts
git commit -m "feat: add GET /api/bonus/all endpoint (locked-gated)"
```

---

## Task 3: Таблица участников в `app/bonus/page.tsx`

**Files:**
- Modify: `app/bonus/page.tsx`

**Что нужно добавить:**
1. Импортировать `computeBonusPoints` из `@/lib/bonus-utils` и `teamFlag` из `@/lib/flags`
2. Добавить state и fetch для данных `/api/bonus/all`
3. Добавить секцию таблицы в конец JSX

**Интерфейс данных из `/api/bonus/all`:**
```typescript
interface AllBonusData {
  locked: boolean
  users: Array<{
    id: string
    name: string
    predictions: Array<{
      type: string
      team: string
      points: number | null
    }>
  }>
}
```

- [ ] **Step 1: Добавить импорты и state**

В начале файла (после существующих импортов) добавить:
```typescript
import { teamFlag } from "@/lib/flags"
import { computeBonusPoints } from "@/lib/bonus-utils"
```

В тело компонента `BonusPage` после существующих useState добавить:
```typescript
const [allData, setAllData] = useState<AllBonusData | null>(null)
```

И определение интерфейса перед компонентом:
```typescript
interface AllBonusData {
  locked: boolean
  users: Array<{
    id: string
    name: string
    predictions: Array<{ type: string; team: string; points: number | null }>
  }>
}
```

- [ ] **Step 2: Добавить fetch в useEffect**

В существующий `useEffect` после `.finally(() => setLoading(false))` добавить второй useEffect — нет, это лучше сделать как отдельный effect, зависящий от `data?.locked`:

Добавить после первого `useEffect`:
```typescript
useEffect(() => {
  if (!data?.locked) return
  fetch("/api/bonus/all")
    .then((r) => (r.ok ? r.json() : null))
    .then((d: AllBonusData | null) => {
      if (d) setAllData(d)
    })
}, [data?.locked])
```

- [ ] **Step 3: Добавить секцию таблицы в JSX**

В самом конце JSX, внутри `<div className="max-w-4xl mx-auto space-y-8">`, после существующего последнего элемента (блок `!locked && !alreadySaved`) добавить:

```tsx
{/* ТАБЛИЦА ПРОГНОЗОВ УЧАСТНИКОВ — только после начала ЧМ */}
{locked && allData && allData.users.length > 0 && (
  <section className="space-y-4">
    <h2 className="text-xl font-bold">Прогнозы участников</h2>
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/80">
            <th className="px-4 py-3 font-semibold text-gray-300 whitespace-nowrap">Участник</th>
            <th className="px-4 py-3 font-semibold text-gray-300 whitespace-nowrap">🏅 Полуфиналисты (+8)</th>
            <th className="px-4 py-3 font-semibold text-gray-300 whitespace-nowrap">🥈 Финалисты (+15)</th>
            <th className="px-4 py-3 font-semibold text-gray-300 whitespace-nowrap">🏆 Чемпион (+30)</th>
            <th className="px-4 py-3 font-semibold text-gray-300 whitespace-nowrap text-right">Очки</th>
          </tr>
        </thead>
        <tbody>
          {allData.users.map((user) => {
            const hasPredictions = user.predictions.length > 0
            const semis = user.predictions.filter((p) => p.type === "SEMIFINAL")
            const fins = user.predictions.filter((p) => p.type === "FINALIST")
            const champ = user.predictions.find((p) => p.type === "CHAMPION")
            const pts = computeBonusPoints(user.predictions)
            const isMe = user.id === session?.user?.id

            return (
              <tr
                key={user.id}
                className={[
                  "border-b border-gray-800/60 transition-colors",
                  !hasPredictions ? "opacity-50" : "",
                  isMe ? "bg-yellow-900/20" : "hover:bg-gray-900/40",
                ].join(" ")}
              >
                <td className="px-4 py-3 font-medium text-gray-200 whitespace-nowrap">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {!hasPredictions
                    ? <span className="text-gray-500 italic">не заполнил</span>
                    : semis.map((p) => `${teamFlag(p.team)} ${p.team}`).join("  ")}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {fins.length > 0
                    ? fins.map((p) => `${teamFlag(p.team)} ${p.team}`).join("  ")
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {champ
                    ? `${teamFlag(champ.team)} ${champ.team}`
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {pts !== null
                    ? <span className="text-green-400">+{pts}</span>
                    : <span className="text-gray-600">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-gray-500 text-center">
      Очки начисляются по мере прохождения этапов. «—» — результат ещё не известен.
    </p>
  </section>
)}
```

**Важно:** `session` нужен для `isMe` — добавить в начало компонента:
```typescript
const session = data ? (await fetch is not available) ... 
```

На самом деле `session` не доступен напрямую в client component. Используй `useSession` из next-auth/react, или альтернативно — добавить `currentUserId` в ответ `/api/bonus` (уже есть `session.user.id` там). Самый простой путь: добавить `currentUserId: session.user.id` в ответ существующего `GET /api/bonus/route.ts`.

**Обновить `GET /api/bonus/route.ts`** — добавить `currentUserId` в ответ:
```typescript
// В return NextResponse.json добавить поле:
return NextResponse.json({ predictions, teams: allTeams, locked, currentUserId: session.user.id })
```

**Обновить интерфейс `BonusData` в `page.tsx`:**
```typescript
interface BonusData {
  predictions: { type: string; team: string; points: number | null }[]
  teams: string[]
  locked: boolean
  currentUserId: string
}
```

**Использование в таблице:** `const isMe = user.id === data?.currentUserId`

- [ ] **Step 4: Проверить TypeScript**

```bash
cd /Users/nichegosebe/toto-2026 && npx tsc --noEmit
```

Ожидаемый вывод: без ошибок

- [ ] **Step 5: Запустить все тесты**

```bash
cd /Users/nichegosebe/toto-2026 && npx vitest run
```

Ожидаемый вывод: все тесты passing

- [ ] **Step 6: Коммит**

```bash
git add app/bonus/page.tsx app/api/bonus/route.ts
git commit -m "feat: add bonus participants table (visible after WC start)"
```

---

## Task 4: Деплой и проверка

- [ ] **Step 1: Задеплоить на Vercel**

```bash
cd /Users/nichegosebe/toto-2026 && npx vercel --prod
```

Ожидаемый вывод: ссылка `https://toto-2026.vercel.app` (или аналогичная).

- [ ] **Step 2: Финальный коммит (если нужны правки после деплоя)**

```bash
git add -A && git commit -m "fix: post-deploy corrections"
```
