# Toto 2026 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переоформить все страницы Тото 2026 в единый спортивный стиль — тёмный фон `#0a0a0a`, золотой акцент `yellow-400`, заглавные заголовки, двухстрочный навбар с мобильным скроллом вкладок.

**Architecture:** Только изменения стилей и JSX — никакой бизнес-логики, API и БД не трогаем. Навбар разбивается на серверный `Navbar` (использует `auth()`) и клиентский `NavTabs` (использует `usePathname()` для активной вкладки). Auth-страницы переписываются без shadcn `Card` — нативные `<input>` и `<button>`. Каждый таск — отдельный коммит.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v4, TypeScript

---

## File Map

| Действие | Файл |
|----------|------|
| Create | `components/nav-tabs.tsx` |
| Modify | `components/navbar.tsx` |
| Modify | `app/layout.tsx` |
| Modify | `app/auth/register/page.tsx` |
| Modify | `app/auth/login/page.tsx` |
| Modify | `app/page.tsx` |
| Modify | `components/match-card.tsx` |
| Modify | `components/matches-tabs.tsx` |
| Modify | `app/matches/page.tsx` |
| Modify | `app/leaderboard/page.tsx` |
| Modify | `app/profile/page.tsx` |
| Modify | `app/bonus/page.tsx` |
| Modify | `app/standings/page.tsx` |
| Modify | `app/grid/page.tsx` |
| Modify | `app/rules/page.tsx` |

---

### Task 1: Навбар — NavTabs + Navbar

**Files:**
- Create: `components/nav-tabs.tsx`
- Modify: `components/navbar.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Создать `components/nav-tabs.tsx`**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/matches", label: "МАТЧИ" },
  { href: "/leaderboard", label: "РЕЙТИНГ" },
  { href: "/profile", label: "ПРОФИЛЬ" },
  { href: "/standings", label: "ГРУППЫ" },
  { href: "/grid", label: "СЕТКА" },
  { href: "/bonus", label: "БОНУС" },
  { href: "/rules", label: "ПРАВИЛА" },
]

export function NavTabs({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  return (
    <div className="relative border-t border-[#1a1500]">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "px-4 py-2 text-[10px] tracking-widest whitespace-nowrap border-b-2 -mb-px transition-colors duration-150",
                pathname.startsWith(tab.href)
                  ? "text-yellow-400 border-yellow-400"
                  : "text-gray-700 border-transparent hover:text-gray-500",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="px-4 py-2 text-[10px] tracking-widest whitespace-nowrap border-b-2 -mb-px border-transparent text-orange-600 hover:text-orange-500 transition-colors duration-150"
            >
              АДМИН
            </Link>
          )}
        </div>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-[#0a0a0a] pointer-events-none" />
    </div>
  )
}
```

- [ ] **Step 2: Переписать `components/navbar.tsx`**

```tsx
import Link from "next/link"
import { auth, signOut } from "@/lib/auth"
import { NavTabs } from "@/components/nav-tabs"

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="bg-[#0a0a0a] border-b-2 border-[#1a1500]">
      {/* Строка 1: Лого + пользователь */}
      <div className="container mx-auto px-4 flex items-center justify-between h-11">
        <Link
          href="/"
          className="text-sm font-black text-yellow-400 tracking-widest hover:text-yellow-300 transition-colors"
        >
          ⚽ ТОТО 2026
        </Link>
        {session ? (
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-600 tracking-widest hidden sm:inline">
              {session.user.name?.split(" ")[0].toUpperCase()}
            </span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <button
                type="submit"
                className="text-[10px] text-gray-700 hover:text-gray-400 tracking-widest transition-colors"
              >
                ВЫЙТИ
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="text-[10px] text-yellow-400 font-bold tracking-widest hover:text-yellow-300 transition-colors"
          >
            ВОЙТИ
          </Link>
        )}
      </div>

      {/* Строка 2: Скролл-вкладки (только залогиненным) */}
      {session && <NavTabs isAdmin={session.user.isAdmin ?? false} />}
    </nav>
  )
}
```

- [ ] **Step 3: Обновить body className в `app/layout.tsx`**

Заменить строку с `body`:
```tsx
// Было:
<body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
// Стало:
<body className={`${inter.className} bg-[#0a0a0a] text-gray-100 min-h-screen overflow-x-hidden`}>
```

- [ ] **Step 4: Проверить сборку**

```bash
cd /Users/nichegosebe/toto-2026 && npm run build
```
Ожидаем: успешная сборка без ошибок TypeScript.

- [ ] **Step 5: Коммит**

```bash
cd /Users/nichegosebe/toto-2026
git add components/nav-tabs.tsx components/navbar.tsx app/layout.tsx
git commit -m "feat(ui): two-row navbar with mobile-scrollable tabs"
```

---

### Task 2: Страницы авторизации

**Files:**
- Modify: `app/auth/register/page.tsx`
- Modify: `app/auth/login/page.tsx`

- [ ] **Step 1: Переписать `app/auth/register/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-yellow-400 tracking-wide mb-2">ПРИВЕТ, БРО!</h1>
          <p className="text-sm text-gray-500">Регистрируйся, делай пароль и погнали!</p>
        </div>
        <div
          className="bg-[#111] border border-[#1a1500] rounded-sm p-6"
          style={{ borderTop: "2px solid #facc15" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] text-yellow-400 tracking-widest uppercase">Имя</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                required
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] text-yellow-400 tracking-widest uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                required
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] text-yellow-400 tracking-widest uppercase">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 text-black font-black tracking-widest py-3 rounded-sm text-xs hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "РЕГИСТРАЦИЯ..." : "ПОГНАЛИ →"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600 mt-5">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Переписать `app/auth/login/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
    const result = await signIn("credentials", { email, password, redirect: false })
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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-yellow-400 tracking-wide mb-2">С ВОЗВРАЩЕНИЕМ!</h1>
          <p className="text-sm text-gray-500">Твои прогнозы ждут</p>
        </div>
        <div
          className="bg-[#111] border border-[#1a1500] rounded-sm p-6"
          style={{ borderTop: "2px solid #facc15" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] text-yellow-400 tracking-widest uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                required
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] text-yellow-400 tracking-widest uppercase">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0d0d0d] border border-[#1a1500] rounded-sm px-3 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-[10px] text-yellow-400/50 hover:text-yellow-400 transition-colors">
                Забыли пароль?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 text-black font-black tracking-widest py-3 rounded-sm text-xs hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "ВХОД..." : "ВОЙТИ →"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600 mt-5">
            Нет аккаунта?{" "}
            <Link href="/auth/register" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Проверить сборку**

```bash
cd /Users/nichegosebe/toto-2026 && npm run build
```
Ожидаем: успешная сборка.

- [ ] **Step 4: Коммит**

```bash
cd /Users/nichegosebe/toto-2026
git add app/auth/register/page.tsx app/auth/login/page.tsx
git commit -m "feat(ui): redesign auth pages — ПРИВЕТ БРО style"
```

---

### Task 3: Стартовая страница + MatchCard

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/match-card.tsx`

- [ ] **Step 1: Обновить `app/page.tsx`**

Заменить всё содержимое `return (...)`:

```tsx
  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <h1 className="text-4xl font-black text-yellow-400 tracking-wide mb-2">ТОТО 2026</h1>
        <p className="text-gray-600 text-sm tracking-wide">Футбольный тотализатор Чемпионата мира 2026</p>
        {!session && (
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/auth/login">
              <button className="bg-yellow-400 text-black font-black tracking-widest px-6 py-2.5 rounded-sm text-xs hover:bg-yellow-300 transition-colors">
                ВОЙТИ →
              </button>
            </Link>
            <Link href="/auth/register">
              <button className="border border-[#1a1500] text-yellow-400 font-bold tracking-widest px-6 py-2.5 rounded-sm text-xs hover:border-yellow-400/30 transition-colors">
                РЕГИСТРАЦИЯ
              </button>
            </Link>
          </div>
        )}
      </section>

      {upcomingMatches.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold text-yellow-400 tracking-widest uppercase mb-4">
            Ближайшие матчи
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <div className="flex gap-3 justify-center pt-4">
          <Link href="/matches">
            <button className="border border-[#1a1500] text-gray-600 tracking-widest px-6 py-2 rounded-sm text-[10px] hover:text-gray-400 hover:border-gray-700 transition-colors">
              ВСЕ МАТЧИ
            </button>
          </Link>
          <Link href="/leaderboard">
            <button className="border border-[#1a1500] text-gray-600 tracking-widest px-6 py-2 rounded-sm text-[10px] hover:text-gray-400 hover:border-gray-700 transition-colors">
              РЕЙТИНГ
            </button>
          </Link>
        </div>
      )}
    </div>
  )
```

(Импорты `Button` можно удалить — больше не используются.)

- [ ] **Step 2: Переписать `components/match-card.tsx`**

```tsx
import Link from "next/link"

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
    city?: string | null
    country?: string | null
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

export function MatchCard({ match, hasPrediction, prediction }: MatchCardProps) {
  const kickoff = new Date(match.kickoff)
  const groupLetter = match.group?.replace(/^GROUP_/, "") ?? ""
  const stageLabel =
    match.stage === "GROUP" && groupLetter
      ? `Группа ${groupLetter}`
      : STAGE_LABELS[match.stage] ?? match.stage

  const isFinished = match.status === "FINISHED"
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED"
  const canPredict = match.status === "SCHEDULED" && !hasPrediction

  return (
    <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4 hover:border-yellow-400/20 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] text-gray-600 tracking-widest uppercase border border-[#1a1500] px-2 py-0.5 rounded-sm">
          {stageLabel}
        </span>
        <div className="text-right">
          <div className="text-[10px] text-gray-600">
            {kickoff.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}{" "}
            {kickoff.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </div>
          {(match.city || match.country) && (
            <div className="text-[9px] text-gray-700 mt-0.5">
              {[match.city, match.country].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-sm flex-1 text-gray-200">{match.homeTeam}</span>
        <div className="shrink-0 min-w-[52px] text-center">
          {isFinished || isLive ? (
            <span className={`font-black text-xl ${isLive ? "text-green-400 animate-pulse" : "text-yellow-400"}`}>
              {match.homeScore ?? 0}:{match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-gray-700 font-bold">—</span>
          )}
        </div>
        <span className="font-bold text-sm flex-1 text-right text-gray-200">{match.awayTeam}</span>
      </div>

      {prediction && (
        <div className="mt-3 pt-3 border-t border-[#1a1500] flex items-center justify-between">
          <span className="text-[10px] text-gray-600">
            Мой прогноз: <span className="text-gray-300 font-bold">{prediction.homeScore}:{prediction.awayScore}</span>
          </span>
          {prediction.points != null && (
            <span className={`text-xs font-black ${prediction.points > 0 ? "text-green-400" : "text-gray-600"}`}>
              {prediction.points > 0 ? `+${prediction.points}` : "0"}
            </span>
          )}
        </div>
      )}

      {hasPrediction && !prediction && (
        <div className="mt-3 pt-3 border-t border-[#1a1500]">
          <span className="text-[10px] text-green-500">✓ Прогноз сдан</span>
        </div>
      )}

      {canPredict && (
        <div className="mt-3 pt-3 border-t border-[#1a1500]">
          <Link href={`/matches/${match.id}`}>
            <button className="w-full bg-[#1a1500] text-yellow-400 font-black tracking-widest py-1.5 rounded-sm text-[9px] hover:bg-yellow-400/10 transition-colors">
              ПРОГНОЗ →
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Проверить сборку**

```bash
cd /Users/nichegosebe/toto-2026 && npm run build
```

- [ ] **Step 4: Коммит**

```bash
cd /Users/nichegosebe/toto-2026
git add app/page.tsx components/match-card.tsx
git commit -m "feat(ui): redesign home page and match card"
```

---

### Task 4: Страница матчей + MatchesTabs

**Files:**
- Modify: `components/matches-tabs.tsx`
- Modify: `app/matches/page.tsx`

- [ ] **Step 1: Переписать `components/matches-tabs.tsx`**

```tsx
"use client"

import Link from "next/link"

interface Tab {
  key: string
  label: string
  count: number
}

interface MatchesTabsProps {
  tabs: Tab[]
  activeTab: string
}

export function MatchesTabs({ tabs, activeTab }: MatchesTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 -mx-2 px-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "all" ? "/matches" : `/matches?tab=${tab.key}`}
          className={[
            "shrink-0 px-4 py-1.5 rounded-sm text-[10px] font-black tracking-widest transition-colors whitespace-nowrap",
            activeTab === tab.key
              ? "bg-yellow-400 text-black"
              : "bg-[#111] border border-[#1a1500] text-gray-600 hover:text-gray-400",
          ].join(" ")}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-1.5 opacity-40 text-[9px] font-normal">{tab.count}</span>
          )}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Обновить заголовок и стили строк в `app/matches/page.tsx`**

Заменить строку с `h1`:
```tsx
// Было:
<h1 className="text-2xl font-bold">Расписание матчей</h1>
// Стало:
<h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Расписание матчей</h1>
```

Заменить секцию с датой (`h2`):
```tsx
// Было:
<h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2 capitalize">
  {label}
</h2>
// Стало:
<h2 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3 border-b border-[#1a1500] pb-2">
  {label}
</h2>
```

Заменить `className` контейнера строки матча:
```tsx
// Было:
<div key={match.id} className="py-3 flex items-center gap-3 hover:bg-gray-900/30 -mx-2 px-2 rounded transition-colors">
// Стало:
<div key={match.id} className="py-3 flex items-center gap-3 hover:bg-[#111]/60 -mx-2 px-2 rounded-sm transition-colors">
```

Заменить `className` `<Badge>` стадии:
```tsx
// Было:
<Badge variant="outline" className="text-xs border-gray-700 text-gray-400 w-full justify-center">
// Стало:
<Badge variant="outline" className="text-[9px] border-[#1a1500] text-gray-600 tracking-widest w-full justify-center rounded-sm">
```

Заменить кнопку «Прогноз»:
```tsx
// Было:
<Button size="sm" variant="outline" className="h-7 text-xs px-2 border-yellow-700 text-yellow-500 hover:bg-yellow-900/20">
  Прогноз
</Button>
// Стало:
<button className="bg-[#1a1500] text-yellow-400 font-black tracking-widest px-3 py-1 rounded-sm text-[9px] hover:bg-yellow-400/10 transition-colors whitespace-nowrap">
  ПРОГНОЗ →
</button>
```

(Импорт `Button` убрать если больше не используется.)

- [ ] **Step 3: Проверить сборку**

```bash
cd /Users/nichegosebe/toto-2026 && npm run build
```

- [ ] **Step 4: Коммит**

```bash
cd /Users/nichegosebe/toto-2026
git add components/matches-tabs.tsx app/matches/page.tsx
git commit -m "feat(ui): redesign matches page and tabs"
```

---

### Task 5: Рейтинг

**Files:**
- Modify: `app/leaderboard/page.tsx`

- [ ] **Step 1: Обновить заголовок и контейнер**

```tsx
// Было:
<h1 className="text-2xl font-bold">Рейтинг участников</h1>
<div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
// Стало:
<h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Рейтинг участников</h1>
<div className="bg-[#111] border border-[#1a1500] rounded-sm p-6">
```

- [ ] **Step 2: Обновить легенду внизу**

```tsx
// Было:
<div className="text-xs text-gray-600 space-y-1">
// Стало:
<div className="text-[10px] text-gray-700 space-y-1 tracking-wide">
```

- [ ] **Step 3: Обновить `components/leaderboard-table.tsx`**

Открыть `components/leaderboard-table.tsx` и обновить стили строк таблицы:

- Строка текущего пользователя — заменить `className` на:
  ```tsx
  className="bg-[#1a1500] border-l-2 border-l-yellow-400"
  ```
- Строка лидера (#1) — добавить `border-l-2 border-l-yellow-400/40`
- Остальные строки — `hover:bg-[#111]`
- Заголовки колонок — `text-[9px] text-gray-600 tracking-widest uppercase border-b border-[#1a1500]`
- Цвет текста «итого» у текущего юзера — `text-yellow-400 font-black`

- [ ] **Step 4: Проверить сборку**

```bash
cd /Users/nichegosebe/toto-2026 && npm run build
```

- [ ] **Step 5: Коммит**

```bash
cd /Users/nichegosebe/toto-2026
git add app/leaderboard/page.tsx components/leaderboard-table.tsx
git commit -m "feat(ui): redesign leaderboard page"
```

---

### Task 6: Профиль

**Files:**
- Modify: `app/profile/page.tsx`

- [ ] **Step 1: Обновить аватар**

```tsx
// Было:
<div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xl shrink-0">
// Стало:
<div className="w-12 h-12 rounded-sm bg-yellow-400 flex items-center justify-center text-black font-black text-xl shrink-0">
```

- [ ] **Step 2: Обновить бейдж ранга**

```tsx
// Было:
<div className="bg-yellow-500 text-black text-sm font-bold px-3 py-1.5 rounded-lg shrink-0">
// Стало:
<div className="bg-yellow-400 text-black text-[10px] font-black tracking-widest px-3 py-1.5 rounded-sm shrink-0">
```

- [ ] **Step 3: Обновить 4 плашки статистики**

Все 4 карточки — заменить `className`:
```tsx
// Было:
className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center"
// Стало:
className="bg-[#111] border border-[#1a1500] rounded-sm p-4 text-center"
```

Числа в плашках: `text-3xl` → `text-3xl font-black`

- [ ] **Step 4: Обновить мини-рейтинг**

```tsx
// Было:
<div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
// Стало:
<div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
  <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-3">
```

Строка «Ты» — заменить `className`:
```tsx
// Было:
<div className="flex items-center gap-3 bg-gray-800 rounded-lg px-2 py-1.5 -mx-2">
// Стало:
<div className="flex items-center gap-3 bg-[#1a1500] border-l-2 border-l-yellow-400 rounded-sm px-2 py-1.5 -mx-2">
```

- [ ] **Step 5: Обновить график по этапам и аналитику**

Все секции (`bg-gray-900 border border-gray-800 rounded-lg`) — заменить на `bg-[#111] border border-[#1a1500] rounded-sm`.

Заголовки секций (`text-xs font-semibold text-gray-400 uppercase tracking-wide`) — заменить на `text-[9px] font-bold text-yellow-400 tracking-widest uppercase`.

- [ ] **Step 6: Обновить список прогнозов**

```tsx
// Было:
<h2 className="text-lg font-semibold mb-3">Мои прогнозы</h2>
// Стало:
<h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase mb-3">Мои прогнозы</h2>
```

Карточки прогнозов — заменить `className`:
```tsx
// Было:
className={`bg-gray-900 rounded-lg p-4 ${isFinished ? `border border-gray-800 ${leftBorder}` : "border border-dashed border-gray-700"}`}
// Стало:
className={`bg-[#111] rounded-sm p-4 ${isFinished ? `border border-[#1a1500] ${leftBorder}` : "border border-dashed border-[#1a1500]/60"}`}
```

Переменная `leftBorder` — заменить классы:
```tsx
const leftBorder = !isFinished
  ? ""
  : isExact
  ? "border-l-2 border-l-green-500"
  : isCorrect
  ? "border-l-2 border-l-yellow-400"
  : "border-l-2 border-l-gray-800"
```

- [ ] **Step 7: Обновить бейджи очков в списке прогнозов**

В блоке `{isFinished ? ...}` с бейджем результата:
```tsx
// Было:
<Badge className={
  isExact ? "bg-green-900 text-green-200" :
  isCorrect ? "bg-yellow-900 text-yellow-200" :
  "bg-gray-800 text-gray-400"
}>
  {pts > 0 ? `+${pts}` : "+0"}
</Badge>
// Стало:
<Badge className={
  isExact ? "bg-green-900/40 border-green-800 text-green-400 text-[9px] tracking-widest rounded-sm" :
  isCorrect ? "bg-[#1a1500] border-[#2a2000] text-yellow-400 text-[9px] tracking-widest rounded-sm" :
  "bg-[#0d0d0d] border-[#1a1500] text-gray-600 text-[9px] tracking-widest rounded-sm"
}>
  {pts > 0 ? `+${pts}` : "+0"}
</Badge>

// Бейдж "ожидается":
// Было:
<Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">
// Стало:
<Badge variant="outline" className="border-[#1a1500] text-gray-600 text-[9px] tracking-widest rounded-sm">
```

- [ ] **Step 8: Проверить сборку**

```bash
cd /Users/nichegosebe/toto-2026 && npm run build
```

- [ ] **Step 9: Коммит**

```bash
cd /Users/nichegosebe/toto-2026
git add app/profile/page.tsx
git commit -m "feat(ui): redesign profile page"
```

---

### Task 7: Бонусные прогнозы

**Files:**
- Modify: `app/bonus/page.tsx`

- [ ] **Step 1: Обновить заголовок**

```tsx
// Было:
<h1 className="text-2xl font-bold">Бонусные прогнозы</h1>
// Стало:
<h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Бонусные прогнозы</h1>
```

- [ ] **Step 2: Обновить бейджи статуса**

```tsx
// Было (закрыт):
<span className="text-sm bg-red-900/40 border border-red-800 text-red-400 px-3 py-1 rounded-full">
// Стало:
<span className="text-[9px] bg-red-900/30 border border-red-900 text-red-500 px-3 py-1 rounded-sm tracking-widest">

// Было (открыт):
<span className="text-sm bg-yellow-900/40 border border-yellow-800 text-yellow-400 px-3 py-1 rounded-full">
// Стало:
<span className="text-[9px] bg-[#1a1500] border border-[#2a2000] text-yellow-400 px-3 py-1 rounded-sm tracking-widest">
```

- [ ] **Step 3: Обновить блок описания**

```tsx
// Было:
<div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-2 text-sm text-gray-400">
// Стало:
<div className="bg-[#111] border border-[#1a1500] rounded-sm p-4 space-y-2 text-xs text-gray-500">
```

- [ ] **Step 4: Обновить три секции (Полуфиналисты, Финалисты, Чемпион)**

```tsx
// Было:
<section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
  <h2 className="text-lg font-semibold text-yellow-400">Полуфиналисты</h2>
// Стало:
<section className="bg-[#111] border border-[#1a1500] rounded-sm p-5 space-y-4" style={{ borderTop: "2px solid #facc15" }}>
  <h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Полуфиналисты</h2>
```

(Аналогично для секций «Финалисты» и «Чемпион»)

- [ ] **Step 5: Обновить стили кнопок команд**

В `className` кнопок команд заменить базовый класс и варианты:
```tsx
// Было (base):
"px-3 py-1.5 rounded-full text-sm font-medium transition-all border"
// Стало (base):
"px-3 py-1.5 rounded-sm text-[10px] font-black tracking-wide transition-all border"

// Было (selected):
"bg-yellow-500 border-yellow-400 text-black"
// Стало:
"bg-yellow-400 border-yellow-400 text-black"

// Было (unselected):
"bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
// Стало:
"bg-[#0d0d0d] border-[#1a1500] text-gray-600 hover:border-gray-700"
```

- [ ] **Step 6: Обновить итоговую строку**

```tsx
// Было:
<div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 flex items-center justify-between">
// Стало:
<div className="bg-[#1a1500] border border-[#2a2000] rounded-sm p-4 flex items-center justify-between">
```

Кнопка сохранения:
```tsx
// Было:
<Button onClick={handleSave} disabled={saving || !isComplete} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6">
  {saving ? "Сохраняю..." : "Сохранить прогноз"}
</Button>
// Стало:
<button
  onClick={handleSave}
  disabled={saving || !isComplete}
  className="bg-yellow-400 text-black font-black tracking-widest px-6 py-2 rounded-sm text-[10px] hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  {saving ? "СОХРАНЯЮ..." : "СОХРАНИТЬ →"}
</button>
```

- [ ] **Step 7: Проверить сборку**

```bash
cd /Users/nichegosebe/toto-2026 && npm run build
```

- [ ] **Step 8: Коммит**

```bash
cd /Users/nichegosebe/toto-2026
git add app/bonus/page.tsx
git commit -m "feat(ui): redesign bonus page"
```

---

### Task 8: Группы, Сетка, Правила

**Files:**
- Modify: `app/standings/page.tsx`
- Modify: `app/grid/page.tsx`
- Modify: `app/rules/page.tsx`

- [ ] **Step 1: Обновить `app/standings/page.tsx`**

```tsx
// h1:
<h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Групповой этап</h1>

// Карточка группы:
// Было:
<div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
  <div className="px-4 py-2 bg-gray-800/60 border-b border-gray-700">
    <span className="font-semibold text-sm text-gray-200">Группа {letter}</span>
  </div>
// Стало:
<div className="bg-[#111] border border-[#1a1500] rounded-sm overflow-hidden">
  <div className="px-4 py-2 bg-[#1a1500] border-b border-[#2a2000]">
    <span className="text-[10px] font-black text-yellow-400 tracking-widest">ГРУППА {letter}</span>
  </div>

// thead tr:
// Было: className="text-gray-500 text-xs border-b border-gray-800"
// Стало: className="text-gray-700 text-[9px] border-b border-[#1a1500] tracking-widest"

// tbody tr (выходит):
// Было: advances ? "bg-green-900/10" : ""
// Стало: advances ? "bg-green-900/10 border-l-2 border-l-green-600/40" : ""

// tbody tr (base):
// Было: "border-b border-gray-800/40 last:border-0"
// Стало: "border-b border-[#1a1500]/60 last:border-0"
```

- [ ] **Step 2: Обновить `app/grid/page.tsx`**

```tsx
// h1:
// Было: <h1 className="text-2xl font-bold">Сетка прогнозов</h1>
// Стало: <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Сетка прогнозов</h1>

// p:
// Было: <p className="text-sm text-gray-400">
// Стало: <p className="text-xs text-gray-600">

// Container:
// Было: <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
// Стало: <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
```

- [ ] **Step 3: Обновить `app/rules/page.tsx`**

```tsx
// h1:
// Было: <h1 className="text-2xl font-bold">Правила тотализатора</h1>
// Стало: <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Правила тотализатора</h1>

// Каждая section:
// Было: <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
// Стало: <section className="bg-[#111] border border-[#1a1500] rounded-sm p-6 space-y-4" style={{ borderTop: "2px solid #facc15" }}>

// Каждый h2 внутри секции:
// Было: <h2 className="text-lg font-semibold text-yellow-400">
// Стало: <h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">

// thead tr:
// Было: className="text-gray-400 border-b border-gray-700"
// Стало: className="text-gray-600 text-[9px] tracking-widest border-b border-[#1a1500]"

// tbody divide:
// Было: className="divide-y divide-gray-800"
// Стало: className="divide-y divide-[#1a1500]"

// Пример (p в bg-gray-800):
// Было: className="text-xs text-gray-400 bg-gray-800 rounded p-3"
// Стало: className="text-xs text-gray-500 bg-[#0d0d0d] border border-[#1a1500] rounded-sm p-3"
```

- [ ] **Step 4: Проверить сборку и тесты**

```bash
cd /Users/nichegosebe/toto-2026 && npm run build && npx vitest run
```
Ожидаем: сборка без ошибок, все тесты проходят (тесты покрывают только бизнес-логику, не стили).

- [ ] **Step 5: Коммит**

```bash
cd /Users/nichegosebe/toto-2026
git add app/standings/page.tsx app/grid/page.tsx app/rules/page.tsx
git commit -m "feat(ui): redesign standings, grid, rules pages"
```

---

## Что НЕ меняем

- `app/api/` — все API-роуты
- `lib/` — вся бизнес-логика
- `prisma/` — схема БД
- `__tests__/` — тесты
- Логика работы форм, прогнозов, подсчёта очков
