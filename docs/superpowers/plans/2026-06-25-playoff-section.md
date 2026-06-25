# Раздел Play-off — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить раздел плей-офф — чип-фильтр «Плей-офф» + починку «1/16» во вкладке «Матчи», новую вкладку «ПЛЕЙ-ОФФ» со списком по стадиям, и подсветку «прошёл дальше» у завершённых плей-офф матчей.

**Architecture:** Переиспользуем существующий компонент `MatchesList` (он принимает группы `{label, matches}`) для обеих вкладок — «Матчи» группирует по датам, «ПЛЕЙ-ОФФ» по стадиям. Добавляем в `MatchesList` опциональный проп `showAdvance` для подсветки победителя. Новый роут `/playoff` повторяет паттерн `/matches`, но группирует по стадиям.

**Tech Stack:** Next.js 16 (App Router, Server Components), Prisma 7, TypeScript, Tailwind.

**Тестирование:** По правилам проекта (CLAUDE.md off-limits) новые тест-файлы не создаём. Верификация каждой задачи — `npm run build` без ошибок + проверка описанного поведения.

---

## File Structure

- **Modify** `components/matches-list.tsx` — добавить поле `winner` в `SerializedMatch`, проп `showAdvance`, рендер подсветки победителя + стрелки «↑».
- **Modify** `app/matches/page.tsx` — добавить чипы `playoff` и `ROUND_OF_32`, логику фильтра «playoff», счётчик, поле `winner` в серилизацию.
- **Modify** `components/nav-tabs.tsx` — добавить вкладку «ПЛЕЙ-ОФФ» перед «СЕТКА».
- **Create** `app/playoff/page.tsx` — список плей-офф матчей, сгруппированный по стадиям, с `showAdvance`.

---

## Task 1: `MatchesList` — поле winner + подсветка «прошёл дальше»

**Files:**
- Modify: `components/matches-list.tsx`

- [ ] **Step 1: Добавить поле `winner` в интерфейс `SerializedMatch`**

В `components/matches-list.tsx`, в интерфейсе `SerializedMatch` (после поля `status: string`) добавить **опциональное** поле `winner` (опциональность важна: пока другие страницы его не заполняют, сборка не ломается):

```typescript
  status: string
  winner?: string | null
  city: string | null
  country: string | null
```

- [ ] **Step 2: Добавить проп `showAdvance` в `MatchesListProps` и сигнатуру**

Интерфейс `MatchesListProps` — добавить опциональный проп:

```typescript
interface MatchesListProps {
  byDate: DateGroup[]
  userPredictions: Record<string, SerializedPrediction>
  isLoggedIn: boolean
  activeTab?: string
  showAdvance?: boolean
}
```

Сигнатура функции:

```typescript
export function MatchesList({ byDate, userPredictions, isLoggedIn, activeTab, showAdvance }: MatchesListProps) {
```

- [ ] **Step 3: Вычислить победителя для строки матча**

Внутри `.map((match) => {`, рядом с другими вычислениями (после строки `const isLive = ...`), добавить:

```typescript
              const advanced = showAdvance && isFinished && match.winner
              const homeWon = advanced && match.winner === match.homeTeam
              const awayWon = advanced && match.winner === match.awayTeam
```

- [ ] **Step 4: Подсветить команду-победителя и добавить стрелку**

В блоке «Команды + счёт» обновить отрисовку названий команд. Заменить строку домашней команды:

```tsx
                      <span className="font-medium text-sm truncate">{match.homeTeam}</span>
```

на:

```tsx
                      <span className={`font-medium text-sm truncate ${homeWon ? "text-yellow-400 font-bold" : ""}`}>
                        {match.homeTeam}{homeWon ? " ↑" : ""}
                      </span>
```

И строку гостевой команды:

```tsx
                      <span className="font-medium text-sm truncate">{match.awayTeam}</span>
```

на:

```tsx
                      <span className={`font-medium text-sm truncate ${awayWon ? "text-yellow-400 font-bold" : ""}`}>
                        {awayWon ? "↑ " : ""}{match.awayTeam}
                      </span>
```

- [ ] **Step 5: Сборка**

Run: `npm run build`
Expected: `✓ Compiled successfully`, без ошибок. Поле `winner` опционально, поэтому существующая серилизация в `app/matches/page.tsx` ещё компилируется (передаст `winner` позже, в Task 2). Поведение подсветки на этом шаге не видно, т.к. `showAdvance` пока никто не передаёт.

- [ ] **Step 6: Commit**

```bash
git add components/matches-list.tsx
git commit -m "feat(matches-list): winner highlight + advance arrow via showAdvance prop

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Вкладка «Матчи» — чипы «Плей-офф» + «1/16», серилизация winner

**Files:**
- Modify: `app/matches/page.tsx`

- [ ] **Step 1: Добавить чипы в массив `TABS`**

Заменить массив `TABS` целиком на:

```typescript
const TABS = [
  { key: "all",          label: "Все матчи" },
  { key: "tour1",        label: "Тур 1" },
  { key: "tour2",        label: "Тур 2" },
  { key: "tour3",        label: "Тур 3" },
  { key: "playoff",      label: "Плей-офф" },
  { key: "ROUND_OF_32",  label: "1/16 финала" },
  { key: "R16",          label: "1/8 финала" },
  { key: "QUARTERFINAL", label: "1/4 финала" },
  { key: "SEMIFINAL",    label: "1/2 финала" },
  { key: "THIRD_PLACE",  label: "За 3-е место" },
  { key: "FINAL",        label: "Финал" },
]
```

- [ ] **Step 2: Добавить набор плей-офф стадий**

Сразу после `const TABS = [...]` добавить:

```typescript
const PLAYOFF_STAGES = new Set([
  "ROUND_OF_32", "R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL",
])
```

- [ ] **Step 3: Посчитать счётчик чипа «Плей-офф»**

Найти блок подсчёта счётчиков:

```typescript
  const counts: Record<string, number> = { all: allMatches.length }
  for (const m of allMatches) {
    const t = getMatchTab(m)
    counts[t] = (counts[t] ?? 0) + 1
  }
```

Сразу после него (перед строкой `const tabs = TABS.map(...)`) добавить:

```typescript
  counts["playoff"] = allMatches.filter((m) => PLAYOFF_STAGES.has(m.stage)).length
```

- [ ] **Step 4: Обработать фильтр «playoff»**

Заменить блок:

```typescript
  const matches =
    tab === "all"
      ? allMatches
      : allMatches.filter((m) => getMatchTab(m) === tab)
```

на:

```typescript
  const matches =
    tab === "all"
      ? allMatches
      : tab === "playoff"
      ? allMatches.filter((m) => PLAYOFF_STAGES.has(m.stage))
      : allMatches.filter((m) => getMatchTab(m) === tab)
```

- [ ] **Step 5: Добавить `winner` в серилизацию**

Найти объект `const serialized: SerializedMatch = {` и добавить поле `winner` (после `status: match.status,`):

```typescript
      status: match.status,
      winner: match.winner,
      city: match.city,
      country: match.country,
```

- [ ] **Step 6: Сборка**

Run: `npm run build`
Expected: `✓ Compiled successfully`, без ошибок.

- [ ] **Step 7: Проверка поведения**

Run: `npm run dev`, открыть `http://localhost:3000/matches`.
Expected: в строке фильтров появились чипы «Плей-офф» и «1/16» (если в БД есть такие матчи; иначе чип скрыт из-за `t.count > 0` — это норма). Клик по «Плей-офф» показывает все плей-офф матчи; клик по «1/16» — только матчи стадии ROUND_OF_32. Группировка по датам сохранена.

- [ ] **Step 8: Commit**

```bash
git add app/matches/page.tsx
git commit -m "feat(matches): add Плей-офф filter chip and fix missing 1/16 stage

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Навигация — вкладка «ПЛЕЙ-ОФФ» перед «СЕТКА»

**Files:**
- Modify: `components/nav-tabs.tsx`

- [ ] **Step 1: Добавить вкладку в массив `TABS`**

В `components/nav-tabs.tsx` в массиве `TABS` вставить строку `{ href: "/playoff", label: "ПЛЕЙ-ОФФ" }` между `ПРОФИЛЬ` и `СЕТКА`:

```typescript
const TABS = [
  { href: "/matches", label: "МАТЧИ" },
  { href: "/leaderboard", label: "РЕЙТИНГ" },
  { href: "/analytics", label: "АНАЛИТИКА" },
  { href: "/profile", label: "ПРОФИЛЬ" },
  { href: "/playoff", label: "ПЛЕЙ-ОФФ" },
  { href: "/grid", label: "СЕТКА" },
  { href: "/standings", label: "ГРУППЫ" },
  { href: "/bonus", label: "БОНУС" },
  { href: "/rules", label: "ПРАВИЛА" },
]
```

- [ ] **Step 2: Сборка**

Run: `npm run build`
Expected: `✓ Compiled successfully`. (Роут `/playoff` ещё не создан, но Next не падает на ссылке в навигации — страница даст 404 до Task 4. Это ожидаемо.)

- [ ] **Step 3: Commit**

```bash
git add components/nav-tabs.tsx
git commit -m "feat(nav): add ПЛЕЙ-ОФФ tab before СЕТКА

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Роут `/playoff` — список по стадиям

**Files:**
- Create: `app/playoff/page.tsx`

- [ ] **Step 1: Создать страницу**

Создать `app/playoff/page.tsx` с полным содержимым:

```tsx
export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchesList } from "@/components/matches-list"
import type { SerializedMatch, SerializedPrediction, DateGroup } from "@/components/matches-list"

const PLAYOFF_ORDER = ["ROUND_OF_32", "R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"]

const STAGE_LABELS: Record<string, string> = {
  ROUND_OF_32: "1/16 финала",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "За 3-е место",
  FINAL: "Финал",
}

export default async function PlayoffPage() {
  const session = await auth()

  const matches = await prisma.match.findMany({
    where: { stage: { in: PLAYOFF_ORDER as never } },
    orderBy: { kickoff: "asc" },
  })

  let userPredictions: Record<string, SerializedPrediction> = {}
  if (session?.user?.id) {
    const preds = await prisma.prediction.findMany({
      where: { userId: session.user.id },
      select: { matchId: true, homeScore: true, awayScore: true, points: true },
    })
    userPredictions = Object.fromEntries(
      preds.map((p) => [p.matchId, { homeScore: p.homeScore, awayScore: p.awayScore, points: p.points }])
    )
  }

  // Группировка по стадиям в порядке PLAYOFF_ORDER
  const byStage: DateGroup[] = []
  for (const stage of PLAYOFF_ORDER) {
    const stageMatches = matches.filter((m) => m.stage === stage)
    if (stageMatches.length === 0) continue
    byStage.push({
      dateKey: stage,
      label: STAGE_LABELS[stage] ?? stage,
      matches: stageMatches.map((match): SerializedMatch => ({
        id: match.id,
        externalId: match.externalId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        stage: match.stage,
        group: match.group,
        kickoff: match.kickoff.toISOString(),
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        winner: match.winner,
        city: match.city,
        country: match.country,
      })),
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Плей-офф</h1>

      {byStage.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Плей-офф ещё не начался</p>
          <p className="text-sm mt-2">Матчи появятся после группового этапа.</p>
        </div>
      ) : (
        <MatchesList
          byDate={byStage}
          userPredictions={userPredictions}
          isLoggedIn={!!session?.user}
          showAdvance
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Сборка**

Run: `npm run build`
Expected: `✓ Compiled successfully`, в списке роутов появляется `/playoff`.

- [ ] **Step 3: Проверка поведения**

Run: `npm run dev`, открыть `http://localhost:3000/playoff`.
Expected: вкладка «ПЛЕЙ-ОФФ» в навигации между «ПРОФИЛЬ» и «СЕТКА». Страница показывает плей-офф матчи с заголовками стадий («1/16 финала» и т.д.). У завершённых матчей победитель подсвечен жёлтым со стрелкой «↑». Если плей-офф матчей нет — текст «Плей-офф ещё не начался». Залогиненный видит свою ставку и очки, гость — нет.

- [ ] **Step 4: Commit**

```bash
git add app/playoff/page.tsx
git commit -m "feat(playoff): add /playoff route grouped by stage with advance highlight

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Финальная проверка

- [ ] **Полная сборка:** `npm run build` → `✓ Compiled successfully`, роут `/playoff` в списке.
- [ ] **Деплой (по запросу пользователя):** `npx vercel --prod`, затем проверить на `toto-2026.vercel.app`.

## Замечания по реализации

- `match.stage` — тип `Stage` (enum Prisma), сравнения со строками работают, т.к. enum серилизуется в строковые значения. В запросе `stage: { in: PLAYOFF_ORDER as never }` каст `as never` обходит строгую типизацию enum-массива; альтернатива — импортировать `Stage` из `@prisma/client` и типизировать массив как `Stage[]`.
- `MatchesList` не передаёт `winner` в детальную страницу — подсветка чисто визуальная в списке, ссылки матчей не меняются.
- Группировка «Матчей» по датам и «Плей-офф» по стадиям использует один компонент `MatchesList` через общую структуру `DateGroup` (`{dateKey, label, matches}`).
