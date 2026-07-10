import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Returns user's existing bonus predictions + all WC teams + lock status
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [predictions, firstMatch, teams] = await Promise.all([
    prisma.bonusPrediction.findMany({
      where: { userId: session.user.id },
      select: { type: true, team: true, points: true },
    }),
    prisma.match.findFirst({ orderBy: { kickoff: "asc" }, select: { kickoff: true } }),
    prisma.match.findMany({
      select: { homeTeam: true, awayTeam: true },
      distinct: ["homeTeam"],
    }),
  ])

  const allTeams = Array.from(
    new Set([
      ...teams.map((m) => m.homeTeam),
      ...(
        await prisma.match.findMany({ select: { awayTeam: true }, distinct: ["awayTeam"] })
      ).map((m) => m.awayTeam),
    ])
  ).sort()

  // Выбывшие команды: проиграли матч на вылет или не вышли из группы.
  // Нужны, чтобы в таблице прогнозов зачёркивать пики, которые уже не дадут очков.
  const PLAYOFF_STAGES = ["ROUND_OF_32", "R16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"]
  const playoffMatches = await prisma.match.findMany({
    where: { stage: { in: PLAYOFF_STAGES as never } },
    select: { homeTeam: true, awayTeam: true, winner: true, status: true },
  })
  const playoffTeams = new Set<string>()
  const losers = new Set<string>()
  for (const m of playoffMatches) {
    playoffTeams.add(m.homeTeam)
    playoffTeams.add(m.awayTeam)
    if (m.status === "FINISHED" && m.winner) {
      losers.add(m.winner === m.homeTeam ? m.awayTeam : m.homeTeam)
    }
  }
  const knockoutStarted = playoffMatches.length > 0
  const eliminatedTeams = allTeams.filter(
    (t) => losers.has(t) || (knockoutStarted && !playoffTeams.has(t))
  )

  const globallyLocked = firstMatch ? new Date() >= new Date(firstMatch.kickoff) : false
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { bonusUnlockedUntil: true },
  })
  const personallyUnlocked = user?.bonusUnlockedUntil
    ? new Date() < new Date(user.bonusUnlockedUntil)
    : false
  const locked = globallyLocked && !personallyUnlocked

  return NextResponse.json({ predictions, teams: allTeams, eliminatedTeams, locked, currentUserId: session.user.id })
}

// Saves bonus predictions (only before the first match kicks off)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [firstMatch, currentUser] = await Promise.all([
    prisma.match.findFirst({ orderBy: { kickoff: "asc" }, select: { kickoff: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { bonusUnlockedUntil: true } }),
  ])
  const globallyLocked = firstMatch ? new Date() >= new Date(firstMatch.kickoff) : false
  const personallyUnlocked = currentUser?.bonusUnlockedUntil
    ? new Date() < new Date(currentUser.bonusUnlockedUntil)
    : false
  if (globallyLocked && !personallyUnlocked) {
    return NextResponse.json({ error: "Приём прогнозов закрыт" }, { status: 403 })
  }

  const body = await req.json()
  const { semifinalists, finalists, champion } = body as {
    semifinalists: string[]
    finalists: string[]
    champion: string
  }

  if (
    !Array.isArray(semifinalists) || semifinalists.length !== 4 ||
    !Array.isArray(finalists) || finalists.length !== 2 ||
    typeof champion !== "string" || !champion
  ) {
    return NextResponse.json({ error: "Неверный формат" }, { status: 400 })
  }

  // Validate cascading: finalists ⊆ semifinalists, champion ∈ finalists
  if (!finalists.every((t) => semifinalists.includes(t))) {
    return NextResponse.json({ error: "Финалисты должны быть из полуфиналистов" }, { status: 400 })
  }
  if (!finalists.includes(champion)) {
    return NextResponse.json({ error: "Чемпион должен быть из финалистов" }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.bonusPrediction.deleteMany({ where: { userId: session.user!.id } })
    await tx.bonusPrediction.createMany({
      data: [
        ...semifinalists.map((team) => ({ userId: session.user!.id, type: "SEMIFINAL" as const, team })),
        ...finalists.map((team) => ({ userId: session.user!.id, type: "FINALIST" as const, team })),
        { userId: session.user!.id, type: "CHAMPION" as const, team: champion },
      ],
    })
  })

  return NextResponse.json({ success: true })
}
