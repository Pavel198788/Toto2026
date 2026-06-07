"use client"

import { useRef, useState } from "react"
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

  function handleScoreChange(val: string, setter: (v: string) => void) {
    const digits = val.replace(/\D/g, "")
    if (digits === "") { setter(""); return }
    setter(String(parseInt(digits, 10)))
  }
  const [winner, setWinner] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [error, setError] = useState("")

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    if (!homeScore || !awayScore) return
    if (isPlayoff && !winner) return
    setShowConfirm(true)
  }

  async function handleConfirm() {
    if (submittingRef.current) return
    submittingRef.current = true
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

    submittingRef.current = false
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
              type="text"
              inputMode="numeric"
              value={homeScore}
              onChange={(e) => handleScoreChange(e.target.value, setHomeScore)}
              className="w-20 text-center text-2xl font-bold bg-gray-800 border-gray-700 h-14"
              required
            />
          </div>
          <span className="text-2xl text-gray-500 mt-6">:</span>
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">{awayTeam}</p>
            <Input
              type="text"
              inputMode="numeric"
              value={awayScore}
              onChange={(e) => handleScoreChange(e.target.value, setAwayScore)}
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

      <Dialog open={showConfirm} onOpenChange={(open) => setShowConfirm(open)}>
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
