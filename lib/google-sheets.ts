import { google } from "googleapis"
import { prisma } from "./db"

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

export async function syncToGoogleSheets() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
  if (!credentialsJson || !spreadsheetId) return

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentialsJson),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const sheets = google.sheets({ version: "v4", auth })

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

  // Sheet 1: match predictions
  const matchHeaders = ["Участник", "Email", "Стадия", "Матч", "Дата (МСК)", "Прогноз", "Счёт факт", "Очки"]
  const matchRows = predictions.map((p) => [
    p.user.name,
    p.user.email,
    STAGE_LABELS[p.match.stage] ?? p.match.stage,
    `${p.match.homeTeam} vs ${p.match.awayTeam}`,
    new Date(p.match.kickoff).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
    `${p.homeScore}:${p.awayScore}`,
    p.match.homeScore !== null && p.match.awayScore !== null
      ? `${p.match.homeScore}:${p.match.awayScore}`
      : "—",
    p.points ?? "—",
  ])

  await ensureSheetExists(sheets, spreadsheetId, "Прогнозы на матчи")
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Прогнозы на матчи!A:Z" })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Прогнозы на матчи!A1",
    valueInputOption: "RAW",
    requestBody: { values: [matchHeaders, ...matchRows] },
  })

  // Sheet 2: bonus predictions
  const bonusHeaders = ["Участник", "Email", "Тип", "Команда", "Очки"]
  const bonusRows = bonusPredictions.map((p) => [
    p.user.name,
    p.user.email,
    BONUS_LABELS[p.type] ?? p.type,
    p.team,
    p.points ?? "—",
  ])

  await ensureSheetExists(sheets, spreadsheetId, "Бонусные прогнозы")
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Бонусные прогнозы!A:Z" })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Бонусные прогнозы!A1",
    valueInputOption: "RAW",
    requestBody: { values: [bonusHeaders, ...bonusRows] },
  })
}

async function ensureSheetExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  title: string
) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const exists = meta.data.sheets?.some((s) => s.properties?.title === title)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    })
  }
}
