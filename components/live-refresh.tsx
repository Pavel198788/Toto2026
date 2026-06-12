"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

// Проверяет есть ли сейчас живые или недавно завершённые матчи.
// Возвращает true если текущее UTC время попадает в окно любого матча (kickoff .. kickoff+150мин).
function isMatchWindow(matches: Array<{ utcDate: string; status: string }>): boolean {
  const now = Date.now()
  for (const m of matches) {
    if (m.status === "IN_PLAY" || m.status === "PAUSED") return true
    const kickoff = new Date(m.utcDate).getTime()
    // Матч ещё не помечен как FINISHED в нашей БД — окно 150 минут от кикоффа
    if (now >= kickoff && now - kickoff < 150 * 60 * 1000) return true
  }
  return false
}

export function LiveRefresh() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function tick() {
      try {
        // Получаем сегодняшние матчи из кешированного эндпоинта (60 сек TTL)
        const res = await fetch("/api/live-scores", { cache: "no-store" })
        if (!res.ok) return
        const { matches } = await res.json()
        if (!active) return

        if (isMatchWindow(matches ?? [])) {
          // Есть живой матч — синкаем БД и обновляем страницу
          await fetch("/api/live-sync", { method: "POST" })
          if (active) router.refresh()
        }
      } catch {
        // сеть недоступна — пропускаем тик
      }
    }

    // Первый тик через 60 секунд, затем каждые 60 секунд
    timerRef.current = setInterval(tick, 60_000)
    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [router])

  return null
}
