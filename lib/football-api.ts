const BASE_URL = "https://api.football-data.org/v4"
const WC_2026_ID = 2000

interface FDTeam {
  name: string
  shortName: string
}

interface FDScore {
  fullTime: { home: number | null; away: number | null }
}

export interface FDMatch {
  id: number
  homeTeam: FDTeam
  awayTeam: FDTeam
  status: string
  stage: string
  group?: string | null
  utcDate: string
  score: FDScore
}

async function fetchFD<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${path}`)
  }
  return res.json()
}

export async function getTodayMatches(): Promise<FDMatch[]> {
  const today = new Date().toISOString().split("T")[0]
  const data = await fetchFD<{ matches: FDMatch[] }>(
    `/competitions/${WC_2026_ID}/matches?dateFrom=${today}&dateTo=${today}`
  )
  return data.matches ?? []
}

export async function getAllMatches(): Promise<FDMatch[]> {
  const data = await fetchFD<{ matches: FDMatch[] }>(
    `/competitions/${WC_2026_ID}/matches`
  )
  return data.matches ?? []
}

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "GROUP",
  ROUND_OF_16: "R16",
  QUARTER_FINALS: "QUARTERFINAL",
  SEMI_FINALS: "SEMIFINAL",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
}

const STATUS_MAP: Record<string, string> = {
  SCHEDULED: "SCHEDULED",
  TIMED: "SCHEDULED",
  IN_PLAY: "IN_PLAY",
  PAUSED: "PAUSED",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
}

export function mapStage(fdStage: string): string {
  return STAGE_MAP[fdStage] ?? "GROUP"
}

export function mapStatus(fdStatus: string): string {
  return STATUS_MAP[fdStatus] ?? "SCHEDULED"
}
