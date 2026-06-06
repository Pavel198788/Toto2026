const BASE_URL = "https://api.football-data.org/v4"
const WC_2026_ID = 2000

interface FDTeam {
  name: string
  shortName: string
}

interface FDScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
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
  venue?: string | null
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

// Lookup table: partial venue name (lowercase) → city + country in Russian
const VENUE_LOOKUP: Array<{ match: string; city: string; country: string }> = [
  // Mexico
  { match: "azteca",    city: "Мехико",       country: "Мексика" },
  { match: "ciudad de", city: "Мехико",       country: "Мексика" },
  { match: "akron",     city: "Гвадалахара",  country: "Мексика" },
  // Canada
  { match: "bc place",  city: "Ванкувер",     country: "Канада" },
  { match: "bmo",       city: "Торонто",      country: "Канада" },
  // USA
  { match: "at&t",      city: "Даллас",       country: "США" },
  { match: "allegiant", city: "Лас-Вегас",    country: "США" },
  { match: "levi",      city: "Сан-Хосе",     country: "США" },
  { match: "metlife",   city: "Нью-Йорк",     country: "США" },
  { match: "rose bowl", city: "Лос-Анджелес", country: "США" },
  { match: "sofi",      city: "Лос-Анджелес", country: "США" },
  { match: "gillette",  city: "Бостон",       country: "США" },
  { match: "hard rock", city: "Майами",       country: "США" },
  { match: "lincoln",   city: "Филадельфия",  country: "США" },
  { match: "mile high", city: "Денвер",       country: "США" },
  { match: "lumen",     city: "Сиэтл",        country: "США" },
  { match: "nrg",       city: "Хьюстон",      country: "США" },
  { match: "arrowhead", city: "Канзас-Сити",  country: "США" },
  { match: "kansas",    city: "Канзас-Сити",  country: "США" },
]

export function resolveVenueLocation(venue: string | null | undefined): { city: string | null; country: string | null } {
  if (!venue) return { city: null, country: null }
  const lower = venue.toLowerCase()
  const found = VENUE_LOOKUP.find((entry) => lower.includes(entry.match))
  if (!found) return { city: null, country: null }
  return { city: found.city, country: found.country }
}
