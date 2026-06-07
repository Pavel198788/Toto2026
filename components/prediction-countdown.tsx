"use client"

import { useEffect, useState } from "react"

export function PredictionCountdown({ cutoff }: { cutoff: number }) {
  const [diff, setDiff] = useState(cutoff - Date.now())

  useEffect(() => {
    const id = setInterval(() => setDiff(cutoff - Date.now()), 1000)
    return () => clearInterval(id)
  }, [cutoff])

  if (diff <= 0) return (
    <span className="text-[inherit] text-red-500 tracking-widest whitespace-nowrap">ЗАКРЫТО</span>
  )

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  const pad = (n: number) => String(n).padStart(2, "0")

  return (
    <span className="text-[inherit] font-mono tracking-wider whitespace-nowrap text-yellow-600">
      {d > 0 ? `${d}д ${h}:${pad(m)}:${pad(s)}` : h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`}
    </span>
  )
}
