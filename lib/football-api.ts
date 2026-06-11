// lib/football-api.ts — sstats.net API (без ключа, 300 req/min)
const SSTATS_BASE = "https://api.sstats.net"

export interface FDMatch {
  id: number
  homeTeam: { name: string; shortName: string }
  awayTeam: { name: string; shortName: string }
  status: string
  stage: string
  group?: string | null
  utcDate: string
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
    fullTime: { home: number | null; away: number | null }
  }
  venue?: string | null
}

interface SstatsGame {
  id: number
  date: string
  status: number
  homeResult: number | null
  awayResult: number | null
  homeFTResult: number | null
  awayFTResult: number | null
  homeTeam: { id: number; name: string }
  awayTeam: { id: number; name: string }
  roundName: string
}

async function fetchSstats(path: string): Promise<{ data?: SstatsGame[] }> {
  const res = await fetch(`${SSTATS_BASE}${path}`, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`sstats API ${res.status}: ${path}`)
  return res.json()
}

// status: 2=NotStarted 3=1stHalf 4=2ndHalf 5=HalfTime 6=ET 7=Penalties 8=Finished 9=Postponed
function sstatsStatus(code: number): string {
  if (code === 8) return "FINISHED"
  if (code === 5) return "PAUSED"
  if ([3, 4, 6, 7].includes(code)) return "IN_PLAY"
  if (code === 9) return "POSTPONED"
  return "SCHEDULED"
}

function sstatsStage(roundName: string): string {
  const r = roundName.toLowerCase()
  if (r.includes("group")) return "GROUP_STAGE"
  if (r.includes("round of 32")) return "ROUND_OF_32"
  if (r.includes("round of 16")) return "ROUND_OF_16"
  if (r.includes("quarter")) return "QUARTER_FINALS"
  if (r.includes("semi")) return "SEMI_FINALS"
  if (r.includes("3rd") || r.includes("third place")) return "THIRD_PLACE"
  if (r.includes("final")) return "FINAL"
  return "GROUP_STAGE"
}

const TBD_RE = /\b(place|winner|loser|group [a-z]\b)/i

function toFDMatch(g: SstatsGame): FDMatch | null {
  if (!g.homeTeam?.name || !g.awayTeam?.name) return null
  if (TBD_RE.test(g.homeTeam.name) || TBD_RE.test(g.awayTeam.name)) return null

  const status = sstatsStatus(g.status)
  const isStarted = status !== "SCHEDULED"

  const homeScore = isStarted
    ? (status === "FINISHED" ? g.homeFTResult : g.homeResult)
    : null
  const awayScore = isStarted
    ? (status === "FINISHED" ? g.awayFTResult : g.awayResult)
    : null

  let winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null = null
  if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) winner = "HOME_TEAM"
    else if (awayScore > homeScore) winner = "AWAY_TEAM"
    else winner = "DRAW"
  }

  return {
    id: g.id,
    homeTeam: { name: g.homeTeam.name, shortName: g.homeTeam.name },
    awayTeam: { name: g.awayTeam.name, shortName: g.awayTeam.name },
    status,
    stage: sstatsStage(g.roundName),
    group: null,
    utcDate: g.date,
    score: { winner, fullTime: { home: homeScore, away: awayScore } },
    venue: null,
  }
}

export async function getAllMatches(): Promise<FDMatch[]> {
  const data = await fetchSstats("/games/list?LeagueId=1&Year=2026")
  return (data.data ?? []).map(toFDMatch).filter((m): m is FDMatch => m !== null)
}

export async function getTodayMatches(): Promise<FDMatch[]> {
  const data = await fetchSstats("/games/list?LeagueId=1&today=true")
  return (data.data ?? []).map(toFDMatch).filter((m): m is FDMatch => m !== null)
}

// Совместимость с sync-matches.ts
const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE:    "GROUP",
  ROUND_OF_32:   "ROUND_OF_32",
  ROUND_OF_16:   "R16",
  QUARTER_FINALS: "QUARTERFINAL",
  SEMI_FINALS:   "SEMIFINAL",
  THIRD_PLACE:   "THIRD_PLACE",
  FINAL:         "FINAL",
}

const STATUS_MAP: Record<string, string> = {
  SCHEDULED: "SCHEDULED",
  IN_PLAY:   "IN_PLAY",
  PAUSED:    "PAUSED",
  FINISHED:  "FINISHED",
  POSTPONED: "POSTPONED",
}

export function mapStage(s: string): string {
  return STAGE_MAP[s] ?? "GROUP"
}

export function mapStatus(s: string): string {
  return STATUS_MAP[s] ?? "SCHEDULED"
}

const VENUE_LOOKUP: Array<{ match: string; city: string; country: string }> = [
  { match: "banorte",   city: "Гвадалахара",  country: "Мексика" },
  { match: "azteca",    city: "Мехико",       country: "Мексика" },
  { match: "ciudad de", city: "Мехико",       country: "Мексика" },
  { match: "akron",     city: "Гвадалахара",  country: "Мексика" },
  { match: "bbva",      city: "Монтеррей",    country: "Мексика" },
  { match: "bc place",  city: "Ванкувер",     country: "Канада" },
  { match: "bmo",       city: "Торонто",      country: "Канада" },
  { match: "commonwealth", city: "Эдмонтон",  country: "Канада" },
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
  const found = VENUE_LOOKUP.find((e) => lower.includes(e.match))
  return found ? { city: found.city, country: found.country } : { city: null, country: null }
}
