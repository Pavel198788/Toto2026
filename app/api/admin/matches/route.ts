import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const matches = await prisma.match.findMany({
    select: {
      id: true,
      externalId: true,
      homeTeam: true,
      awayTeam: true,
      stage: true,
      group: true,
      kickoff: true,
      city: true,
      country: true,
    },
    orderBy: { kickoff: "asc" },
  })

  return NextResponse.json(matches)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id, city, country } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const match = await prisma.match.update({
    where: { id },
    data: {
      city: city?.trim() || null,
      country: country?.trim() || null,
    },
  })

  return NextResponse.json({ success: true, match })
}
