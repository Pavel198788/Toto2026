// app/api/predictions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { matchId?: unknown; homeScore?: unknown; awayScore?: unknown; winner?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { matchId, homeScore, awayScore, winner } = body

  if (matchId == null || typeof matchId !== "string" || homeScore == null || awayScore == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const home = Number(homeScore)
  const away = Number(awayScore)
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 })
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }
  if (match.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Predictions closed for this match" }, { status: 422 })
  }

  try {
    const prediction = await prisma.prediction.create({
      data: {
        userId: session.user.id,
        matchId,
        homeScore: home,
        awayScore: away,
        winner: winner != null ? String(winner) : null,
      },
    })
    return NextResponse.json(prediction, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Prediction already submitted" }, { status: 409 })
    }
    throw e
  }
}
