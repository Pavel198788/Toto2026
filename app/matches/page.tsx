import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchesTabs } from "@/components/matches-tabs"
import { teamFlag } from "@/lib/flags"
import { PredictionCountdown } from "@/components/prediction-countdown"

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Группа",
  R16: "1/8",
  QUARTERFINAL: "1/4",
  SEMIFINAL: "1/2",
  THIRD_PLACE: "3-е место",
  FINAL: "Финал",
}

const TABS = [
  { key: "all",          label: "Все матчи" },
  { key: "tour1",        label: "Тур 1" },
  { key: "tour2",        label: "Тур 2" },
  { key: "tour3",        label: "Тур 3" },
  { key: "R16",          label: "1/8 финала" },
  { key: "QUARTERFINAL", label: "1/4 финала" },
  { key: "SEMIFINAL",    label: "1/2 финала" },
  { key: "THIRD_PLACE",  label: "За 3-е место" },
  { key: "FINAL",        label: "Финал" },
]

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = "all" } = await searchParams
  const session = await auth()

  const allMatches = await prisma.match.findMany({ orderBy: { kickoff: "asc" } })

  // Определяем тур для каждого матча группового этапа по порядку внутри группы
  // (первые 2 матча группы = Тур 1, следующие 2 = Тур 2, последние 2 = Тур 3)
  const groupBuckets: Record<string, string[]> = {}
  for (const m of allMatches) {
    if (m.stage !== "GROUP") continue
    const g = m.group ?? "?"
    if (!groupBuckets[g]) groupBuckets[g] = []
    groupBuckets[g].push(m.id)
  }
  const matchTourMap: Record<string, string> = {}
  for (const ids of Object.values(groupBuckets)) {
    ids.forEach((id, i) => {
      matchTourMap[id] = i < 2 ? "tour1" : i < 4 ? "tour2" : "tour3"
    })
  }

  function getMatchTab(m: typeof allMatches[0]): string {
    if (m.stage !== "GROUP") return m.stage
    return matchTourMap[m.id] ?? "tour1"
  }

  // Count per tab
  const counts: Record<string, number> = { all: allMatches.length }
  for (const m of allMatches) {
    const t = getMatchTab(m)
    counts[t] = (counts[t] ?? 0) + 1
  }

  const tabs = TABS.map((t) => ({ ...t, count: counts[t.key] ?? 0 })).filter(
    (t) => t.key === "all" || t.count > 0
  )

  // Filter matches for active tab
  const matches =
    tab === "all"
      ? allMatches
      : allMatches.filter((m) => getMatchTab(m) === tab)

  // User predictions
  let userPredictions: Record<string, { homeScore: number; awayScore: number; points?: number | null }> = {}
  if (session?.user?.id) {
    const preds = await prisma.prediction.findMany({
      where: { userId: session.user.id },
      select: { matchId: true, homeScore: true, awayScore: true, points: true },
    })
    userPredictions = Object.fromEntries(preds.map((p) => [p.matchId, p]))
  }

  // Group visible matches by date (Moscow time UTC+3)
  const byDate: { dateKey: string; label: string; matches: typeof matches }[] = []
  for (const match of matches) {
    const msk = new Date(match.kickoff.getTime() + 3 * 60 * 60 * 1000)
    const dateKey = msk.toISOString().slice(0, 10)
    const label = match.kickoff.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Moscow",
    })
    let group = byDate.find((g) => g.dateKey === dateKey)
    if (!group) {
      group = { dateKey, label, matches: [] }
      byDate.push(group)
    }
    group.matches.push(match)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Расписание матчей</h1>

      <MatchesTabs tabs={tabs} activeTab={tab} />

      <div className="flex items-center gap-3 border-y border-[#1a1500] py-3 bg-[#0d0d0d]">
        <span className="text-lg shrink-0">⏱️</span>
        <p className="text-xs text-gray-500 flex-1">
          Приём прогнозов на матч <span className="text-gray-300 font-semibold">закрывается за 3 часа до начала</span>. После этого прогноз поставить нельзя.
        </p>
      </div>

      {matches.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Матчи не найдены</p>
        </div>
      )}

      {byDate.map(({ dateKey, label, matches: dayMatches }) => (
        <section key={dateKey}>
          <h2 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3 border-b border-[#1a1500] pb-2">
            {label}
          </h2>

          <div className="divide-y divide-gray-800/60">
            {dayMatches.map((match) => {
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

              const isFinished = match.status === "FINISHED"
              const isLive = match.status === "IN_PLAY" || match.status === "PAUSED"
              const cutoff = new Date(match.kickoff.getTime() - 3 * 60 * 60 * 1000)
              const canPredict = match.status === "SCHEDULED" && !(match.id in userPredictions) && new Date() < cutoff
              const pred = userPredictions[match.id]

              const outcome = (h: number, a: number) => h > a ? "H" : h < a ? "A" : "D"
              const predIcon = (isFinished && pred && match.homeScore != null && match.awayScore != null)
                ? (match.homeScore === pred.homeScore && match.awayScore === pred.awayScore)
                  ? "🎯"
                  : outcome(match.homeScore, match.awayScore) === outcome(pred.homeScore, pred.awayScore)
                  ? "🔥"
                  : "💩"
                : null

              return (
                <div key={match.id} className="py-3 flex items-center gap-3 hover:bg-[#111]/60 -mx-2 px-2 rounded-sm transition-colors">
                  {/* Time + city (mobile) */}
                  <div className="shrink-0 w-12 text-right">
                    <span className="text-sm text-gray-500 font-mono block">{timeStr}</span>
                    {match.city && (
                      <span className="sm:hidden text-[9px] text-gray-500 block leading-tight">{match.city}</span>
                    )}
                  </div>

                  {/* Stage badge + city (desktop) */}
                  <div className="hidden sm:flex flex-col items-start shrink-0 w-20 gap-0.5">
                    <span className="text-[9px] border border-[#1a1500] text-gray-600 tracking-widest w-full justify-center flex rounded-sm px-1 py-0.5">
                      {stageLabel}
                    </span>
                    {match.city && (
                      <span className="text-xs text-gray-600 truncate w-full text-center">{match.city}</span>
                    )}
                  </div>

                  {/* Teams + score */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                      <span className="font-medium text-sm truncate">{match.homeTeam}</span>
                      <span className="shrink-0 text-base leading-none">{teamFlag(match.homeTeam)}</span>
                    </div>

                    <div className="shrink-0 w-14 text-center">
                      {isFinished || isLive ? (
                        <span className={`font-bold text-lg ${isLive ? "text-green-400" : "text-white"}`}>
                          {match.homeScore ?? 0}:{match.awayScore ?? 0}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </div>

                    <div className="flex-1 flex items-center gap-1 min-w-0">
                      <span className="shrink-0 text-base leading-none">{teamFlag(match.awayTeam)}</span>
                      <span className="font-medium text-sm truncate">{match.awayTeam}</span>
                    </div>
                  </div>

                  {/* Status / prediction / action */}
                  <div className="shrink-0 flex items-center gap-2 ml-auto">
                    {isLive && (
                      <span className="text-xs text-green-400 font-medium animate-pulse hidden sm:inline">
                        Идёт
                      </span>
                    )}
                    {isFinished && pred && (
                      <span className={`text-lg font-black flex items-center gap-1 ${predIcon === "💩" ? "text-red-500" : "text-green-400"}`}>
                        {predIcon} {pred.homeScore}:{pred.awayScore}
                        {pred.points != null && (
                          <span className={`ml-1 text-sm ${pred.points > 0 ? "text-green-400" : "text-gray-600"}`}>
                            {pred.points > 0 ? `+${pred.points}` : pred.points}
                          </span>
                        )}
                      </span>
                    )}
                    {isFinished && !pred && (
                      <span className="text-xs text-gray-600 hidden sm:inline">без прогноза</span>
                    )}
                    {!isFinished && !isLive && pred && (
                      <span className="text-lg font-black text-yellow-400">📝 {pred.homeScore}:{pred.awayScore}</span>
                    )}
                    {match.status === "SCHEDULED" && !(match.id in userPredictions) && (
                      <PredictionCountdown cutoff={cutoff.getTime()} />
                    )}
                    {canPredict && session && (
                      <Link href={`/matches/${match.id}`}>
                        <button className="bg-[#1a1500] text-yellow-400 font-black tracking-widest px-3 py-1 rounded-sm text-[9px] hover:bg-yellow-400/10 transition-colors whitespace-nowrap">
                          ПРОГНОЗ →
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
