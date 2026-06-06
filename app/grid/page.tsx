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
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Сетка прогнозов</h1>
      <p className="text-xs text-gray-600">
        Чужие прогнозы скрыты до окончания матча
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
