import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PredictionForm } from "@/components/prediction-form"
import { Badge } from "@/components/ui/badge"
import { PredictionCountdown } from "@/components/prediction-countdown"
import { teamFlag } from "@/lib/flags"

type MatchEvent = {
  type: "goal" | "own_goal" | "penalty_scored" | "penalty_missed" | "red_card"
  team: "home" | "away"
  player: string
  minute: number
  minuteExtra?: number
}

const EVENT_ICON: Record<MatchEvent["type"], string> = {
  goal: "⚽",
  own_goal: "⚽",
  penalty_scored: "⚽ П",
  penalty_missed: "✗ П",
  red_card: "🟥",
}

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Групповой этап",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "Матч за 3-е место",
  FINAL: "Финал",
}

const PLAYOFF_STAGES = new Set(["R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"])

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = await params
  const { from } = await searchParams
  const backHref = from ? `/matches?tab=${from}` : "/matches"
  const session = await auth()

  const match = await prisma.match.findUnique({ where: { id } })
  if (!match) notFound()

  const kickoff = new Date(match.kickoff)
  const cutoff = new Date(kickoff.getTime() - 3 * 60 * 60 * 1000)
  const stageLabel = match.stage === "GROUP" && match.group
    ? `Группа ${match.group.replace(/^GROUP_/, "")}`
    : STAGE_LABELS[match.stage] ?? match.stage

  const existingPrediction = session?.user?.id
    ? await prisma.prediction.findUnique({
        where: { userId_matchId: { userId: session.user.id, matchId: match.id } },
      })
    : null

  const nextMatch = session?.user?.id
    ? await prisma.match.findFirst({
        where: {
          id: { not: match.id },
          status: "SCHEDULED",
          kickoff: { gt: new Date(Date.now() + 3 * 60 * 60 * 1000) },
          NOT: { predictions: { some: { userId: session.user.id } } },
        },
        orderBy: { kickoff: "asc" },
        select: { id: true },
      })
    : null

  // Crowd stats — показываем только когда окно прогнозов закрыто (<=3ч до матча)
  const predictionsClosed = new Date() >= cutoff || match.status !== "SCHEDULED"
  const crowdPreds = predictionsClosed
    ? await prisma.prediction.findMany({
        where: { matchId: match.id },
        select: { homeScore: true, awayScore: true },
      })
    : []

  const crowd = { p1: 0, draw: 0, p2: 0, total: crowdPreds.length }
  for (const p of crowdPreds) {
    if (p.homeScore > p.awayScore) crowd.p1++
    else if (p.homeScore === p.awayScore) crowd.draw++
    else crowd.p2++
  }

  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED"
  const events = (match.events ?? []) as MatchEvent[]
  const homeEvents = events.filter(e => e.team === "home")
  const awayEvents = events.filter(e => e.team === "away")

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm tracking-widest uppercase text-gray-400 hover:text-gray-200 transition-colors"
      >
        ← К матчам
      </Link>

      {/* Заголовок */}
      <div className="text-center">
        <Badge variant="outline" className="mb-4 border-gray-700 text-gray-400">
          {stageLabel}
        </Badge>
        <h1 className="text-3xl font-bold">
          {teamFlag(match.homeTeam)} {match.homeTeam} — {match.awayTeam} {teamFlag(match.awayTeam)}
        </h1>
        <p className="text-gray-400 mt-2">
          {kickoff.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" })},{" "}
          {kickoff.toLocaleTimeString("ru-RU", { hour: "numeric", minute: "2-digit", timeZone: "Europe/Moscow" })} МСК
        </p>
        {match.city && <p className="text-gray-500 text-sm mt-0.5">{match.city}</p>}
        {match.status === "SCHEDULED" && !existingPrediction && (
          <p className="mt-2 text-[16px] flex items-center justify-center gap-2">
            <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">Прогноз закрывается через</span>{" "}
            <PredictionCountdown cutoff={cutoff.getTime()} />
          </p>
        )}
        {isLive && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-green-400/10 border border-green-400/30 rounded-sm px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-black text-green-400 tracking-widest">МАТЧ ИДЁТ</span>
          </div>
        )}
      </div>

      {/* Результат + события (завершённый матч) */}
      {match.status === "FINISHED" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="text-center mb-4">
            <p className="text-gray-400 text-sm mb-2">Результат</p>
            <p className="text-4xl font-bold">{match.homeScore}:{match.awayScore}</p>
            {match.winner && <p className="text-yellow-400 mt-2">Победитель: {match.winner}</p>}
          </div>

          {events.length > 0 && (
            <>
              <div className="border-t border-gray-800 mb-3" />
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-2 items-start">
                {events
                  .slice()
                  .sort((a, b) => a.minute - b.minute || (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0))
                  .map((e, i) => {
                    const minStr = e.minuteExtra ? `${e.minute}+${e.minuteExtra}'` : `${e.minute}'`
                    const icon = EVENT_ICON[e.type]
                    const isOwn = e.type === "own_goal"
                    const isMissed = e.type === "penalty_missed"
                    const textColor = e.type === "red_card"
                      ? "text-red-500"
                      : isMissed
                      ? "text-gray-500"
                      : "text-white"
                    return e.team === "home" ? (
                      <div key={i} className="contents">
                        <div className="flex items-center justify-end gap-1 text-right">
                          <span className={`text-sm font-medium ${textColor}`}>{e.player}{isOwn ? " (аг)" : ""}</span>
                          <span className="text-gray-400 text-xs shrink-0">{minStr} {icon}</span>
                        </div>
                        <div className="border-l border-gray-700 self-stretch mx-auto w-px" />
                        <div />
                      </div>
                    ) : (
                      <div key={i} className="contents">
                        <div />
                        <div className="border-l border-gray-700 self-stretch mx-auto w-px" />
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs shrink-0">{icon} {minStr}</span>
                          <span className={`text-sm font-medium ${textColor}`}>{e.player}{isOwn ? " (аг)" : ""}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Прогноз пользователя / форма */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        {existingPrediction ? (
          <div className="text-center space-y-3">
            <p className="text-green-400 text-lg font-semibold">✓ Прогноз сдан</p>
            <p className="text-3xl font-bold">
              {existingPrediction.homeScore}:{existingPrediction.awayScore}
            </p>
            {existingPrediction.winner && (
              <p className="text-gray-400 text-sm">Победитель: {existingPrediction.winner}</p>
            )}
            {existingPrediction.points != null && (
              <p className={`text-xl font-bold ${existingPrediction.points > 0 ? "text-green-400" : "text-gray-500"}`}>
                {existingPrediction.points > 0 ? `+${existingPrediction.points}` : existingPrediction.points} очков
              </p>
            )}
          </div>
        ) : match.status === "SCHEDULED" ? (
          <>
            <h2 className="text-lg font-semibold mb-4">Ваш прогноз</h2>
            <PredictionForm
              matchId={match.id}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              isPlayoff={PLAYOFF_STAGES.has(match.stage)}
              nextMatchId={nextMatch?.id ?? null}
              backTab={from ?? null}
            />
          </>
        ) : (
          <p className="text-center text-gray-500">Приём прогнозов закрыт</p>
        )}
      </div>

      {/* А хули думал, ты один такой? */}
      {predictionsClosed && crowd.total > 0 && (
        <div className="bg-[#0d0d00] border border-[#1a1500] rounded-sm p-4">
          <p className="text-[9px] font-black text-yellow-400 tracking-widest uppercase mb-0.5">
            А хули думал, ты один такой?
          </p>
          <p className="text-xs text-gray-500 mb-4">Что выбрали участники ({crowd.total})</p>
          <div className="space-y-3">
            {[
              { key: "p1", label: `П1  ${teamFlag(match.homeTeam)} ${match.homeTeam}`, count: crowd.p1 },
              { key: "x",  label: "Ничья", count: crowd.draw },
              { key: "p2", label: `П2  ${teamFlag(match.awayTeam)} ${match.awayTeam}`, count: crowd.p2 },
            ].map(({ key, label, count }) => {
              const pct = crowd.total > 0 ? Math.round(count / crowd.total * 100) : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-white">{label}</span>
                    <span className="text-gray-400">{count} · {pct}%</span>
                  </div>
                  <div className="bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
