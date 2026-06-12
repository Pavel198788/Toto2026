import Link from "next/link"
import { teamFlag } from "@/lib/flags"

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
            {kickoff.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" })}{" "}
            {kickoff.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" })}
          </div>
          {(match.city || match.country) && (
            <div className="text-[9px] text-gray-500 mt-0.5">
              {[match.city, match.country].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-sm flex-1 text-gray-200">
          <span className="mr-1">{teamFlag(match.homeTeam)}</span>{match.homeTeam}
        </span>
        <div className="shrink-0 min-w-[52px] text-center">
          {isFinished || isLive ? (
            <span className={`font-black text-xl ${isLive ? "text-green-400 animate-pulse" : "text-yellow-400"}`}>
              {match.homeScore ?? 0}:{match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-gray-700 font-bold">—</span>
          )}
        </div>
        <span className="font-bold text-sm flex-1 text-right text-gray-200">
          {match.awayTeam}<span className="ml-1">{teamFlag(match.awayTeam)}</span>
        </span>
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
