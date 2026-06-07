// app/api/leaderboard/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  const leaderboard = users
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

  return NextResponse.json(leaderboard)
}
