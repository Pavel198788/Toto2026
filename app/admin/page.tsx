// app/admin/page.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface AdminUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
  _count: { predictions: number }
}

interface AdminMatch {
  id: string
  homeTeam: string
  awayTeam: string
  stage: string
  group: string | null
  kickoff: string
  city: string | null
  country: string | null
}

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Группа",
  R16: "1/8",
  QUARTERFINAL: "1/4",
  SEMIFINAL: "1/2",
  THIRD_PLACE: "3-е место",
  FINAL: "Финал",
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [sheetsSync, setSheetsSync] = useState(false)
  const [sheetsResult, setSheetsResult] = useState<string | null>(null)

  const [matches, setMatches] = useState<AdminMatch[]>([])
  const [matchEdits, setMatchEdits] = useState<Record<string, { city: string; country: string }>>({})
  const [savingMatch, setSavingMatch] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setUsers)
      .catch((e) => setLoadError(String(e.message)))

    fetch("/api/admin/matches")
      .then((r) => r.json())
      .then((data: AdminMatch[]) => {
        setMatches(data)
        const edits: Record<string, { city: string; country: string }> = {}
        for (const m of data) {
          edits[m.id] = { city: m.city ?? "", country: m.country ?? "" }
        }
        setMatchEdits(edits)
      })
      .catch(() => {})
  }, [])

  async function saveMatchLocation(matchId: string) {
    setSavingMatch(matchId)
    const { city, country } = matchEdits[matchId] ?? { city: "", country: "" }
    await fetch("/api/admin/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: matchId, city, country }),
    })
    setMatches((prev) =>
      prev.map((m) => m.id === matchId ? { ...m, city: city || null, country: country || null } : m)
    )
    setSavingMatch(null)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/admin/trigger-sync", { method: "POST" })
      const data = await res.json()
      setSyncResult(
        data.success
          ? `Синхронизировано. Обновлено матчей: ${data.updatedMatches}`
          : `Ошибка: ${data.error}`
      )
    } catch (e) {
      setSyncResult(`Ошибка: сетевой сбой`)
    } finally {
      setSyncing(false)
    }
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
        <h2 className="text-lg font-semibold">Резервная копия</h2>
        <p className="text-sm text-gray-400">
          Скачать Excel или выгрузить в Google Таблицу
        </p>
        <div className="flex gap-3 flex-wrap">
          <a href="/api/admin/export" download>
            <Button className="bg-green-700 hover:bg-green-600">
              Скачать Excel
            </Button>
          </a>
          <Button
            onClick={async () => {
              setSheetsSync(true)
              setSheetsResult(null)
              try {
                const res = await fetch("/api/admin/sync-sheets", { method: "POST" })
                const d = await res.json()
                setSheetsResult(d.success ? "✓ Google Таблица обновлена" : `Ошибка: ${d.error}`)
              } catch {
                setSheetsResult("Ошибка: сетевой сбой")
              } finally {
                setSheetsSync(false)
              }
            }}
            disabled={sheetsSync}
            className="bg-blue-700 hover:bg-blue-600"
          >
            {sheetsSync ? "Синхронизация..." : "Обновить Google Таблицу"}
          </Button>
        </div>
        {sheetsResult && (
          <p className={`text-sm ${sheetsResult.startsWith("Ошибка") ? "text-red-400" : "text-green-400"}`}>
            {sheetsResult}
          </p>
        )}
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Места матчей</h2>
        <p className="text-sm text-gray-400">
          Укажите город и страну для каждого матча — они отображаются на карточках
        </p>
        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {matches.map((match) => {
            const edit = matchEdits[match.id] ?? { city: "", country: "" }
            const groupLetter = match.group?.replace(/^GROUP_/, "") ?? ""
            const stageStr = match.stage === "GROUP" && groupLetter
              ? `Гр. ${groupLetter}`
              : STAGE_LABELS[match.stage] ?? match.stage
            const date = new Date(match.kickoff).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
            const saved = match.city || match.country
            return (
              <div key={match.id} className="flex items-center gap-2 py-1.5 border-b border-gray-800/40 text-sm">
                <span className="text-gray-500 w-16 shrink-0">{stageStr}</span>
                <span className="text-gray-400 w-14 shrink-0">{date}</span>
                <span className="flex-1 min-w-0 truncate text-gray-200">
                  {match.homeTeam} — {match.awayTeam}
                </span>
                <Input
                  value={edit.city}
                  onChange={(e) => setMatchEdits((prev) => ({ ...prev, [match.id]: { ...edit, city: e.target.value } }))}
                  placeholder="Город"
                  className="w-28 h-7 text-xs bg-gray-800 border-gray-700"
                />
                <Input
                  value={edit.country}
                  onChange={(e) => setMatchEdits((prev) => ({ ...prev, [match.id]: { ...edit, country: e.target.value } }))}
                  placeholder="Страна"
                  className="w-24 h-7 text-xs bg-gray-800 border-gray-700"
                />
                <Button
                  size="sm"
                  onClick={() => saveMatchLocation(match.id)}
                  disabled={savingMatch === match.id}
                  className="h-7 text-xs px-2 bg-gray-700 hover:bg-gray-600"
                >
                  {savingMatch === match.id ? "..." : saved ? "✓" : "Сохр."}
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Участники ({users.length})</h2>
        {loadError && (
          <p className="text-red-400 text-sm">{loadError}</p>
        )}
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
