import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import * as XLSX from "xlsx"

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Групповой этап",
  R16: "1/8 финала",
  QUARTERFINAL: "1/4 финала",
  SEMIFINAL: "1/2 финала",
  THIRD_PLACE: "Матч за 3-е место",
  FINAL: "Финал",
}

const BONUS_LABELS: Record<string, string> = {
  SEMIFINAL: "Полуфиналист",
  FINALIST: "Финалист",
  CHAMPION: "Чемпион",
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [predictions, bonusPredictions] = await Promise.all([
    prisma.prediction.findMany({
      include: {
        user: { select: { name: true, email: true } },
        match: true,
      },
      orderBy: [{ match: { kickoff: "asc" } }, { user: { name: "asc" } }],
    }),
    prisma.bonusPrediction.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ type: "asc" }, { user: { name: "asc" } }],
    }),
  ])

  const wb = XLSX.utils.book_new()

  // Sheet 1: Match predictions
  const matchRows = predictions.map((p) => ({
    Участник: p.user.name,
    Email: p.user.email,
    Стадия: STAGE_LABELS[p.match.stage] ?? p.match.stage,
    Матч: `${p.match.homeTeam} vs ${p.match.awayTeam}`,
    Дата: new Date(p.match.kickoff).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
    Прогноз: `${p.homeScore}:${p.awayScore}`,
    "Счёт факт": p.match.homeScore !== null && p.match.awayScore !== null
      ? `${p.match.homeScore}:${p.match.awayScore}`
      : "—",
    Очки: p.points ?? "—",
  }))

  const ws1 = XLSX.utils.json_to_sheet(matchRows)
  ws1["!cols"] = [
    { wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 30 },
    { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 8 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, "Прогнозы на матчи")

  // Sheet 2: Bonus predictions raw
  const bonusRows = bonusPredictions.map((p) => ({
    Участник: p.user.name,
    Email: p.user.email,
    Тип: BONUS_LABELS[p.type] ?? p.type,
    Команда: p.team,
    Очки: p.points ?? "—",
  }))

  const ws2 = XLSX.utils.json_to_sheet(bonusRows)
  ws2["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, ws2, "Бонусные прогнозы")

  // Sheet 3: Bonus summary — one row per participant
  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    include: { bonusPredictions: true },
    orderBy: { name: "asc" },
  })

  const summaryRows = users.map((u) => {
    const semis = u.bonusPredictions.filter((b) => b.type === "SEMIFINAL").map((b) => b.team)
    const finalists = u.bonusPredictions.filter((b) => b.type === "FINALIST").map((b) => b.team)
    const champion = u.bonusPredictions.find((b) => b.type === "CHAMPION")
    const bonusPts = u.bonusPredictions.reduce((s, b) => s + (b.points ?? 0), 0)
    return {
      Участник: u.name,
      Email: u.email,
      "Полуфиналист 1": semis[0] ?? "—",
      "Полуфиналист 2": semis[1] ?? "—",
      "Полуфиналист 3": semis[2] ?? "—",
      "Полуфиналист 4": semis[3] ?? "—",
      "Финалист 1": finalists[0] ?? "—",
      "Финалист 2": finalists[1] ?? "—",
      Чемпион: champion?.team ?? "—",
      "Бонусных очков": bonusPts || "—",
    }
  })

  const ws3 = XLSX.utils.json_to_sheet(summaryRows)
  ws3["!cols"] = [
    { wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(wb, ws3, "Бонусы по участникам")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="toto-2026-backup-${date}.xlsx"`,
    },
  })
}
