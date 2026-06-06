import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const firstMatch = await prisma.match.findFirst({
    orderBy: { kickoff: "asc" },
    select: { kickoff: true },
  })
  const locked = firstMatch ? new Date() >= new Date(firstMatch.kickoff) : false

  if (!locked) {
    return NextResponse.json(
      { error: "Данные скрыты до начала ЧМ" },
      { status: 403 }
    )
  }

  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      bonusPredictions: {
        select: { type: true, team: true, points: true },
      },
    },
  })

  return NextResponse.json({
    locked: true,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      predictions: u.bonusPredictions,
    })),
  })
}
