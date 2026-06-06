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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setUsers)
      .catch((e) => setLoadError(String(e.message)))
  }, [])

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
