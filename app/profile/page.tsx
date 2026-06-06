// app/profile/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id },
    orderBy: { match: { kickoff: "asc" } },
    include: {
      match: true,
    },
  })

  const totalPoints = predictions.reduce((s, p) => s + (p.points ?? 0), 0)
  const exactCount = predictions.filter(
    (p) => p.points === 11 || p.points === 22 || p.points === 32
  ).length
  const doneCount = predictions.filter((p) => p.points != null).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{session.user.name ?? "Без имени"}</h1>
        <p className="text-gray-400 text-sm">{session.user.email ?? ""}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{totalPoints}</p>
          <p className="text-sm text-gray-400 mt-1">Очков всего</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{exactCount}</p>
          <p className="text-sm text-gray-400 mt-1">Точных (100%)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold">{predictions.length}</p>
          <p className="text-sm text-gray-400 mt-1">Прогнозов сдано</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Мои прогнозы</h2>
        {predictions.map((pred) => {
          const isFinished = pred.match.status === "FINISHED"
          return (
            <div
              key={pred.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-sm">
                  {pred.match.homeTeam} — {pred.match.awayTeam}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {new Date(pred.match.kickoff).toLocaleDateString("ru-RU", {
                    day: "numeric", month: "short",
                  })}
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <span className="font-bold">
                  {pred.homeScore}:{pred.awayScore}
                </span>
                {isFinished && (
                  <Badge
                    className={pred.points && pred.points > 0
                      ? "bg-green-800 text-green-200"
                      : "bg-gray-800 text-gray-400"}
                  >
                    {pred.points != null
                      ? (pred.points > 0 ? `+${pred.points}` : pred.points)
                      : "—"}
                  </Badge>
                )}
                {!isFinished && (
                  <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">
                    ожидается
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
        {predictions.length === 0 && (
          <p className="text-gray-500 text-center py-8">У вас пока нет прогнозов</p>
        )}
      </div>
    </div>
  )
}
