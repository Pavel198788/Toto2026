export const dynamic = "force-dynamic"

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
    where: { isAdmin: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const now = new Date()
  const gridData = matches.map((match) => {
    const cutoff = new Date(match.kickoff.getTime() - 3 * 60 * 60 * 1000)
    const predictionsClosed = now >= cutoff || match.status !== "SCHEDULED"
    return {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      stage: match.stage,
      group: match.group,
      kickoff: match.kickoff.toISOString(),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      predictionsClosed,
      // когда окно ещё открыто — передаём только ID кто уже поставил (без счётов)
      submittedUserIds: predictionsClosed
        ? []
        : match.predictions.map((p) => p.userId),
      predictions: match.predictions
        .filter((p) => predictionsClosed || p.userId === userId)
        .map((p) => ({
          userId: p.userId,
          userName: p.user.name,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          winner: p.winner,
          points: p.points,
        })),
    }
  })

  return (
    <div className="space-y-4">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Сетка прогнозов</h1>
      <p className="text-xs text-gray-600">
        Чужие прогнозы открываются за 3 часа до старта матча
      </p>
      <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
        <PredictionsGrid
          matches={gridData}
          participants={participants}
          currentUserId={userId}
        />
      </div>
    </div>
  )
}
