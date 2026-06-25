export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchesTabs } from "@/components/matches-tabs"
import { MatchesList } from "@/components/matches-list"
import type { SerializedMatch, SerializedPrediction, DateGroup } from "@/components/matches-list"

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
  let userPredictions: Record<string, SerializedPrediction> = {}
  if (session?.user?.id) {
    const preds = await prisma.prediction.findMany({
      where: { userId: session.user.id },
      select: { matchId: true, homeScore: true, awayScore: true, points: true },
    })
    userPredictions = Object.fromEntries(
      preds.map((p) => [p.matchId, { homeScore: p.homeScore, awayScore: p.awayScore, points: p.points }])
    )
  }

  // Group visible matches by date (Moscow time UTC+3) — serialize for client component
  const byDate: DateGroup[] = []
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
    const serialized: SerializedMatch = {
      id: match.id,
      externalId: match.externalId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      stage: match.stage,
      group: match.group,
      kickoff: match.kickoff.toISOString(),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      city: match.city,
      country: match.country,
    }
    group.matches.push(serialized)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Расписание матчей</h1>

      <MatchesTabs tabs={tabs} activeTab={tab} />

      <div className="border-y border-[#1a1500] py-3 bg-[#0d0d0d] text-center">
        <p className="text-xl text-gray-500">
          ⏱️ Приём прогнозов на матч <span className="text-gray-300 font-semibold">закрывается за 3 часа до начала</span>. После этого прогноз поставить нельзя.
        </p>
      </div>

      {matches.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Матчи не найдены</p>
        </div>
      )}

      <MatchesList
        byDate={byDate}
        userPredictions={userPredictions}
        isLoggedIn={!!session?.user}
        activeTab={tab}
      />
    </div>
  )
}
