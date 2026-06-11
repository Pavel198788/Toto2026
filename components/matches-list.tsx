"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { teamFlag } from "@/lib/flags"

export interface SerializedMatch {
  id: string
  externalId: number
  homeTeam: string
  awayTeam: string
  stage: string
  group: string | null
  kickoff: string
  homeScore: number | null
  awayScore: number | null
  status: string
  city: string | null
  country: string | null
}

export interface SerializedPrediction {
  homeScore: number
  awayScore: number
  points: number | null
}

export interface DateGroup {
  dateKey: string
  label: string
  matches: SerializedMatch[]
}

interface LiveMatch {
  externalId: number
  status: string
  homeScore: number | null
  awayScore: number | null
}

interface MatchesListProps {
  byDate: DateGroup[]
  userPredictions: Record<string, SerializedPrediction>
  isLoggedIn: boolean
}

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Группа",
  R16: "1/8",
  QUARTERFINAL: "1/4",
  SEMIFINAL: "1/2",
  THIRD_PLACE: "3-е место",
  FINAL: "Финал",
}

// football-data.org status → our MatchStatus
function normalizeStatus(apiStatus: string): string {
  if (apiStatus === "IN_PLAY") return "IN_PLAY"
  if (apiStatus === "PAUSED") return "PAUSED"
  if (apiStatus === "FINISHED") return "FINISHED"
  return apiStatus
}

function outcome(h: number, a: number) {
  return h > a ? "H" : h < a ? "A" : "D"
}

export function MatchesList({ byDate, userPredictions, isLoggedIn }: MatchesListProps) {
  const [liveScores, setLiveScores] = useState<Record<number, LiveMatch>>({})

  const fetchLiveScores = useCallback(async () => {
    try {
      const res = await fetch("/api/live-scores")
      if (!res.ok) return
      const data = await res.json()
      const map: Record<number, LiveMatch> = {}
      for (const m of (data.matches ?? []) as LiveMatch[]) {
        map[m.externalId] = m
      }
      setLiveScores(map)
    } catch {
      // игнорируем ошибки сети
    }
  }, [])

  useEffect(() => {
    fetchLiveScores()
    const interval = setInterval(fetchLiveScores, 300_000) // 5 мин, синхронно с серверным кешем
    return () => clearInterval(interval)
  }, [fetchLiveScores])

  return (
    <>
      {byDate.map(({ dateKey, label, matches: dayMatches }) => (
        <section key={dateKey}>
          <h2 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3 border-b border-[#1a1500] pb-2">
            {label}
          </h2>

          <div className="divide-y divide-gray-800/60">
            {dayMatches.map((match) => {
              const live = liveScores[match.externalId]

              const effectiveStatus = live ? normalizeStatus(live.status) : match.status
              const effectiveHomeScore = live?.homeScore ?? match.homeScore
              const effectiveAwayScore = live?.awayScore ?? match.awayScore

              const isFinished = effectiveStatus === "FINISHED"
              const isLive = effectiveStatus === "IN_PLAY" || effectiveStatus === "PAUSED"

              const kickoff = new Date(match.kickoff)
              const timeStr = kickoff.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Moscow",
              })

              const groupLetter = match.group?.replace(/^GROUP_/, "") ?? ""
              const stageLabel =
                match.stage === "GROUP" && groupLetter
                  ? `Группа ${groupLetter}`
                  : STAGE_LABELS[match.stage] ?? match.stage

              const cutoff = new Date(kickoff.getTime() - 3 * 60 * 60 * 1000)
              const canPredict =
                match.status === "SCHEDULED" &&
                !(match.id in userPredictions) &&
                new Date() < cutoff &&
                !isLive &&
                !isFinished

              const pred = userPredictions[match.id]

              const predIcon =
                isFinished && pred && effectiveHomeScore != null && effectiveAwayScore != null
                  ? effectiveHomeScore === pred.homeScore && effectiveAwayScore === pred.awayScore
                    ? "🎯"
                    : outcome(effectiveHomeScore, effectiveAwayScore) === outcome(pred.homeScore, pred.awayScore)
                    ? "🔥"
                    : "💩"
                  : null

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="py-3 flex items-center gap-3 hover:bg-[#111]/60 -mx-2 px-2 rounded-sm transition-colors cursor-pointer"
                >
                  {/* Время + город (mobile) */}
                  <div className="shrink-0 w-12 text-right">
                    <span className="text-sm text-gray-500 font-mono block">{timeStr}</span>
                    {match.city && (
                      <span className="sm:hidden text-[9px] text-gray-500 block leading-tight">
                        {match.city}
                      </span>
                    )}
                  </div>

                  {/* Stage badge + город (desktop) */}
                  <div className="hidden sm:flex flex-col items-start shrink-0 w-20 gap-0.5">
                    <span className="text-[9px] border border-[#1a1500] text-gray-600 tracking-widest w-full justify-center flex rounded-sm px-1 py-0.5">
                      {stageLabel}
                    </span>
                    {match.city && (
                      <span className="text-xs text-gray-600 truncate w-full text-center">
                        {match.city}
                      </span>
                    )}
                  </div>

                  {/* Команды + счёт */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                      <span className="font-medium text-sm truncate">{match.homeTeam}</span>
                      <span className="shrink-0 text-base leading-none">{teamFlag(match.homeTeam)}</span>
                    </div>

                    <div className="shrink-0 w-16 text-center">
                      {isFinished || isLive ? (
                        <div>
                          <span
                            className={`font-bold text-lg leading-none ${
                              isLive ? "text-green-400" : "text-white"
                            }`}
                          >
                            {effectiveHomeScore ?? 0}:{effectiveAwayScore ?? 0}
                          </span>
                          {isLive && (
                            <span className="block text-[8px] text-green-400 animate-pulse tracking-widest font-bold mt-0.5">
                              LIVE
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </div>

                    <div className="flex-1 flex items-center gap-1 min-w-0">
                      <span className="shrink-0 text-base leading-none">{teamFlag(match.awayTeam)}</span>
                      <span className="font-medium text-sm truncate">{match.awayTeam}</span>
                    </div>
                  </div>

                  {/* Прогноз / действие */}
                  <div className="shrink-0 flex items-center gap-2 ml-auto">
                    {/* Завершённый матч: эмодзи + счёт + очки */}
                    {isFinished && pred && (
                      <span
                        className={`text-lg font-black flex items-center gap-1 ${
                          predIcon === "💩" ? "text-red-500" : "text-green-400"
                        }`}
                      >
                        {predIcon} {pred.homeScore}:{pred.awayScore}
                        {pred.points != null && (
                          <span
                            className={`ml-1 text-sm ${
                              pred.points > 0 ? "text-green-400" : "text-gray-600"
                            }`}
                          >
                            {pred.points > 0 ? `+${pred.points}` : pred.points}
                          </span>
                        )}
                      </span>
                    )}
                    {isFinished && !pred && (
                      <span className="text-xs text-gray-600 hidden sm:inline">без прогноза</span>
                    )}

                    {/* Идёт матч: показываем "LIVE" + прогноз пользователя рядом */}
                    {isLive && (
                      <div className="flex items-center gap-2">
                        {pred ? (
                          <div className="text-right">
                            <span className="text-[9px] text-gray-500 block">мой прогноз</span>
                            <span className="text-base font-black text-yellow-400">
                              {pred.homeScore}:{pred.awayScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 hidden sm:inline">без прогноза</span>
                        )}
                      </div>
                    )}

                    {/* Ещё не началось: прогноз пользователя */}
                    {!isFinished && !isLive && pred && (
                      <span className="text-lg font-black text-yellow-400">
                        📝 {pred.homeScore}:{pred.awayScore}
                      </span>
                    )}

                    {/* Кнопка прогноза */}
                    {canPredict && isLoggedIn && (
                      <span className="bg-[#1a1500] text-yellow-400 font-black tracking-widest px-3 py-1 rounded-sm text-[9px] whitespace-nowrap">
                        ПРОГНОЗ →
                      </span>
                    )}
                    {/* Стрелка — всегда показываем что строка кликабельна */}
                    <span className="text-gray-600 text-xs shrink-0">›</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}
