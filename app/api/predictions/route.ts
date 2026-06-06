// app/api/predictions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { matchId, homeScore, awayScore, winner } = await req.json()

  if (matchId == null || homeScore == null || awayScore == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
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
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        winner: winner ?? null,
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
