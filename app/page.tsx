import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MatchCard } from "@/components/match-card"

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
        <h1 className="text-4xl font-black text-yellow-400 tracking-wide mb-2">ТОТО 2026</h1>
        <p className="text-gray-600 text-sm tracking-wide">Футбольный тотализатор Чемпионата мира 2026</p>
        {!session && (
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/auth/login">
              <button className="bg-yellow-400 text-black font-black tracking-widest px-6 py-2.5 rounded-sm text-xs hover:bg-yellow-300 transition-colors">
                ВОЙТИ →
              </button>
            </Link>
            <Link href="/auth/register">
              <button className="border border-[#1a1500] text-yellow-400 font-bold tracking-widest px-6 py-2.5 rounded-sm text-xs hover:border-yellow-400/30 transition-colors">
                РЕГИСТРАЦИЯ
              </button>
            </Link>
          </div>
        )}
      </section>

      {upcomingMatches.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold text-yellow-400 tracking-widest uppercase mb-4">
            Ближайшие матчи
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <div className="flex gap-3 justify-center pt-4">
          <Link href="/matches">
            <button className="border border-[#1a1500] text-gray-600 tracking-widest px-6 py-2 rounded-sm text-[10px] hover:text-gray-400 hover:border-gray-700 transition-colors">
              ВСЕ МАТЧИ
            </button>
          </Link>
          <Link href="/leaderboard">
            <button className="border border-[#1a1500] text-gray-600 tracking-widest px-6 py-2 rounded-sm text-[10px] hover:text-gray-400 hover:border-gray-700 transition-colors">
              РЕЙТИНГ
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}
