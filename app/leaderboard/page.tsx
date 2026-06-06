import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { LeaderboardTable } from "@/components/leaderboard-table"

export default async function LeaderboardPage() {
  const session = await auth()

  const users = await prisma.user.findMany({
    where: { isAdmin: false },
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
      const bonusPts = user.bonusPredictions.reduce((s, b) => s + (b.points ?? 0), 0)
      const groupPts = user.predictions
        .filter((p) => p.match.stage === "GROUP")
        .reduce((s, p) => s + (p.points ?? 0), 0)
      const playoffPts = user.predictions
        .filter((p) => p.match.stage !== "GROUP")
        .reduce((s, p) => s + (p.points ?? 0), 0)
      const exactCount = user.predictions.filter((p) =>
        p.points === 11 || p.points === 22 || p.points === 32
      ).length
      return {
        id: user.id,
        name: user.name,
        total: groupPts + playoffPts + bonusPts,
        groupPoints: groupPts,
        playoffPoints: playoffPts,
        bonusPoints: bonusPts,
        exactCount,
      }
    })
    .sort((a, b) => b.total - a.total || b.exactCount - a.exactCount)

  const totalPrize = users.length * 10000
  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽"

  return (
    <div className="space-y-6">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Рейтинг участников</h1>

      {/* Призовой фонд — золотой слиток */}
      <div className="bg-[#0e0b00] border border-[#3a2a00] rounded-sm overflow-hidden">
        {/* Шапка */}
        <div className="relative bg-gradient-to-br from-[#1a1200] via-[#2a1e00] to-[#1a1200] px-5 py-5 text-center border-b border-[#3a2a00]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
          <p className="text-[9px] tracking-[4px] text-[#7a6000] uppercase mb-2">Призовой фонд · ЧМ-2026</p>
          <p className="text-4xl font-black text-yellow-400 tracking-tight" style={{ textShadow: "0 0 40px rgba(250,204,21,0.3)" }}>{fmt(totalPrize)}</p>
          <p className="text-[9px] tracking-[2px] text-[#5a4500] mt-1">{users.length} участников × 10 000 ₽</p>
        </div>

        {/* Строки */}
        {[
          { medal: "🥇", label: "1 место", pct: 0.55, color: "text-yellow-400", nameColor: "text-yellow-200", sub: "text-[#8a6a00]" },
          { medal: "🥈", label: "2 место", pct: 0.25, color: "text-gray-300", nameColor: "text-gray-300", sub: "text-gray-600" },
          { medal: "🥉", label: "3 место", pct: 0.10, color: "text-orange-300", nameColor: "text-orange-300", sub: "text-[#7a4a1a]" },
          { medal: "🎯", label: "Лучший в плей-офф", pct: 0.10, color: "text-green-400", nameColor: "text-green-300", sub: "text-green-800" },
        ].map(({ medal, label, pct, color, nameColor, sub }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-3 border-b border-[#1a1200] last:border-b-0">
            <span className="text-lg w-7 flex-shrink-0">{medal}</span>
            <div className="flex-1">
              <p className={`text-[11px] font-semibold tracking-wide ${nameColor}`}>{label}</p>
              <p className={`text-[10px] tracking-wide mt-0.5 ${sub}`}>{Math.round(pct * 100)}% от фонда</p>
            </div>
            <span className={`text-base font-black ${color}`}>{fmt(Math.round(totalPrize * pct))}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-[#1a1500] rounded-sm p-6">
        {entries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Данных пока нет</p>
        ) : (
          <LeaderboardTable entries={entries} currentUserId={session?.user?.id} />
        )}
      </div>
      <div className="text-[10px] text-gray-700 space-y-1 tracking-wide">
        <p><strong>Итого</strong> = Группа + Плей-офф + Бонусы</p>
        <p><strong>Плей-офф</strong> = 1/8, 1/4, 1/2 финала, матч за 3-е место, финал</p>
        <p><strong>100%</strong> = количество точных прогнозов (11/22/32 очка)</p>
        <p>При равенстве: сначала больше точных прогнозов</p>
      </div>
    </div>
  )
}
