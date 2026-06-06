import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PredictionForm } from "@/components/prediction-form"
import { Badge } from "@/components/ui/badge"

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Групповой этап",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "Матч за 3-е место",
  FINAL: "Финал",
}

const PLAYOFF_STAGES = new Set(["R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"])

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const match = await prisma.match.findUnique({
    where: { id },
  })

  if (!match) notFound()

  const existingPrediction = session?.user?.id
    ? await prisma.prediction.findUnique({
        where: { userId_matchId: { userId: session.user.id, matchId: match.id } },
      })
    : null

  const kickoff = new Date(match.kickoff)
  const stageLabel = match.stage === "GROUP" && match.group
    ? `Группа ${match.group}`
    : STAGE_LABELS[match.stage] ?? match.stage

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <Badge variant="outline" className="mb-4 border-gray-700 text-gray-400">
          {stageLabel}
        </Badge>
        <h1 className="text-3xl font-bold">
          {match.homeTeam} — {match.awayTeam}
        </h1>
        <p className="text-gray-400 mt-2">
          {kickoff.toLocaleDateString("ru-RU", {
            weekday: "long", day: "numeric", month: "long",
          })}{" "}
          в {kickoff.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {match.status === "FINISHED" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm mb-2">Результат</p>
          <p className="text-4xl font-bold">
            {match.homeScore}:{match.awayScore}
          </p>
          {match.winner && <p className="text-yellow-400 mt-2">Победитель: {match.winner}</p>}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        {existingPrediction ? (
          <div className="text-center space-y-3">
            <p className="text-green-400 text-lg font-semibold">&#10003; Прогноз сдан</p>
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
            />
          </>
        ) : (
          <p className="text-center text-gray-500">Приём прогнозов закрыт</p>
        )}
      </div>
    </div>
  )
}
