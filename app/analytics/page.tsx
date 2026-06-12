import { prisma } from "@/lib/db"
import { teamFlag } from "@/lib/flags"
import {
  calcRecentDelta,
  calcCumulative,
  calcHotHand,
  calcContrarians,
  calcMatchesOfTour,
  calcTwins,
} from "@/lib/analytics-stats"

const AVATAR_COLORS = [
  "bg-yellow-600", "bg-green-700", "bg-blue-700", "bg-orange-700",
  "bg-violet-700", "bg-pink-700", "bg-emerald-700", "bg-orange-600",
  "bg-indigo-700", "bg-teal-700", "bg-fuchsia-700", "bg-lime-700",
  "bg-red-700", "bg-slate-600",
]

export default async function AnalyticsPage() {
  const [matches, users] = await Promise.all([
    prisma.match.findMany({
      where: { status: "FINISHED" },
      orderBy: { kickoff: "asc" },
      select: {
        id: true, kickoff: true, homeTeam: true, awayTeam: true,
        homeScore: true, awayScore: true, stage: true, group: true,
      },
    }),
    prisma.user.findMany({
      where: { isAdmin: false },
      select: { id: true, name: true },
    }),
  ])

  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Аналитика</h1>
        <p className="text-sm text-gray-500 py-12 text-center">
          Аналитика появится после первых матчей — следи за обновлениями!
        </p>
      </div>
    )
  }

  const matchIds = matches.map(m => m.id)
  const predictions = await prisma.prediction.findMany({
    where: { matchId: { in: matchIds } },
    select: { userId: true, matchId: true, homeScore: true, awayScore: true, points: true },
  })

  const recentN = Math.min(5, matches.length)
  const deltas = calcRecentDelta(matches, predictions, users, recentN)
  const cumulative = calcCumulative(matches, predictions, users)
  const hotHand = calcHotHand(matches, predictions, users)
  const contrarians = calcContrarians(matches, predictions, users)
  const matchesOfTour = calcMatchesOfTour(matches, predictions, users)
  const twins = calcTwins(predictions, users)

  const topHot = hotHand.filter(e => e.streak > 0).slice(0, 5)
  const topContrarians = contrarians.filter(e => e.wins > 0).slice(0, 5)
  const topTwins = twins.slice(0, 8)

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">Аналитика</h1>

      {/* СЕКЦИЯ 1: ГОНКА */}
      <div>
        <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-3">
          Гонка · последние {recentN} матчей
        </h2>
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
          <div className="flex gap-3 w-max">
            {deltas.map(entry => (
              <div
                key={entry.userId}
                className={[
                  "w-36 shrink-0 rounded-sm p-3 border",
                  entry.isFirst
                    ? "border-green-600/50 bg-green-900/10"
                    : entry.isLast
                    ? "border-red-900/40 bg-red-900/5"
                    : "border-[#1a1500] bg-[#111]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-gray-500 tracking-widest">#{entry.rank}</span>
                  {entry.isFirst && <span className="text-xs">🔥</span>}
                </div>
                <p className="text-xs font-semibold text-gray-300 truncate mb-2">{entry.name}</p>
                <p
                  className={[
                    "text-2xl font-black mb-1",
                    entry.isFirst
                      ? "text-green-400"
                      : entry.isLast
                      ? "text-red-400"
                      : "text-gray-200",
                  ].join(" ")}
                >
                  +{entry.delta}
                </p>
                <div className="bg-gray-800 rounded-full h-1 mb-1">
                  <div
                    className={[
                      "h-1 rounded-full",
                      entry.isFirst ? "bg-green-500" : entry.isLast ? "bg-red-800" : "bg-yellow-700",
                    ].join(" ")}
                    style={{ width: `${entry.maxDelta > 0 ? Math.round((entry.delta / entry.maxDelta) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[9px] text-gray-600">очков</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* СЕКЦИЯ 2: БЛИЗНЕЦЫ */}
      <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
        <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-1">
          Близнецы 👯
        </h2>
        <p className="text-xs text-gray-600 mb-4">Кто думает одинаково — совпадение прогнозов</p>
        {topTwins.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Пока недостаточно данных</p>
        ) : (
          <div className="space-y-3">
            {topTwins.map((pair, idx) => {
              const label =
                pair.pct >= 80 ? "👯 Близнецы" :
                pair.pct >= 65 ? "🤝 Похожи" :
                "🎲 Разные"
              return (
                <div key={`${pair.userId1}-${pair.userId2}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-200">
                      {pair.name1.split(" ")[0]}
                      <span className="text-gray-600 mx-1.5">↔</span>
                      {pair.name2.split(" ")[0]}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">{pair.sameCount} из {pair.commonMatches}</span>
                      <span className="text-[10px] font-black text-yellow-400">{label}</span>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${pair.pct}%`,
                        background: pair.pct >= 80
                          ? "linear-gradient(to right, #facc15, #fde68a)"
                          : pair.pct >= 65
                          ? "linear-gradient(to right, #92400e, #d97706)"
                          : "#374151",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* СЕКЦИЯ 3: ГОРЯЧАЯ РУКА */}
      <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
        <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-4">
          Горячая рука 🔥
        </h2>
        {topHot.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Все остыли — ждём следующих матчей</p>
        ) : (
          <div className="space-y-4">
            {topHot.map(entry => (
              <div key={entry.userId}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-200">{entry.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{entry.streak} подряд</span>
                    <span className="text-[10px] font-black tracking-widest text-yellow-400">{entry.label}</span>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${entry.maxStreak > 0 ? Math.round((entry.streak / entry.maxStreak) * 100) : 0}%`,
                      background: "linear-gradient(to right, #eab308, #22c55e)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* СЕКЦИЯ 4: САМЫЙ СМЕЛЫЙ */}
      {topContrarians.length >= 1 && (
        <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
          <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-1">
            Самый смелый 🎯
          </h2>
          <p className="text-xs text-gray-600 mb-4">Ставил против большинства — и угадал</p>
          <div className="space-y-4">
            {topContrarians.map((entry, idx) => (
              <div key={entry.userId}>
                <div className="flex items-center gap-3 mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
                  >
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-200 truncate">{entry.name}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                        {entry.wins} из {entry.attempts} · {entry.pct}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-yellow-500 h-1.5 rounded-full"
                    style={{ width: `${entry.maxWins > 0 ? Math.round((entry.wins / entry.maxWins) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* СЕКЦИЯ 5: МАТЧ ТУРА */}
      {matchesOfTour.length > 0 && (
        <div>
          <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-3">
            Матч тура
          </h2>
          <div className="space-y-3">
            {matchesOfTour.map(mot => (
              <div key={mot.matchId} className="bg-[#111] border border-[#1a1500] rounded-sm overflow-hidden">
                <div className="px-4 py-2 bg-[#1a1500] border-b border-[#2a2000]">
                  <span className="text-[9px] font-black text-yellow-400 tracking-widest">
                    {mot.tourLabel} · МАТЧ ТУРА
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg">{teamFlag(mot.homeTeam)}</span>
                    <span className="text-sm font-semibold text-gray-200 flex-1">{mot.homeTeam}</span>
                    <span className="text-xl font-black text-yellow-400 px-2">
                      {mot.homeScore} : {mot.awayScore}
                    </span>
                    <span className="text-sm font-semibold text-gray-200 flex-1 text-right">{mot.awayTeam}</span>
                    <span className="text-lg">{teamFlag(mot.awayTeam)}</span>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">
                        {mot.guessedCount} из {mot.totalCount} угадали исход
                        {mot.exactCount > 0 && ` · ${mot.exactCount} в счёт`}
                      </span>
                      <span className="text-gray-400">
                        {mot.totalCount > 0 ? Math.round((mot.guessedCount / mot.totalCount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-yellow-500 h-1.5 rounded-full"
                        style={{
                          width: `${mot.totalCount > 0 ? Math.round((mot.guessedCount / mot.totalCount) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {mot.jackpotNames.length > 0 && (
                    <p className="text-xs text-gray-400">
                      <span className="text-green-400 font-semibold">Сорвали куш: </span>
                      {mot.jackpotNames.join(", ")}
                    </p>
                  )}
                  {mot.missedNames.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="text-red-400 font-semibold">Промахнулись: </span>
                      {mot.missedNames.join(", ")}
                      {mot.missedExtra > 0 && ` и ещё ${mot.missedExtra}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
