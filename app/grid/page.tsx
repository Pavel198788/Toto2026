import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { PredictionsGrid } from "@/components/predictions-grid"

export default async function GridPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const userId = session.user.id  // сохраняем для TypeScript narrowing

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: {
      predictions: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  })

  const participants = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const gridData = matches.map((match) => ({
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    stage: match.stage,
    group: match.group,
    kickoff: match.kickoff,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    predictions: match.predictions
      .filter((p) => match.status === "FINISHED" || p.userId === userId)
      .map((p) => ({
        userId: p.userId,
        userName: p.user.name,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        winner: p.winner,
        points: p.points,
      })),
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Сетка прогнозов</h1>
      <p className="text-sm text-gray-400">
        Чужие прогнозы скрыты до окончания матча
      </p>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <PredictionsGrid
          matches={gridData}
          participants={participants}
          currentUserId={userId}
        />
      </div>
    </div>
  )
}
