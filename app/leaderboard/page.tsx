import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { LeaderboardTable } from "@/components/leaderboard-table"

export default async function LeaderboardPage() {
  const session = await auth()

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      predictions: {
        select: {
          points: true,
          match: { select: { stage: true } },
        },
      },
      bonusPredictions: {
        select: { points: true },
      },
    },
  })

  const entries = users
    .map((user) => {
      const matchPts = user.predictions.reduce((s, p) => s + (p.points ?? 0), 0)
      const bonusPts = user.bonusPredictions.reduce((s, b) => s + (b.points ?? 0), 0)
      const groupPts = user.predictions
        .filter((p) => p.match.stage === "GROUP")
        .reduce((s, p) => s + (p.points ?? 0), 0)
      const exactCount = user.predictions.filter((p) =>
        p.points === 11 || p.points === 22 || p.points === 32
      ).length
      return {
        id: user.id,
        name: user.name,
        total: matchPts + bonusPts,
        matchPoints: matchPts,
        groupPoints: groupPts,
        bonusPoints: bonusPts,
        exactCount,
      }
    })
    .sort((a, b) => b.total - a.total || b.exactCount - a.exactCount)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Рейтинг участников</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        {entries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Данных пока нет</p>
        ) : (
          <LeaderboardTable entries={entries} currentUserId={session?.user?.id} />
        )}
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <p><strong>Итого</strong> = очки за матчи + бонусные очки</p>
        <p><strong>100%</strong> = количество точных прогнозов (11/22/32 очка)</p>
        <p>При равенстве: сначала больше точных прогнозов</p>
      </div>
    </div>
  )
}
