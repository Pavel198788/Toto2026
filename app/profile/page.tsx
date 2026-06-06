// app/profile/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import {
  calcRank, calcStreak, buildMatchTourMap, calcPointsByStage,
  calcTwin, calcComparison, type RankedUser,
} from "@/lib/profile-stats"
import { teamFlag } from "@/lib/flags"

const EXACT_POINTS = new Set([11, 22, 32])

const STAGE_LABELS: Record<string, string> = {
  tour1: "Тур 1", tour2: "Тур 2", tour3: "Тур 3",
  R16: "1/8", QUARTERFINAL: "1/4", SEMIFINAL: "1/2",
  THIRD_PLACE: "3-е", FINAL: "Финал",
}

const STAGE_ORDER = ["tour1", "tour2", "tour3", "R16", "QUARTERFINAL", "SEMIFINAL", "FINAL"]

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id

  const [myPredictions, allUsers, totalMatches, groupMatches] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId },
      orderBy: { match: { kickoff: "asc" } },
      include: { match: true },
    }),
    prisma.user.findMany({
      where: { isAdmin: false },
      select: {
        id: true, name: true,
        predictions: { select: { points: true } },
        bonusPredictions: { select: { points: true } },
      },
    }),
    prisma.match.count(),
    prisma.match.findMany({
      where: { stage: "GROUP" },
      orderBy: { kickoff: "asc" },
      select: { id: true, group: true },
    }),
  ])

  const myMatchIds = myPredictions.map(p => p.matchId)
  const crossPredictions = myMatchIds.length > 0
    ? await prisma.prediction.findMany({
        where: { matchId: { in: myMatchIds } },
        select: { userId: true, matchId: true, homeScore: true, awayScore: true, points: true },
      })
    : []

  const rankedUsers: RankedUser[] = allUsers
    .map(u => ({
      id: u.id,
      name: u.name ?? "",
      total:
        u.predictions.reduce((s, p) => s + (p.points ?? 0), 0) +
        u.bonusPredictions.reduce((s, b) => s + (b.points ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total)

  const matchTourMap = buildMatchTourMap(groupMatches)
  const rankInfo = calcRank(userId, rankedUsers)
  const streak = calcStreak(myPredictions)
  const pointsByStage = calcPointsByStage(myPredictions, matchTourMap)
  const twin = calcTwin(userId, crossPredictions, rankedUsers)
  const comparison = calcComparison(userId, crossPredictions, myPredictions.map(p => p.match))

  const finished = myPredictions.filter(p => p.match.status === "FINISHED")
  const guessed = finished.filter(p => (p.points ?? 0) > 0).length
  const accuracy = finished.length > 0 ? Math.round(guessed / finished.length * 100) : 0
  const exactCount = finished.filter(p => EXACT_POINTS.has(p.points ?? 0)).length

  const maxStagePoints = Math.max(...STAGE_ORDER.map(s => pointsByStage[s] ?? 0), 1)
  const completionPercent = totalMatches > 0 ? Math.round(myPredictions.length / totalMatches * 100) : 0
  const initials = (session.user.name ?? "?").charAt(0).toUpperCase()
  const leaderTotal = rankedUsers[0]?.total ?? 1

  const homeWins = myPredictions.filter(p => p.homeScore > p.awayScore).length
  const draws = myPredictions.filter(p => p.homeScore === p.awayScore).length
  const awayWins = myPredictions.filter(p => p.homeScore < p.awayScore).length

  const bestPred = finished.length > 0
    ? finished.reduce((best, p) => ((p.points ?? 0) > (best.points ?? 0) ? p : best), finished[0])
    : null

  const avgPredGoals = myPredictions.length > 0
    ? (myPredictions.reduce((s, p) => s + p.homeScore + p.awayScore, 0) / myPredictions.length).toFixed(1)
    : null
  const avgRealGoals = finished.length > 0
    ? (finished.reduce((s, p) => s + (p.match.homeScore ?? 0) + (p.match.awayScore ?? 0), 0) / finished.length).toFixed(1)
    : null

  const last5 = finished.slice(-5)

  return (
    <div className="space-y-6 pb-8">
      {/* 1. ШАПКА */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-sm bg-yellow-400 flex items-center justify-center text-black font-black text-xl shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{session.user.name ?? "Без имени"}</h1>
          <p className="text-gray-400 text-sm truncate">{session.user.email ?? ""}</p>
        </div>
        {rankInfo.rank > 0 && (
          <div className="bg-yellow-400 text-black text-[10px] font-black tracking-widest px-3 py-1.5 rounded-sm shrink-0">
            #{rankInfo.rank} место
          </div>
        )}
      </div>

      {/* 2. ЧЕТЫРЕ ПЛАШКИ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4 text-center">
          <p className="text-3xl font-black text-yellow-400">{rankInfo.total}</p>
          <p className="text-sm text-gray-400 mt-1">Очков всего</p>
        </div>
        <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4 text-center">
          <p className="text-3xl font-black text-green-400">{accuracy}%</p>
          <p className="text-sm text-gray-400 mt-1">Угадал исход</p>
          {finished.length > 0 && (
            <div className="flex justify-center gap-3 mt-2 text-xs">
              <span className="text-green-400 font-medium">{guessed} ✓</span>
              <span className="text-red-400 font-medium">{finished.length - guessed} ✗</span>
            </div>
          )}
        </div>
        <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4 text-center">
          <p className="text-3xl font-black text-orange-400">🔥 {streak}</p>
          <p className="text-sm text-gray-400 mt-1">Серия подряд</p>
        </div>
        <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Прогнозов</span>
            <span className="font-bold">{myPredictions.length} / {totalMatches}</span>
          </div>
          <div className="bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-yellow-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, completionPercent)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {completionPercent}% заполнено
          </p>
        </div>
      </div>

      {/* 3. МИНИ-РЕЙТИНГ */}
      {rankInfo.rank > 0 && (
        <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
          <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-3">
            Рейтинг участников
          </h2>
          <div className="space-y-2">
            {rankInfo.above && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-7">#{rankInfo.above.rank}</span>
                <span className="text-gray-300 text-sm flex-1 truncate">{rankInfo.above.name}</span>
                <div className="bg-gray-700 rounded h-1 w-20 shrink-0">
                  <div className="bg-gray-500 h-1 rounded" style={{ width: `${rankInfo.above.total / leaderTotal * 100}%` }} />
                </div>
                <span className="text-gray-400 text-sm w-14 text-right shrink-0">{rankInfo.above.total} оч.</span>
              </div>
            )}
            <div className="flex items-center gap-3 bg-[#1a1500] border-l-2 border-l-yellow-400 rounded-sm px-2 py-1.5 -mx-2">
              <span className="text-yellow-400 font-bold text-sm w-7">#{rankInfo.rank}</span>
              <span className="text-white font-bold text-sm flex-1 truncate">Ты</span>
              <div className="bg-gray-700 rounded h-1 w-20 shrink-0">
                <div className="bg-yellow-500 h-1 rounded" style={{ width: `${rankInfo.total / leaderTotal * 100}%` }} />
              </div>
              <span className="text-yellow-400 font-bold text-sm w-14 text-right shrink-0">{rankInfo.total} оч.</span>
            </div>
            {rankInfo.below && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-7">#{rankInfo.below.rank}</span>
                <span className="text-gray-300 text-sm flex-1 truncate">{rankInfo.below.name}</span>
                <div className="bg-gray-700 rounded h-1 w-20 shrink-0">
                  <div className="bg-gray-500 h-1 rounded" style={{ width: `${rankInfo.below.total / leaderTotal * 100}%` }} />
                </div>
                <span className="text-gray-400 text-sm w-14 text-right shrink-0">{rankInfo.below.total} оч.</span>
              </div>
            )}
          </div>
          {rankInfo.pointsToNext !== null && rankInfo.pointsToNext > 0 && (
            <p className="text-xs text-gray-500 text-center mt-3">
              До #{rankInfo.rank - 1} места: {rankInfo.pointsToNext} очков
            </p>
          )}
        </div>
      )}

      {/* 4. ГРАФИК ПО ЭТАПАМ */}
      <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
        <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-4">
          Очки по этапам
        </h2>
        <div className="flex gap-1 items-end h-16">
          {STAGE_ORDER.map(stage => {
            const pts = pointsByStage[stage] ?? 0
            const heightPct = pts > 0 ? Math.max(10, Math.round(pts / maxStagePoints * 100)) : 4
            return (
              <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                {pts > 0 && <span className="text-xs text-gray-400">{pts}</span>}
                <div
                  className={`w-full rounded-sm ${pts > 0 ? "bg-yellow-500" : "bg-gray-700"}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex gap-1 mt-1">
          {STAGE_ORDER.map(stage => (
            <div key={stage} className="flex-1 text-center text-xs text-gray-500 truncate">
              {STAGE_LABELS[stage]}
            </div>
          ))}
        </div>
      </div>

      {/* 5. АНАЛИТИКА */}
      <div>
        <h2 className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase mb-3">
          Аналитика
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* 5а. 100% попаданий */}
          <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
            <p className="text-xs text-gray-400 mb-2">ТОЧНЫЙ СЧЁТ</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-green-400">{exactCount}</span>
              <span className="text-sm text-gray-500">из {finished.length}</span>
            </div>
            <div className="bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${finished.length > 0 ? exactCount / finished.length * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">точных счётов</p>
          </div>

          {/* 5б. Сравнение с группой */}
          {finished.length > 0 && (
            <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
              <p className="text-xs text-gray-400 mb-3">СРАВНЕНИЕ С ГРУППОЙ</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Угадал только ты</span>
                  <span className="font-bold text-green-400">{comparison.uniquelyCorrect}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Все угадали, кроме тебя</span>
                  <span className="font-bold text-red-400">{comparison.missedByOthersGot}</span>
                </div>
                {comparison.rarestMatch && (
                  <div className="border-t border-gray-800 pt-2">
                    <p className="text-xs text-gray-500 mb-1">Самый редкий прогноз</p>
                    <p className="text-xs text-white">
                      {teamFlag(comparison.rarestMatch.homeTeam)} {comparison.rarestMatch.homeTeam} — {teamFlag(comparison.rarestMatch.awayTeam)} {comparison.rarestMatch.awayTeam}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5г. Двойник */}
          {twin && (
            <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
              <p className="text-xs text-gray-400 mb-3">ТВОЙ ДВОЙНИК</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {twin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold">{twin.name}</p>
                  <p className="text-xs text-gray-400">#{twin.rank} место</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded px-2 py-1 text-xs text-gray-300">
                Совпадают <span className="font-bold text-white">{twin.matchCount}</span> из {myPredictions.length} прогнозов
              </div>
            </div>
          )}

          {/* 5д. Любимый исход */}
          {myPredictions.length > 0 && (
            <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
              <p className="text-xs text-gray-400 mb-3">ЛЮБИМЫЙ ИСХОД</p>
              <div className="space-y-2">
                {[
                  { label: "Хозяева", count: homeWins, color: "bg-blue-500" },
                  { label: "Ничья", count: draws, color: "bg-yellow-500" },
                  { label: "Гости", count: awayWins, color: "bg-purple-500" },
                ].map(({ label, count, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-gray-300 font-medium">{count}</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`${color} h-1.5 rounded-full`}
                        style={{ width: `${Math.round(count / myPredictions.length * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5е. Лучший матч */}
          {bestPred && (bestPred.points ?? 0) > 0 && (
            <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
              <p className="text-xs text-gray-400 mb-3">ЛУЧШИЙ МАТЧ</p>
              <p className="text-xs text-gray-300 leading-tight mb-2">
                {teamFlag(bestPred.match.homeTeam)} {bestPred.match.homeTeam}<br />
                — {teamFlag(bestPred.match.awayTeam)} {bestPred.match.awayTeam}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {bestPred.homeScore}:{bestPred.awayScore}
                </span>
                <span className="text-xl font-bold text-green-400">+{bestPred.points}</span>
              </div>
            </div>
          )}

          {/* 5ж. Среднее голов */}
          {avgPredGoals !== null && (
            <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
              <p className="text-xs text-gray-400 mb-3">СРЕДНЕЕ ГОЛОВ</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Твои прогнозы</span>
                  <span className="text-lg font-bold text-yellow-400">{avgPredGoals}</span>
                </div>
                {avgRealGoals !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Реальные матчи</span>
                    <span className="text-lg font-bold text-gray-300">{avgRealGoals}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">голов за матч в среднем</p>
            </div>
          )}

          {/* 5з. Форма (последние 5) */}
          {last5.length > 0 && (
            <div className="bg-[#111] border border-[#1a1500] rounded-sm p-4">
              <p className="text-xs text-gray-400 mb-3">ФОРМА (последние {last5.length})</p>
              <div className="flex gap-2 justify-center">
                {last5.map((p, i) => {
                  const pts = p.points ?? 0
                  const isExact = EXACT_POINTS.has(pts)
                  const isCorrect = pts > 0 && !isExact
                  return (
                    <div
                      key={i}
                      title={`${p.match.homeTeam} — ${p.match.awayTeam}: ${pts > 0 ? `+${pts}` : "0"}`}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isExact ? "bg-green-600 text-white" :
                        isCorrect ? "bg-yellow-600 text-black" :
                        "bg-gray-700 text-gray-500"
                      }`}
                    >
                      {pts > 0 ? `+${pts}` : "0"}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. СПИСОК ПРОГНОЗОВ */}
      <div>
        <h2 className="text-[10px] font-black text-yellow-400 tracking-widest uppercase mb-3">Мои прогнозы</h2>
        {myPredictions.length === 0 && (
          <p className="text-gray-500 text-center py-8">У вас пока нет прогнозов</p>
        )}
        <div className="space-y-2">
          {myPredictions.map(pred => {
            const isFinished = pred.match.status === "FINISHED"
            const pts = pred.points ?? 0
            const isExact = EXACT_POINTS.has(pts)
            const isCorrect = pts > 0 && !isExact
            const groupLetter = pred.match.group?.replace(/^GROUP_/, "") ?? ""
            const stageLabel = pred.match.stage === "GROUP" && groupLetter
              ? `Группа ${groupLetter}`
              : ({ R16: "1/8 финала", QUARTERFINAL: "1/4 финала", SEMIFINAL: "1/2 финала", THIRD_PLACE: "За 3-е место", FINAL: "Финал" } as Record<string, string>)[pred.match.stage] ?? pred.match.stage
            const kickoffStr = new Date(pred.match.kickoff).toLocaleDateString("ru-RU", {
              day: "numeric", month: "short",
            })

            const leftBorder = !isFinished
              ? ""
              : isExact
              ? "border-l-2 border-l-green-500"
              : isCorrect
              ? "border-l-2 border-l-yellow-400"
              : "border-l-2 border-l-gray-800"

            const actualScoreColor = isExact
              ? "text-green-400"
              : isCorrect
              ? "text-yellow-400"
              : "text-gray-400"

            return (
              <div
                key={pred.id}
                className={`bg-[#111] rounded-sm p-4 ${isFinished ? `border border-[#1a1500] ${leftBorder}` : "border border-dashed border-[#1a1500]/60"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-sm">
                      {teamFlag(pred.match.homeTeam)} {pred.match.homeTeam} — {teamFlag(pred.match.awayTeam)} {pred.match.awayTeam}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">{kickoffStr} · {stageLabel}</p>
                  </div>
                  {isFinished ? (
                    <span className={
                      isExact ? "bg-green-900/40 border border-green-800 text-green-400 text-[9px] tracking-widest rounded-sm px-1.5 py-0.5" :
                      isCorrect ? "bg-[#1a1500] border border-[#2a2000] text-yellow-400 text-[9px] tracking-widest rounded-sm px-1.5 py-0.5" :
                      "bg-[#0d0d0d] border border-[#1a1500] text-gray-600 text-[9px] tracking-widest rounded-sm px-1.5 py-0.5"
                    }>
                      {pts > 0 ? `+${pts}` : "+0"}
                    </span>
                  ) : (
                    <span className="border border-[#1a1500] text-gray-600 text-[9px] tracking-widest rounded-sm px-1.5 py-0.5">
                      ожидается
                    </span>
                  )}
                </div>
                <div className="border-t border-[#1a1500] pt-3 flex gap-8">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Мой прогноз</p>
                    <p className="font-bold text-sm">{pred.homeScore} : {pred.awayScore}</p>
                  </div>
                  {isFinished && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Итог матча</p>
                      <p className={`font-bold text-sm ${actualScoreColor}`}>
                        {pred.match.homeScore ?? "?"} : {pred.match.awayScore ?? "?"}
                        {isExact && " ✓"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
