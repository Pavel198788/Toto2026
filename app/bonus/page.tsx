"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface BonusData {
  predictions: { type: string; team: string; points: number | null }[]
  teams: string[]
  locked: boolean
}

export default function BonusPage() {
  const [data, setData] = useState<BonusData | null>(null)
  const [loading, setLoading] = useState(true)

  const [semifinalists, setSemifinalists] = useState<string[]>([])
  const [finalists, setFinalists] = useState<string[]>([])
  const [champion, setChampion] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/bonus")
      .then((r) => r.json())
      .then((d: BonusData) => {
        setData(d)
        if (d.predictions.length > 0) {
          setSemifinalists(d.predictions.filter((p) => p.type === "SEMIFINAL").map((p) => p.team))
          setFinalists(d.predictions.filter((p) => p.type === "FINALIST").map((p) => p.team))
          const ch = d.predictions.find((p) => p.type === "CHAMPION")
          if (ch) setChampion(ch.team)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleSemifinalist(team: string) {
    if (data?.locked) return
    setSemifinalists((prev) => {
      if (prev.includes(team)) {
        // Remove from semi → also remove from finalists/champion
        setFinalists((f) => f.filter((t) => t !== team))
        if (champion === team) setChampion(null)
        return prev.filter((t) => t !== team)
      }
      if (prev.length >= 4) return prev
      return [...prev, team]
    })
  }

  function toggleFinalist(team: string) {
    if (data?.locked) return
    setFinalists((prev) => {
      if (prev.includes(team)) {
        if (champion === team) setChampion(null)
        return prev.filter((t) => t !== team)
      }
      if (prev.length >= 2) return prev
      return [...prev, team]
    })
  }

  function selectChampion(team: string) {
    if (data?.locked) return
    setChampion((prev) => (prev === team ? null : team))
  }

  async function handleSave() {
    if (!champion || finalists.length !== 2 || semifinalists.length !== 4) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semifinalists, finalists, champion }),
      })
      const d = await res.json()
      if (d.success) {
        setSaved(true)
      } else {
        setError(d.error ?? "Ошибка сохранения")
      }
    } catch {
      setError("Сетевой сбой")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-20">Загрузка...</div>
  }

  const isComplete = semifinalists.length === 4 && finalists.length === 2 && champion !== null
  const locked = data?.locked ?? false
  const alreadySaved = saved || (data?.predictions?.length ?? 0) > 0

  // Compute bonus points summary if predictions exist and some points assigned
  const totalBonusPoints = data?.predictions.reduce((s, p) => s + (p.points ?? 0), 0) ?? 0
  const hasPoints = data?.predictions.some((p) => p.points !== null)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Бонусные прогнозы</h1>
        {locked && (
          <span className="text-sm bg-red-900/40 border border-red-800 text-red-400 px-3 py-1 rounded-full">
            Приём закрыт — ЧМ начался
          </span>
        )}
        {!locked && (
          <span className="text-sm bg-yellow-900/40 border border-yellow-800 text-yellow-400 px-3 py-1 rounded-full">
            До начала первого матча
          </span>
        )}
      </div>

      {hasPoints && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">Бонусные очки</p>
          <p className="text-3xl font-bold text-green-400">+{totalBonusPoints}</p>
        </div>
      )}

      {/* СЕКЦИЯ 1: Полуфиналисты */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-yellow-400">Полуфиналисты</h2>
          <span className="text-sm text-gray-400">
            {semifinalists.length} / 4
          </span>
        </div>
        <p className="text-sm text-gray-400">Выберите 4 команды, которые выйдут в полуфинал</p>
        <div className="flex flex-wrap gap-2">
          {(data?.teams ?? []).map((team) => {
            const selected = semifinalists.includes(team)
            const isCorrect = data?.predictions.find((p) => p.type === "SEMIFINAL" && p.team === team)?.points === 8
            const isWrong = data?.predictions.find((p) => p.type === "SEMIFINAL" && p.team === team)?.points === 0 && hasPoints
            return (
              <button
                key={team}
                onClick={() => toggleSemifinalist(team)}
                disabled={locked || (!selected && semifinalists.length >= 4)}
                className={[
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                  selected && isCorrect
                    ? "bg-green-600 border-green-500 text-white"
                    : selected && isWrong
                    ? "bg-red-700 border-red-600 text-white"
                    : selected
                    ? "bg-yellow-500 border-yellow-400 text-black"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500",
                  locked || (!selected && semifinalists.length >= 4)
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer",
                ].join(" ")}
              >
                {team}
              </button>
            )
          })}
        </div>
      </section>

      {/* СЕКЦИЯ 2: Финалисты */}
      <section className={`bg-gray-900 border rounded-lg p-6 space-y-4 transition-opacity ${semifinalists.length < 4 ? "opacity-40 border-gray-800" : "border-gray-700"}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-yellow-400">Финалисты</h2>
          <span className="text-sm text-gray-400">
            {finalists.length} / 2
          </span>
        </div>
        <p className="text-sm text-gray-400">Выберите 2 команды, которые выйдут в финал</p>
        {semifinalists.length < 4 ? (
          <p className="text-xs text-gray-500 italic">Сначала выберите 4 полуфиналиста</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {semifinalists.map((team) => {
              const selected = finalists.includes(team)
              const isCorrect = data?.predictions.find((p) => p.type === "FINALIST" && p.team === team)?.points === 15
              const isWrong = data?.predictions.find((p) => p.type === "FINALIST" && p.team === team)?.points === 0 && hasPoints
              return (
                <button
                  key={team}
                  onClick={() => toggleFinalist(team)}
                  disabled={locked || (!selected && finalists.length >= 2)}
                  className={[
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                    selected && isCorrect
                      ? "bg-green-600 border-green-500 text-white"
                      : selected && isWrong
                      ? "bg-red-700 border-red-600 text-white"
                      : selected
                      ? "bg-yellow-500 border-yellow-400 text-black"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500",
                    locked || (!selected && finalists.length >= 2)
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer",
                  ].join(" ")}
                >
                  {team}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* СЕКЦИЯ 3: Чемпион */}
      <section className={`bg-gray-900 border rounded-lg p-6 space-y-4 transition-opacity ${finalists.length < 2 ? "opacity-40 border-gray-800" : "border-gray-700"}`}>
        <h2 className="text-lg font-semibold text-yellow-400">Чемпион</h2>
        <p className="text-sm text-gray-400">Выберите победителя турнира</p>
        {finalists.length < 2 ? (
          <p className="text-xs text-gray-500 italic">Сначала выберите 2 финалиста</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {finalists.map((team) => {
              const selected = champion === team
              const isCorrect = data?.predictions.find((p) => p.type === "CHAMPION" && p.team === team)?.points === 30
              const isWrong = data?.predictions.find((p) => p.type === "CHAMPION" && p.team === team)?.points === 0 && hasPoints
              return (
                <button
                  key={team}
                  onClick={() => selectChampion(team)}
                  disabled={locked}
                  className={[
                    "px-6 py-3 rounded-xl text-base font-bold transition-all border-2",
                    selected && isCorrect
                      ? "bg-green-600 border-green-400 text-white scale-105"
                      : selected && isWrong
                      ? "bg-red-700 border-red-500 text-white"
                      : selected
                      ? "bg-yellow-500 border-yellow-300 text-black scale-105"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500",
                    locked ? "cursor-not-allowed" : "cursor-pointer",
                  ].join(" ")}
                >
                  🏆 {team}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ИТОГОВАЯ СТРОКА */}
      {champion && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Ваш чемпион</p>
            <p className="text-xl font-bold text-yellow-400">🏆 {champion}</p>
          </div>
          {!locked && !alreadySaved && (
            <Button
              onClick={handleSave}
              disabled={saving || !isComplete}
              className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6"
            >
              {saving ? "Сохраняю..." : "Сохранить прогноз"}
            </Button>
          )}
          {alreadySaved && (
            <span className="text-green-400 font-medium text-sm">✓ Прогноз сохранён</span>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!locked && !alreadySaved && (
        <p className="text-xs text-gray-500 text-center">
          Прогноз можно изменить до начала первого матча (11 июня). После сохранения — изменить нельзя.
        </p>
      )}
    </div>
  )
}
