export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchesList } from "@/components/matches-list"
import type { SerializedMatch, SerializedPrediction, DateGroup } from "@/components/matches-list"

const PLAYOFF_ORDER = ["ROUND_OF_32", "R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"]

const STAGE_LABELS: Record<string, string> = {
  ROUND_OF_32: "1/16 финала",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "За 3-е место",
  FINAL: "Финал",
}

export default async function PlayoffPage() {
  const session = await auth()

  const matches = await prisma.match.findMany({
    where: { stage: { in: PLAYOFF_ORDER as never } },
    orderBy: { kickoff: "asc" },
  })

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

  // Группировка по стадиям в порядке PLAYOFF_ORDER
  const byStage: DateGroup[] = []
  for (const stage of PLAYOFF_ORDER) {
    const stageMatches = matches.filter((m) => m.stage === stage)
    if (stageMatches.length === 0) continue
    byStage.push({
      dateKey: stage,
      label: STAGE_LABELS[stage] ?? stage,
      matches: stageMatches.map((match): SerializedMatch => ({
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
        winner: match.winner,
        city: match.city,
        country: match.country,
      })),
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Плей-офф</h1>

      {byStage.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Плей-офф ещё не начался</p>
          <p className="text-sm mt-2">Матчи появятся после группового этапа.</p>
        </div>
      ) : (
        <MatchesList
          byDate={byStage}
          userPredictions={userPredictions}
          isLoggedIn={!!session?.user}
          showAdvance
        />
      )}
    </div>
  )
}
