# Тото 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить веб-тотализатор ЧМ 2026 — прогнозы счётов, автоподсчёт очков, рейтинговая таблица, сводная сетка прогнозов.

**Architecture:** Next.js 14 App Router с Server Components и Server Actions; Prisma + PostgreSQL для данных; NextAuth v5 для авторизации по email+пароль. Логика очков — чистые функции в `lib/scoring.ts`, протестированные Vitest. Синхронизация матчей — Vercel Cron → `/api/cron/sync-scores`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM, PostgreSQL, NextAuth.js v5, bcryptjs, Vitest, football-data.org API, Vercel Cron

---

## File Map

| Файл | Ответственность |
|------|----------------|
| `lib/auth.ts` | NextAuth конфиг: Credentials provider, JWT/session callbacks |
| `lib/db.ts` | Prisma клиент-синглтон |
| `lib/scoring.ts` | Чистые функции: `calculatePoints()`, `Stage` type |
| `lib/football-api.ts` | Клиент football-data.org: `getTodayMatches()`, `getAllMatches()`, mappers |
| `prisma/schema.prisma` | ORM-схема: User, Match, Prediction, BonusPrediction + enums |
| `types/next-auth.d.ts` | Расширение Session/JWT типов: `id`, `isAdmin` |
| `middleware.ts` | Защита роутов: redirect неавторизованных, блок /admin для не-admin |
| `app/layout.tsx` | Root layout: тёмная тема, Navbar, SessionProvider |
| `components/providers.tsx` | Client-side SessionProvider wrapper |
| `components/navbar.tsx` | Server Component навигация с ссылками и кнопкой выхода |
| `app/page.tsx` | Главная: ближайшие матчи + кнопки прогноза |
| `app/auth/login/page.tsx` | Форма входа (email + пароль) |
| `app/auth/register/page.tsx` | Форма регистрации |
| `app/matches/page.tsx` | Список всех матчей по стадиям |
| `app/matches/[id]/page.tsx` | Детальная страница матча + форма прогноза |
| `app/leaderboard/page.tsx` | Рейтинговая таблица участников |
| `app/grid/page.tsx` | Сводная сетка всех прогнозов |
| `app/profile/page.tsx` | Мои прогнозы и статистика |
| `app/admin/page.tsx` | Админ-панель: участники, триггер синхронизации |
| `components/match-card.tsx` | Карточка матча: команды, дата, счёт, кнопка прогноза |
| `components/prediction-form.tsx` | Форма прогноза с диалогом подтверждения |
| `components/leaderboard-table.tsx` | Таблица рейтинга |
| `components/predictions-grid.tsx` | Горизонтально скроллируемая сетка прогнозов |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth handler |
| `app/api/auth/register/route.ts` | POST /api/auth/register |
| `app/api/predictions/route.ts` | POST /api/predictions (409 на повтор) |
| `app/api/leaderboard/route.ts` | GET /api/leaderboard |
| `app/api/grid/route.ts` | GET /api/grid (прогнозы скрыты до FINISHED) |
| `app/api/cron/sync-scores/route.ts` | Vercel Cron: upsert матчей + recalculate points |
| `app/api/admin/trigger-sync/route.ts` | POST ручной триггер синхронизации (admin only) |
| `vercel.json` | Cron jobs конфиг |
| `.env.example` | Пример переменных окружения |
| `__tests__/scoring.test.ts` | Vitest тесты для calculatePoints |
| `vitest.config.ts` | Vitest конфиг с path alias `@` |

---

## Task 1: Инициализация Next.js проекта

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts` (генерируются create-next-app)
- Create: `vitest.config.ts`

- [ ] **Step 1: Инициализировать проект**

```bash
cd /Users/nichegosebe/toto-2026
npx create-next-app@latest . --typescript --tailwind --app --import-alias "@/*" --no-eslint --no-git --yes
```

Ожидаемый вывод: `Success! Created ...`

- [ ] **Step 2: Установить зависимости**

```bash
npm install next-auth@beta bcryptjs @prisma/client
npm install --save-dev prisma @types/bcryptjs vitest @vitejs/plugin-react
```

- [ ] **Step 3: Установить shadcn/ui**

```bash
npx shadcn@latest init --defaults
```

Выбрать стиль **Default**, базовый цвет **Slate**, CSS Variables: **Yes**.

Затем установить компоненты:
```bash
npx shadcn@latest add button input label card table dialog badge
```

- [ ] **Step 4: Создать vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
```

- [ ] **Step 5: Добавить test-скрипт в package.json**

В `package.json` в секцию `scripts` добавить:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Проверить что проект запускается**

```bash
npm run dev
```

Ожидаемый вывод: `▲ Next.js 14.x.x` + `Local: http://localhost:3000` (без ошибок)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 14 project with shadcn/ui and vitest"
```

---

## Task 2: Prisma схема и миграция

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env` (из шаблона)

- [ ] **Step 1: Инициализировать Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Создаст `prisma/schema.prisma` и добавит `DATABASE_URL` в `.env`.

- [ ] **Step 2: Написать schema.prisma**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id               String            @id @default(cuid())
  name             String
  email            String            @unique
  password         String
  isAdmin          Boolean           @default(false)
  predictions      Prediction[]
  bonusPredictions BonusPrediction[]
  createdAt        DateTime          @default(now())
}

model Match {
  id          String       @id @default(cuid())
  externalId  Int          @unique
  homeTeam    String
  awayTeam    String
  stage       Stage
  group       String?
  kickoff     DateTime
  homeScore   Int?
  awayScore   Int?
  winner      String?
  status      MatchStatus  @default(SCHEDULED)
  predictions Prediction[]
  updatedAt   DateTime     @updatedAt
}

model Prediction {
  id        String   @id @default(cuid())
  userId    String
  matchId   String
  homeScore Int
  awayScore Int
  winner    String?
  points    Int?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  match     Match    @relation(fields: [matchId], references: [id])

  @@unique([userId, matchId])
}

model BonusPrediction {
  id     String    @id @default(cuid())
  userId String
  type   BonusType
  team   String
  points Int?
  user   User      @relation(fields: [userId], references: [id])
}

enum Stage {
  GROUP
  R16
  QUARTERFINAL
  SEMIFINAL
  THIRD_PLACE
  FINAL
}

enum MatchStatus {
  SCHEDULED
  IN_PLAY
  PAUSED
  FINISHED
  POSTPONED
}

enum BonusType {
  SEMIFINAL
  FINALIST
  CHAMPION
}
```

- [ ] **Step 3: Создать и применить миграцию**

```bash
npx prisma migrate dev --name init
```

Ожидаемый вывод: `✔ Generated Prisma Client` + `Your database is now in sync with your schema.`

(Требуется запущенный PostgreSQL. Если нет локально: `docker run -d -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=toto2026 -p 5432:5432 postgres:16-alpine`, затем `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toto2026"`)

- [ ] **Step 4: Создать lib/db.ts**

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Prisma schema with User, Match, Prediction, BonusPrediction models"
```

---

## Task 3: NextAuth.js v5 — авторизация email+пароль

**Files:**
- Create: `lib/auth.ts`
- Create: `types/next-auth.d.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/api/auth/register/route.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Создать lib/auth.ts**

```typescript
// lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
  },
})
```

- [ ] **Step 2: Создать types/next-auth.d.ts**

```typescript
// types/next-auth.d.ts
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
    } & DefaultSession["user"]
  }

  interface User {
    isAdmin: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isAdmin: boolean
  }
}
```

- [ ] **Step 3: Создать API route для NextAuth**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 4: Создать endpoint регистрации**

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  })

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  )
}
```

- [ ] **Step 5: Создать middleware.ts**

```typescript
// middleware.ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
    return NextResponse.next()
  }

  const publicPaths = ["/", "/auth/login", "/auth/register"]
  if (!isAuthenticated && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  if (pathname.startsWith("/admin") && !req.auth?.user?.isAdmin) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 6: Добавить AUTH_SECRET в .env**

```bash
# Генерация случайного секрета
openssl rand -base64 32
```

Добавить в `.env`:
```
AUTH_SECRET=<сгенерированное_значение>
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: NextAuth v5 credentials provider, register endpoint, middleware"
```

---

## Task 4: Логика очков — TDD с Vitest

**Files:**
- Create: `__tests__/scoring.test.ts`
- Create: `lib/scoring.ts`

- [ ] **Step 1: Написать failing тесты**

```typescript
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
})
```

- [ ] **Step 2: Запустить тесты — убедиться что они падают**

```bash
npm test
```

Ожидаемый вывод: `FAIL __tests__/scoring.test.ts` с ошибкой `Cannot find module '@/lib/scoring'`

- [ ] **Step 3: Реализовать lib/scoring.ts**

```typescript
// lib/scoring.ts
export type Stage = "GROUP" | "R16" | "QUARTERFINAL" | "SEMIFINAL" | "THIRD_PLACE" | "FINAL"

export interface ScoringInput {
  stage: Stage
  predictedHome: number
  predictedAway: number
  actualHome: number
  actualAway: number
  predictedWinner?: string | null
  actualWinner?: string | null
}

type Outcome = "HOME" | "AWAY" | "DRAW"

function getOutcome(home: number, away: number): Outcome {
  if (home > away) return "HOME"
  if (away > home) return "AWAY"
  return "DRAW"
}

function goalError(pH: number, pA: number, aH: number, aA: number): number {
  return Math.abs(pH - aH) + Math.abs(pA - aA)
}

export function calculatePoints(input: ScoringInput): number {
  const { stage, predictedHome, predictedAway, actualHome, actualAway, predictedWinner, actualWinner } = input

  const isExactScore = predictedHome === actualHome && predictedAway === actualAway
  const isCorrectOutcome = getOutcome(predictedHome, predictedAway) === getOutcome(actualHome, actualAway)
  const isCorrectWinner = predictedWinner != null && predictedWinner === actualWinner

  if (stage === "GROUP") {
    if (!isCorrectOutcome) return 0
    if (isExactScore) return 11
    return Math.max(0, 10 - goalError(predictedHome, predictedAway, actualHome, actualAway))
  }

  if (stage === "FINAL") {
    if (isExactScore && isCorrectWinner) return 32
    let pts = 0
    if (isCorrectOutcome) pts += Math.max(0, 15 - goalError(predictedHome, predictedAway, actualHome, actualAway))
    if (isCorrectWinner) pts += 15
    return pts
  }

  // R16, QUARTERFINAL, SEMIFINAL, THIRD_PLACE
  if (isExactScore && isCorrectWinner) return 22
  let pts = 0
  if (isCorrectOutcome) pts += Math.max(0, 10 - goalError(predictedHome, predictedAway, actualHome, actualAway))
  if (isCorrectWinner) pts += 10
  return pts
}
```

- [ ] **Step 4: Запустить тесты — убедиться что все проходят**

```bash
npm test
```

Ожидаемый вывод: `✓ __tests__/scoring.test.ts (14 tests)` — все PASS

- [ ] **Step 5: Commit**

```bash
git add lib/scoring.ts __tests__/scoring.test.ts
git commit -m "feat: scoring logic with TDD — calculatePoints for all stages"
```

---

## Task 5: Клиент football-data.org

**Files:**
- Create: `lib/football-api.ts`

- [ ] **Step 1: Создать lib/football-api.ts**

```typescript
// lib/football-api.ts
const BASE_URL = "https://api.football-data.org/v4"
const WC_2026_ID = 2000

interface FDTeam {
  name: string
  shortName: string
}

interface FDScore {
  fullTime: { home: number | null; away: number | null }
}

export interface FDMatch {
  id: number
  homeTeam: FDTeam
  awayTeam: FDTeam
  status: string
  stage: string
  group?: string | null
  utcDate: string
  score: FDScore
}

async function fetchFD<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${path}`)
  }
  return res.json()
}

export async function getTodayMatches(): Promise<FDMatch[]> {
  const today = new Date().toISOString().split("T")[0]
  const data = await fetchFD<{ matches: FDMatch[] }>(
    `/competitions/${WC_2026_ID}/matches?dateFrom=${today}&dateTo=${today}`
  )
  return data.matches ?? []
}

export async function getAllMatches(): Promise<FDMatch[]> {
  const data = await fetchFD<{ matches: FDMatch[] }>(
    `/competitions/${WC_2026_ID}/matches`
  )
  return data.matches ?? []
}

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "GROUP",
  ROUND_OF_16: "R16",
  QUARTER_FINALS: "QUARTERFINAL",
  SEMI_FINALS: "SEMIFINAL",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
}

const STATUS_MAP: Record<string, string> = {
  SCHEDULED: "SCHEDULED",
  TIMED: "SCHEDULED",
  IN_PLAY: "IN_PLAY",
  PAUSED: "PAUSED",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
}

export function mapStage(fdStage: string): string {
  return STAGE_MAP[fdStage] ?? "GROUP"
}

export function mapStatus(fdStatus: string): string {
  return STATUS_MAP[fdStatus] ?? "SCHEDULED"
}
```

- [ ] **Step 2: Добавить FOOTBALL_DATA_API_KEY в .env.example**

```bash
# Зарегистрироваться бесплатно на https://www.football-data.org/
FOOTBALL_DATA_API_KEY=your_api_key_here
```

- [ ] **Step 3: Commit**

```bash
git add lib/football-api.ts
git commit -m "feat: football-data.org API client with stage/status mappers"
```

---

## Task 6: API роуты — predictions, leaderboard, grid, cron

**Files:**
- Create: `app/api/predictions/route.ts`
- Create: `app/api/leaderboard/route.ts`
- Create: `app/api/grid/route.ts`
- Create: `app/api/cron/sync-scores/route.ts`
- Create: `app/api/admin/trigger-sync/route.ts`

- [ ] **Step 1: Создать app/api/predictions/route.ts**

```typescript
// app/api/predictions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { matchId, homeScore, awayScore, winner } = await req.json()

  if (matchId == null || homeScore == null || awayScore == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }
  if (match.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Predictions closed for this match" }, { status: 422 })
  }

  try {
    const prediction = await prisma.prediction.create({
      data: {
        userId: session.user.id,
        matchId,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        winner: winner ?? null,
      },
    })
    return NextResponse.json(prediction, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Prediction already submitted" }, { status: 409 })
    }
    throw e
  }
}
```

- [ ] **Step 2: Создать app/api/leaderboard/route.ts**

```typescript
// app/api/leaderboard/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      predictions: {
        select: {
          points: true,
          match: { select: { stage: true } },
        },
      },
      bonusPredictions: {
        select: { points: true },
      },
    },
  })

  const leaderboard = users
    .map((user) => {
      const matchPts = user.predictions.reduce((s, p) => s + (p.points ?? 0), 0)
      const bonusPts = user.bonusPredictions.reduce((s, b) => s + (b.points ?? 0), 0)
      const groupPts = user.predictions
        .filter((p) => p.match.stage === "GROUP")
        .reduce((s, p) => s + (p.points ?? 0), 0)
      const exactCount = user.predictions.filter((p) =>
        p.points === 11 || p.points === 22 || p.points === 32
      ).length

      return {
        id: user.id,
        name: user.name,
        total: matchPts + bonusPts,
        matchPoints: matchPts,
        groupPoints: groupPts,
        bonusPoints: bonusPts,
        exactCount,
      }
    })
    .sort((a, b) => b.total - a.total || b.exactCount - a.exactCount)

  return NextResponse.json(leaderboard)
}
```

- [ ] **Step 3: Создать app/api/grid/route.ts**

```typescript
// app/api/grid/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: {
      predictions: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  })

  const result = matches.map((match) => ({
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    stage: match.stage,
    group: match.group,
    kickoff: match.kickoff,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    predictions: match.predictions
      .filter((p) => match.status === "FINISHED" || p.userId === session.user.id)
      .map((p) => ({
        userId: p.userId,
        userName: p.user.name,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        winner: p.winner,
        points: p.points,
      })),
  }))

  return NextResponse.json(result)
}
```

- [ ] **Step 4: Создать app/api/cron/sync-scores/route.ts**

```typescript
// app/api/cron/sync-scores/route.ts
import { NextRequest, NextResponse } from "next/server"
import type { Stage as PrismaStage, MatchStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getTodayMatches, getAllMatches, mapStage, mapStatus } from "@/lib/football-api"
import { calculatePoints } from "@/lib/scoring"
import type { Stage } from "@/lib/scoring"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "today"
  const fdMatches = mode === "all" ? await getAllMatches() : await getTodayMatches()

  let updatedMatches = 0

  for (const fdMatch of fdMatches) {
    const stage = mapStage(fdMatch.stage)
    const status = mapStatus(fdMatch.status)
    const homeScore = fdMatch.score.fullTime.home
    const awayScore = fdMatch.score.fullTime.away

    const match = await prisma.match.upsert({
      where: { externalId: fdMatch.id },
      create: {
        externalId: fdMatch.id,
        homeTeam: fdMatch.homeTeam.name,
        awayTeam: fdMatch.awayTeam.name,
        stage: stage as PrismaStage,
        group: fdMatch.group ?? null,
        kickoff: new Date(fdMatch.utcDate),
        homeScore,
        awayScore,
        status: status as MatchStatus,
      },
      update: {
        homeScore,
        awayScore,
        status: status as MatchStatus,
        homeTeam: fdMatch.homeTeam.name,
        awayTeam: fdMatch.awayTeam.name,
      },
    })

    if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
      const predictions = await prisma.prediction.findMany({
        where: { matchId: match.id },
      })

      for (const pred of predictions) {
        const points = calculatePoints({
          stage: stage as Stage,
          predictedHome: pred.homeScore,
          predictedAway: pred.awayScore,
          actualHome: homeScore,
          actualAway: awayScore,
          predictedWinner: pred.winner,
          actualWinner: match.winner,
        })
        await prisma.prediction.update({
          where: { id: pred.id },
          data: { points },
        })
      }

      updatedMatches++
    }
  }

  return NextResponse.json({ success: true, updatedMatches })
}
```

- [ ] **Step 5: Создать app/api/admin/trigger-sync/route.ts**

```typescript
// app/api/admin/trigger-sync/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const res = await fetch(
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/cron/sync-scores?mode=all`,
    {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }
  )

  const data = await res.json()
  return NextResponse.json(data)
}
```

- [ ] **Step 6: Добавить CRON_SECRET в .env**

```bash
CRON_SECRET=<любая_строка_минимум_32_символа>
```

- [ ] **Step 7: Commit**

```bash
git add app/api/
git commit -m "feat: API routes — predictions, leaderboard, grid, cron sync"
```

---

## Task 7: Layout, Navbar, Providers

**Files:**
- Create: `components/providers.tsx`
- Create: `components/navbar.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Создать components/providers.tsx**

```tsx
// components/providers.tsx
"use client"

import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

- [ ] **Step 2: Создать components/navbar.tsx**

```tsx
// components/navbar.tsx
import Link from "next/link"
import { auth, signOut } from "@/lib/auth"

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-yellow-400 hover:text-yellow-300">
          ⚽ Тото 2026
        </Link>
        <div className="flex items-center gap-6 text-sm">
          {session ? (
            <>
              <Link href="/matches" className="text-gray-300 hover:text-white transition-colors">
                Матчи
              </Link>
              <Link href="/leaderboard" className="text-gray-300 hover:text-white transition-colors">
                Рейтинг
              </Link>
              <Link href="/grid" className="text-gray-300 hover:text-white transition-colors">
                Сетка
              </Link>
              <Link href="/profile" className="text-gray-300 hover:text-white transition-colors">
                Мои прогнозы
              </Link>
              {session.user.isAdmin && (
                <Link href="/admin" className="text-orange-400 hover:text-orange-300 transition-colors">
                  Админ
                </Link>
              )}
              <span className="text-gray-500">{session.user.name}</span>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <button
                  type="submit"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth/login" className="text-yellow-400 hover:text-yellow-300 font-medium">
              Войти
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Обновить app/layout.tsx**

```tsx
// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: "Тото 2026",
  description: "Футбольный тотализатор Чемпионата мира 2026",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <Providers>
          <Navbar />
          <main className="container mx-auto px-4 py-8 max-w-7xl">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Настроить тёмную тему в globals.css**

В `app/globals.css` добавить после существующих CSS переменных:

```css
@layer base {
  :root {
    --background: 222 84% 5%;
    --foreground: 210 40% 98%;
  }
  
  body {
    @apply bg-gray-950 text-gray-100;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add components/navbar.tsx components/providers.tsx app/layout.tsx app/globals.css
git commit -m "feat: dark layout, server-side Navbar with auth state"
```

---

## Task 8: Страницы авторизации (login + register)

**Files:**
- Create: `app/auth/login/page.tsx`
- Create: `app/auth/register/page.tsx`

- [ ] **Step 1: Создать app/auth/login/page.tsx**

```tsx
// app/auth/login/page.tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Неверный email или пароль")
    } else {
      router.push("/matches")
      router.refresh()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-center">⚽ Тото 2026</CardTitle>
          <CardDescription className="text-center text-gray-400">
            Войдите в систему
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                required
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-800 border-gray-700"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-4">
            Нет аккаунта?{" "}
            <Link href="/auth/register" className="text-yellow-400 hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Создать app/auth/register/page.tsx**

```tsx
// app/auth/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Ошибка регистрации")
    } else {
      router.push("/auth/login")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-center">⚽ Тото 2026</CardTitle>
          <CardDescription className="text-center text-gray-400">
            Регистрация
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                required
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                required
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-4">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="text-yellow-400 hover:underline">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/auth/
git commit -m "feat: login and register pages"
```

---

## Task 9: Главная страница и match-card

**Files:**
- Create: `app/page.tsx`
- Create: `components/match-card.tsx`

- [ ] **Step 1: Создать components/match-card.tsx**

```tsx
// components/match-card.tsx
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface MatchCardProps {
  match: {
    id: string
    homeTeam: string
    awayTeam: string
    stage: string
    group?: string | null
    kickoff: Date
    homeScore?: number | null
    awayScore?: number | null
    status: string
  }
  hasPrediction?: boolean
  prediction?: { homeScore: number; awayScore: number; points?: number | null } | null
}

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Группа",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "За 3-е место",
  FINAL: "Финал",
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-gray-700",
  IN_PLAY: "bg-green-700 animate-pulse",
  PAUSED: "bg-yellow-700",
  FINISHED: "bg-gray-800",
  POSTPONED: "bg-red-900",
}

export function MatchCard({ match, hasPrediction, prediction }: MatchCardProps) {
  const kickoff = new Date(match.kickoff)
  const stageLabel = match.stage === "GROUP" && match.group
    ? `Группа ${match.group}`
    : STAGE_LABELS[match.stage] ?? match.stage

  const isFinished = match.status === "FINISHED"
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED"
  const canPredict = match.status === "SCHEDULED" && !hasPrediction

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="text-xs text-gray-400 border-gray-700">
          {stageLabel}
        </Badge>
        <span className="text-xs text-gray-500">
          {kickoff.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}{" "}
          {kickoff.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold text-sm flex-1">{match.homeTeam}</span>

        <div className={`px-3 py-1 rounded text-center min-w-[60px] ${STATUS_COLORS[match.status]}`}>
          {isFinished || isLive ? (
            <span className="font-bold text-lg">
              {match.homeScore ?? 0}:{match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-gray-400 text-sm">vs</span>
          )}
        </div>

        <span className="font-semibold text-sm flex-1 text-right">{match.awayTeam}</span>
      </div>

      {prediction && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Мой прогноз: <span className="text-white font-medium">{prediction.homeScore}:{prediction.awayScore}</span>
          </span>
          {prediction.points != null && (
            <Badge className={prediction.points > 0 ? "bg-green-800 text-green-200" : "bg-gray-800 text-gray-400"}>
              {prediction.points > 0 ? `+${prediction.points}` : prediction.points}
            </Badge>
          )}
        </div>
      )}

      {hasPrediction && !prediction && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <span className="text-green-400 text-sm">✓ Прогноз сдан</span>
        </div>
      )}

      {canPredict && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <Link href={`/matches/${match.id}`}>
            <Button size="sm" variant="outline" className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-900/20">
              Сделать прогноз
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Создать app/page.tsx**

```tsx
// app/page.tsx
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchCard } from "@/components/match-card"
import { Button } from "@/components/ui/button"

export default async function HomePage() {
  const session = await auth()

  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const upcomingMatches = await prisma.match.findMany({
    where: {
      kickoff: { gte: now, lte: threeDaysLater },
    },
    orderBy: { kickoff: "asc" },
    take: 6,
  })

  let userPredictions: Record<string, boolean> = {}
  if (session?.user?.id) {
    const preds = await prisma.prediction.findMany({
      where: {
        userId: session.user.id,
        matchId: { in: upcomingMatches.map((m) => m.id) },
      },
      select: { matchId: true },
    })
    userPredictions = Object.fromEntries(preds.map((p) => [p.matchId, true]))
  }

  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">⚽ Тото 2026</h1>
        <p className="text-gray-400 text-lg">Футбольный тотализатор Чемпионата мира 2026</p>
        {!session && (
          <div className="mt-6 flex gap-4 justify-center">
            <Link href="/auth/login">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                Войти
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" className="border-gray-600">
                Зарегистрироваться
              </Button>
            </Link>
          </div>
        )}
      </section>

      {upcomingMatches.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Ближайшие матчи</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                hasPrediction={userPredictions[match.id] ?? false}
              />
            ))}
          </div>
        </section>
      )}

      {session && (
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/matches">
            <Button variant="outline" className="border-gray-700">Все матчи</Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="outline" className="border-gray-700">Рейтинг</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx components/match-card.tsx
git commit -m "feat: homepage with upcoming matches, MatchCard component"
```

---

## Task 10: Страница матчей + форма прогноза

**Files:**
- Create: `app/matches/page.tsx`
- Create: `app/matches/[id]/page.tsx`
- Create: `components/prediction-form.tsx`

- [ ] **Step 1: Создать components/prediction-form.tsx**

```tsx
// components/prediction-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PredictionFormProps {
  matchId: string
  homeTeam: string
  awayTeam: string
  isPlayoff: boolean
}

export function PredictionForm({ matchId, homeTeam, awayTeam, isPlayoff }: PredictionFormProps) {
  const router = useRouter()
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [winner, setWinner] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    if (!homeScore || !awayScore) return
    if (isPlayoff && !winner) return
    setShowConfirm(true)
  }

  async function handleConfirm() {
    setSubmitting(true)
    setError("")

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        winner: isPlayoff ? winner : null,
      }),
    })

    setSubmitting(false)

    if (res.ok) {
      setShowConfirm(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? "Ошибка при сохранении")
      setShowConfirm(false)
    }
  }

  const isTied = homeScore && awayScore && homeScore === awayScore

  return (
    <>
      <form onSubmit={handleSubmitClick} className="space-y-6">
        <div className="flex items-center gap-4 justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">{homeTeam}</p>
            <Input
              type="number"
              min="0"
              max="30"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="w-20 text-center text-2xl font-bold bg-gray-800 border-gray-700 h-14"
              required
            />
          </div>
          <span className="text-2xl text-gray-500 mt-6">:</span>
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">{awayTeam}</p>
            <Input
              type="number"
              min="0"
              max="30"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="w-20 text-center text-2xl font-bold bg-gray-800 border-gray-700 h-14"
              required
            />
          </div>
        </div>

        {isPlayoff && (
          <div className="space-y-2">
            <Label>Победитель (включая пенальти)</Label>
            <div className="flex gap-3">
              {[homeTeam, awayTeam].map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => setWinner(team)}
                  className={`flex-1 py-2 px-4 rounded border text-sm font-medium transition-colors ${
                    winner === team
                      ? "border-yellow-500 bg-yellow-900/30 text-yellow-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
            {isTied && !winner && (
              <p className="text-yellow-400 text-xs">
                При ничьей укажите победителя (в серии пенальти)
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          type="submit"
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          disabled={!homeScore || !awayScore || (isPlayoff && !winner)}
        >
          Сохранить прогноз
        </Button>
      </form>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle>Подтвердите прогноз</DialogTitle>
            <DialogDescription className="text-gray-400">
              Вы уверены? Изменить прогноз будет невозможно.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-2xl font-bold">
              {homeTeam} <span className="text-yellow-400">{homeScore}:{awayScore}</span> {awayTeam}
            </p>
            {winner && (
              <p className="text-sm text-gray-400 mt-2">Победитель: {winner}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="border-gray-700"
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              {submitting ? "Сохранение..." : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Создать app/matches/page.tsx**

```tsx
// app/matches/page.tsx
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchCard } from "@/components/match-card"
import { Stage } from "@prisma/client"

const STAGE_ORDER: Stage[] = ["GROUP", "R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"]
const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Групповой этап",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "Матч за 3-е место",
  FINAL: "Финал",
}

export default async function MatchesPage() {
  const session = await auth()

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
  })

  let userPredictions: Record<string, { homeScore: number; awayScore: number; points?: number | null }> = {}
  if (session?.user?.id) {
    const preds = await prisma.prediction.findMany({
      where: { userId: session.user.id },
      select: { matchId: true, homeScore: true, awayScore: true, points: true },
    })
    userPredictions = Object.fromEntries(preds.map((p) => [p.matchId, p]))
  }

  const grouped = STAGE_ORDER.reduce((acc, stage) => {
    const stageMatches = matches.filter((m) => m.stage === stage)
    if (stageMatches.length > 0) acc[stage] = stageMatches
    return acc
  }, {} as Record<Stage, typeof matches>)

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Все матчи</h1>

      {(Object.entries(grouped) as [Stage, typeof matches][]).map(([stage, stageMatches]) => (
        <section key={stage}>
          <h2 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-800 pb-2">
            {STAGE_LABELS[stage]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stageMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                hasPrediction={match.id in userPredictions}
                prediction={userPredictions[match.id] ?? null}
              />
            ))}
          </div>
        </section>
      ))}

      {matches.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Матчи ещё не загружены</p>
          <p className="text-sm mt-2">Данные появятся после синхронизации с football-data.org</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Создать app/matches/[id]/page.tsx**

```tsx
// app/matches/[id]/page.tsx
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PredictionForm } from "@/components/prediction-form"
import { Badge } from "@/components/ui/badge"

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Групповой этап",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "Матч за 3-е место",
  FINAL: "Финал",
}

const PLAYOFF_STAGES = new Set(["R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"])

export default async function MatchPage({ params }: { params: { id: string } }) {
  const session = await auth()

  const match = await prisma.match.findUnique({
    where: { id: params.id },
  })

  if (!match) notFound()

  const existingPrediction = session?.user?.id
    ? await prisma.prediction.findUnique({
        where: { userId_matchId: { userId: session.user.id, matchId: match.id } },
      })
    : null

  const kickoff = new Date(match.kickoff)
  const stageLabel = match.stage === "GROUP" && match.group
    ? `Группа ${match.group}`
    : STAGE_LABELS[match.stage] ?? match.stage

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <Badge variant="outline" className="mb-4 border-gray-700 text-gray-400">
          {stageLabel}
        </Badge>
        <h1 className="text-3xl font-bold">
          {match.homeTeam} — {match.awayTeam}
        </h1>
        <p className="text-gray-400 mt-2">
          {kickoff.toLocaleDateString("ru-RU", {
            weekday: "long", day: "numeric", month: "long",
          })}{" "}
          в {kickoff.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {match.status === "FINISHED" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm mb-2">Результат</p>
          <p className="text-4xl font-bold">
            {match.homeScore}:{match.awayScore}
          </p>
          {match.winner && <p className="text-yellow-400 mt-2">Победитель: {match.winner}</p>}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        {existingPrediction ? (
          <div className="text-center space-y-3">
            <p className="text-green-400 text-lg font-semibold">✓ Прогноз сдан</p>
            <p className="text-3xl font-bold">
              {existingPrediction.homeScore}:{existingPrediction.awayScore}
            </p>
            {existingPrediction.winner && (
              <p className="text-gray-400 text-sm">Победитель: {existingPrediction.winner}</p>
            )}
            {existingPrediction.points != null && (
              <p className={`text-xl font-bold ${existingPrediction.points > 0 ? "text-green-400" : "text-gray-500"}`}>
                {existingPrediction.points > 0 ? `+${existingPrediction.points}` : existingPrediction.points} очков
              </p>
            )}
          </div>
        ) : match.status === "SCHEDULED" ? (
          <>
            <h2 className="text-lg font-semibold mb-4">Ваш прогноз</h2>
            <PredictionForm
              matchId={match.id}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              isPlayoff={PLAYOFF_STAGES.has(match.stage)}
            />
          </>
        ) : (
          <p className="text-center text-gray-500">Приём прогнозов закрыт</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/matches/ components/prediction-form.tsx
git commit -m "feat: matches list page, match detail page, prediction form with confirmation dialog"
```

---

## Task 11: Страница рейтинга

**Files:**
- Create: `app/leaderboard/page.tsx`
- Create: `components/leaderboard-table.tsx`

- [ ] **Step 1: Создать components/leaderboard-table.tsx**

```tsx
// components/leaderboard-table.tsx
import { Badge } from "@/components/ui/badge"

interface LeaderboardEntry {
  id: string
  name: string
  total: number
  matchPoints: number
  groupPoints: number
  bonusPoints: number
  exactCount: number
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

const MEDALS = ["🥇", "🥈", "🥉"]

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="py-3 px-2 w-8">#</th>
            <th className="py-3 px-2">Участник</th>
            <th className="py-3 px-2 text-right">Итого</th>
            <th className="py-3 px-2 text-right hidden md:table-cell">Матчи</th>
            <th className="py-3 px-2 text-right hidden md:table-cell">Бонусы</th>
            <th className="py-3 px-2 text-right hidden sm:table-cell">100%</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isCurrentUser = entry.id === currentUserId
            return (
              <tr
                key={entry.id}
                className={`border-b border-gray-800/50 ${
                  isCurrentUser ? "bg-yellow-900/10" : "hover:bg-gray-900/50"
                }`}
              >
                <td className="py-3 px-2 text-gray-400">
                  {MEDALS[index] ?? index + 1}
                </td>
                <td className="py-3 px-2 font-medium">
                  {entry.name}
                  {isCurrentUser && (
                    <Badge variant="outline" className="ml-2 text-xs border-yellow-700 text-yellow-500">
                      Вы
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-2 text-right font-bold text-yellow-400 text-base">
                  {entry.total}
                </td>
                <td className="py-3 px-2 text-right text-gray-300 hidden md:table-cell">
                  {entry.matchPoints}
                </td>
                <td className="py-3 px-2 text-right text-gray-300 hidden md:table-cell">
                  {entry.bonusPoints > 0 ? `+${entry.bonusPoints}` : "—"}
                </td>
                <td className="py-3 px-2 text-right text-green-400 hidden sm:table-cell">
                  {entry.exactCount}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Создать app/leaderboard/page.tsx**

```tsx
// app/leaderboard/page.tsx
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { LeaderboardTable } from "@/components/leaderboard-table"

export default async function LeaderboardPage() {
  const session = await auth()

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      predictions: {
        select: {
          points: true,
          match: { select: { stage: true } },
        },
      },
      bonusPredictions: {
        select: { points: true },
      },
    },
  })

  const entries = users
    .map((user) => {
      const matchPts = user.predictions.reduce((s, p) => s + (p.points ?? 0), 0)
      const bonusPts = user.bonusPredictions.reduce((s, b) => s + (b.points ?? 0), 0)
      const groupPts = user.predictions
        .filter((p) => p.match.stage === "GROUP")
        .reduce((s, p) => s + (p.points ?? 0), 0)
      const exactCount = user.predictions.filter((p) =>
        p.points === 11 || p.points === 22 || p.points === 32
      ).length
      return {
        id: user.id,
        name: user.name,
        total: matchPts + bonusPts,
        matchPoints: matchPts,
        groupPoints: groupPts,
        bonusPoints: bonusPts,
        exactCount,
      }
    })
    .sort((a, b) => b.total - a.total || b.exactCount - a.exactCount)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Рейтинг участников</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <LeaderboardTable entries={entries} currentUserId={session?.user?.id} />
        {entries.length === 0 && (
          <p className="text-center text-gray-500 py-8">Данных пока нет</p>
        )}
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <p><strong>Итого</strong> = очки за матчи + бонусные очки</p>
        <p><strong>100%</strong> = количество точных прогнозов (11/22/32 очка)</p>
        <p>При равенстве: сначала больше точных прогнозов</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/leaderboard/ components/leaderboard-table.tsx
git commit -m "feat: leaderboard page with ranking table"
```

---

## Task 12: Сводная сетка прогнозов (/grid)

**Files:**
- Create: `app/grid/page.tsx`
- Create: `components/predictions-grid.tsx`

- [ ] **Step 1: Создать components/predictions-grid.tsx**

```tsx
// components/predictions-grid.tsx
"use client"

interface GridMatch {
  id: string
  homeTeam: string
  awayTeam: string
  stage: string
  group?: string | null
  kickoff: Date
  homeScore?: number | null
  awayScore?: number | null
  status: string
  predictions: {
    userId: string
    userName: string
    homeScore: number
    awayScore: number
    winner?: string | null
    points?: number | null
  }[]
}

interface PredictionsGridProps {
  matches: GridMatch[]
  participants: { id: string; name: string }[]
  currentUserId: string
}

export function PredictionsGrid({ matches, participants, currentUserId }: PredictionsGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-gray-950 z-10 min-w-[120px] text-left py-2 px-3 border-b border-r border-gray-800 text-gray-400">
              Участник
            </th>
            <th className="min-w-[60px] text-center py-2 px-2 border-b border-gray-800 text-gray-400">
              Итого
            </th>
            {matches.map((match) => (
              <th
                key={match.id}
                className="min-w-[72px] text-center py-2 px-2 border-b border-gray-800 border-l border-gray-800/50"
              >
                <div className="text-gray-400 text-xs leading-tight">
                  <div>{match.homeTeam.slice(0, 3).toUpperCase()}</div>
                  <div className="text-gray-600">vs</div>
                  <div>{match.awayTeam.slice(0, 3).toUpperCase()}</div>
                  {match.status === "FINISHED" && (
                    <div className="text-yellow-400 font-bold mt-1">
                      {match.homeScore}:{match.awayScore}
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => {
            const totalPoints = matches.reduce((sum, match) => {
              const pred = match.predictions.find((p) => p.userId === participant.id)
              return sum + (pred?.points ?? 0)
            }, 0)

            return (
              <tr
                key={participant.id}
                className={`border-b border-gray-800/50 ${
                  participant.id === currentUserId ? "bg-yellow-900/10" : "hover:bg-gray-900/30"
                }`}
              >
                <td className="sticky left-0 bg-gray-950 z-10 py-2 px-3 border-r border-gray-800 font-medium whitespace-nowrap">
                  {participant.name}
                  {participant.id === currentUserId && (
                    <span className="text-yellow-500 ml-1 text-xs">★</span>
                  )}
                </td>
                <td className="py-2 px-2 text-center font-bold text-yellow-400">
                  {totalPoints || "—"}
                </td>
                {matches.map((match) => {
                  const pred = match.predictions.find((p) => p.userId === participant.id)
                  const isOwn = participant.id === currentUserId
                  const isFinished = match.status === "FINISHED"
                  const showPred = pred && (isOwn || isFinished)

                  return (
                    <td
                      key={match.id}
                      className="py-2 px-2 text-center border-l border-gray-800/50"
                    >
                      {showPred ? (
                        <div>
                          <div className="font-medium">
                            {pred.homeScore}:{pred.awayScore}
                          </div>
                          {pred.points != null && (
                            <div
                              className={`text-xs font-bold ${
                                pred.points > 0 ? "text-green-400" : "text-gray-600"
                              }`}
                            >
                              {pred.points > 0 ? `+${pred.points}` : pred.points}
                            </div>
                          )}
                        </div>
                      ) : pred ? (
                        <span className="text-gray-700">●</span>
                      ) : (
                        <span className="text-gray-800">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Создать app/grid/page.tsx**

```tsx
// app/grid/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { PredictionsGrid } from "@/components/predictions-grid"

export default async function GridPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: {
      predictions: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  })

  const participants = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const gridData = matches.map((match) => ({
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    stage: match.stage,
    group: match.group,
    kickoff: match.kickoff,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    predictions: match.predictions
      .filter((p) => match.status === "FINISHED" || p.userId === session.user.id)
      .map((p) => ({
        userId: p.userId,
        userName: p.user.name,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        winner: p.winner,
        points: p.points,
      })),
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Сетка прогнозов</h1>
      <p className="text-sm text-gray-400">
        Чужие прогнозы скрыты до окончания матча
      </p>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <PredictionsGrid
          matches={gridData}
          participants={participants}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/grid/ components/predictions-grid.tsx
git commit -m "feat: predictions grid page with hidden-until-finished logic"
```

---

## Task 13: Страница "Мои прогнозы"

**Files:**
- Create: `app/profile/page.tsx`

- [ ] **Step 1: Создать app/profile/page.tsx**

```tsx
// app/profile/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id },
    orderBy: { match: { kickoff: "asc" } },
    include: {
      match: true,
    },
  })

  const totalPoints = predictions.reduce((s, p) => s + (p.points ?? 0), 0)
  const exactCount = predictions.filter(
    (p) => p.points === 11 || p.points === 22 || p.points === 32
  ).length
  const doneCount = predictions.filter((p) => p.points != null).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{session.user.name}</h1>
        <p className="text-gray-400 text-sm">{session.user.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{totalPoints}</p>
          <p className="text-sm text-gray-400 mt-1">Очков всего</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{exactCount}</p>
          <p className="text-sm text-gray-400 mt-1">Точных (100%)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold">{predictions.length}</p>
          <p className="text-sm text-gray-400 mt-1">Прогнозов сдано</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Мои прогнозы</h2>
        {predictions.map((pred) => {
          const isFinished = pred.match.status === "FINISHED"
          return (
            <div
              key={pred.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-sm">
                  {pred.match.homeTeam} — {pred.match.awayTeam}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {new Date(pred.match.kickoff).toLocaleDateString("ru-RU", {
                    day: "numeric", month: "short",
                  })}
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <span className="font-bold">
                  {pred.homeScore}:{pred.awayScore}
                </span>
                {isFinished && (
                  <Badge
                    className={pred.points && pred.points > 0
                      ? "bg-green-800 text-green-200"
                      : "bg-gray-800 text-gray-400"}
                  >
                    {pred.points != null
                      ? (pred.points > 0 ? `+${pred.points}` : pred.points)
                      : "—"}
                  </Badge>
                )}
                {!isFinished && (
                  <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">
                    ожидается
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
        {predictions.length === 0 && (
          <p className="text-gray-500 text-center py-8">У вас пока нет прогнозов</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/profile/page.tsx
git commit -m "feat: profile page with personal predictions and stats"
```

---

## Task 14: Админ-панель

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Создать app/admin/page.tsx**

```tsx
// app/admin/page.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface AdminUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
  _count: { predictions: number }
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then(setUsers)
  }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch("/api/admin/trigger-sync", { method: "POST" })
    const data = await res.json()
    setSyncing(false)
    setSyncResult(
      data.success
        ? `Синхронизировано. Обновлено матчей: ${data.updatedMatches}`
        : `Ошибка: ${data.error}`
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Панель администратора</h1>

      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Синхронизация данных</h2>
        <p className="text-sm text-gray-400">
          Загрузить актуальные результаты матчей с football-data.org
        </p>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="bg-orange-600 hover:bg-orange-500"
        >
          {syncing ? "Синхронизация..." : "Обновить данные"}
        </Button>
        {syncResult && (
          <p className={`text-sm ${syncResult.startsWith("Ошибка") ? "text-red-400" : "text-green-400"}`}>
            {syncResult}
          </p>
        )}
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Участники ({users.length})</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between py-2 border-b border-gray-800/50"
            >
              <div>
                <span className="font-medium">{user.name}</span>
                <span className="text-gray-400 text-sm ml-2">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {user._count.predictions} прогнозов
                </span>
                {user.isAdmin && (
                  <Badge variant="outline" className="border-orange-700 text-orange-400 text-xs">
                    admin
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Создать app/api/admin/users/route.ts**

```typescript
// app/api/admin/users/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      _count: { select: { predictions: true } },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(users)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/ app/api/admin/
git commit -m "feat: admin panel with user list and manual sync trigger"
```

---

## Task 15: Vercel конфигурация и .env.example

**Files:**
- Create: `vercel.json`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Создать vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-scores?mode=today",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/sync-scores?mode=all",
      "schedule": "0 3 * * *"
    }
  ]
}
```

- [ ] **Step 2: Создать .env.example**

```bash
# Обязательные
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toto2026"
AUTH_SECRET="сгенерировать-через-openssl-rand-base64-32"

# football-data.org (бесплатная регистрация на https://www.football-data.org/)
FOOTBALL_DATA_API_KEY="your_api_key_here"

# Vercel Cron защита (любая случайная строка)
CRON_SECRET="your_cron_secret_here"

# Для локальной разработки
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3: Проверить .gitignore**

Убедиться что в `.gitignore` есть:
```
.env
.env.local
```

- [ ] **Step 4: Итоговый запуск тестов**

```bash
npm test
```

Ожидаемый вывод: все 14 тестов PASS

- [ ] **Step 5: Итоговый build**

```bash
npm run build
```

Ожидаемый вывод: `✓ Compiled successfully` без TypeScript ошибок

- [ ] **Step 6: Финальный commit**

```bash
git add vercel.json .env.example
git commit -m "feat: Vercel cron config and env.example — MVP complete"
```

---

## Чеклист после завершения

- [ ] `npm test` — все 14 тестов проходят
- [ ] `npm run build` — TypeScript ошибок нет
- [ ] `npm run dev` — приложение запускается
- [ ] Регистрация нового пользователя работает
- [ ] Вход / выход работает
- [ ] `/matches` показывает матчи (после синхронизации)
- [ ] Прогноз принимается один раз, второй POST возвращает 409
- [ ] `/grid` скрывает чужие прогнозы до окончания матча
- [ ] `/leaderboard` отображает рейтинг
- [ ] `/admin` доступен только admin-пользователям

---

## Открытые вопросы

1. **API ключ** football-data.org — зарегистрироваться на https://www.football-data.org/ (бесплатно, лимит 10 req/min)
2. **Список участников** — пользователь предоставит отдельно; добавить через `/api/auth/register` или напрямую в БД
3. **БД для прода** — Vercel Postgres или Railway (подключить через `DATABASE_URL` в env)
4. **Бонусные прогнозы** — хранение реализовано, UI и расчёт баллов — следующий шаг после MVP
