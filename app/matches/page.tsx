import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchCard } from "@/components/match-card"
import { Stage } from "@prisma/client"

const STAGE_ORDER: Stage[] = ["GROUP", "R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"]
const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Групповой этап",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "Матч за 3-е место",
  FINAL: "Финал",
}

export default async function MatchesPage() {
  const session = await auth()

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
  })

  let userPredictions: Record<string, { homeScore: number; awayScore: number; points?: number | null }> = {}
  if (session?.user?.id) {
    const preds = await prisma.prediction.findMany({
      where: { userId: session.user.id },
      select: { matchId: true, homeScore: true, awayScore: true, points: true },
    })
    userPredictions = Object.fromEntries(preds.map((p) => [p.matchId, p]))
  }

  const grouped = STAGE_ORDER.reduce((acc, stage) => {
    const stageMatches = matches.filter((m) => m.stage === stage)
    if (stageMatches.length > 0) acc[stage] = stageMatches
    return acc
  }, {} as Record<Stage, typeof matches>)

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Все матчи</h1>

      {(Object.entries(grouped) as [Stage, typeof matches][]).map(([stage, stageMatches]) => (
        <section key={stage}>
          <h2 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-800 pb-2">
            {STAGE_LABELS[stage]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stageMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                hasPrediction={match.id in userPredictions}
                prediction={userPredictions[match.id] ?? null}
              />
            ))}
          </div>
        </section>
      ))}

      {matches.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Матчи ещё не загружены</p>
          <p className="text-sm mt-2">Данные появятся после синхронизации с football-data.org</p>
        </div>
      )}
    </div>
  )
}
