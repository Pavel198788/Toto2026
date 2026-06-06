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
