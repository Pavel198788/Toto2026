import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchCard } from "@/components/match-card"
import { Button } from "@/components/ui/button"

export default async function HomePage() {
  const session = await auth()

  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const upcomingMatches = await prisma.match.findMany({
    where: {
      kickoff: { gte: now, lte: threeDaysLater },
    },
    orderBy: { kickoff: "asc" },
    take: 6,
  })

  let userPredictions: Record<string, boolean> = {}
  if (session?.user?.id) {
    const preds = await prisma.prediction.findMany({
      where: {
        userId: session.user.id,
        matchId: { in: upcomingMatches.map((m) => m.id) },
      },
      select: { matchId: true },
    })
    userPredictions = Object.fromEntries(preds.map((p) => [p.matchId, true]))
  }

  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">⚽ Тото 2026</h1>
        <p className="text-gray-400 text-lg">Футбольный тотализатор Чемпионата мира 2026</p>
        {!session && (
          <div className="mt-6 flex gap-4 justify-center">
            <Link href="/auth/login">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                Войти
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" className="border-gray-600">
                Зарегистрироваться
              </Button>
            </Link>
          </div>
        )}
      </section>

      {upcomingMatches.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Ближайшие матчи</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                hasPrediction={userPredictions[match.id] ?? false}
              />
            ))}
          </div>
        </section>
      )}

      {session && (
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/matches">
            <Button variant="outline" className="border-gray-700">Все матчи</Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="outline" className="border-gray-700">Рейтинг</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
