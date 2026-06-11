// lib/football-api.ts — ESPN unofficial API (без ключа, реальные счёты)
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"
// ЧМ-2026: 11 июня — 19 июля 2026
const WC_START = "20260611"
const WC_END   = "20260719"

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

interface ESPNEvent {
  id: string
  date: string
  season: { slug: string }
  competitions: [ESPNComp]
}
interface ESPNComp {
  status: { type: { name: string; state: string; completed: boolean } }
  competitors: ESPNCompetitor[]
  venue?: { fullName?: string; address?: { city?: string; country?: string } }
}
interface ESPNCompetitor {
  homeAway: "home" | "away"
  score: string
  winner?: boolean
  team: { displayName: string; shortDisplayName: string }
}

async function fetchESPN(path: string): Promise<{ events?: ESPNEvent[] }> {
  const res = await fetch(`${ESPN_BASE}${path}`, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`ESPN API ${res.status}: ${path}`)
  return res.json()
}

function parseScore(s: string): number | null {
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

// Матчи с TBD командами (плей-офф до определения участников)
const TBD_RE = /\b(place|winner|loser|group [a-z]\b)/i

function toFDMatch(event: ESPNEvent): FDMatch | null {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === "home")
  const away = comp.competitors.find(c => c.homeAway === "away")
  if (!home || !away) return null

  // Пропускаем матчи с TBD командами
  if (TBD_RE.test(home.team.displayName) || TBD_RE.test(away.team.displayName)) return null

  const state = comp.status.type.state // "pre" | "in" | "post"
  const isLiveOrDone = state === "in" || state === "post"

  const homeScore = isLiveOrDone ? parseScore(home.score) : null
  const awayScore = isLiveOrDone ? parseScore(away.score) : null

  let winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null = null
  if (comp.status.type.completed && homeScore !== null && awayScore !== null) {
    if (home.winner) winner = "HOME_TEAM"
    else if (away.winner) winner = "AWAY_TEAM"
    else winner = "DRAW"
  }

  return {
    id: parseInt(event.id, 10),
    homeTeam: { name: home.team.displayName, shortName: home.team.shortDisplayName },
    awayTeam: { name: away.team.displayName, shortName: away.team.shortDisplayName },
    status: espnStatus(comp.status.type.name),
    stage: espnStage(event.season.slug),
    group: null, // ESPN не предоставляет букву группы; группа сохраняется из БД
    utcDate: event.date,
    score: { winner, fullTime: { home: homeScore, away: awayScore } },
    venue: comp.venue?.fullName ?? null,
  }
}

function espnStatus(name: string): string {
  if (["STATUS_FULL_TIME", "STATUS_FINAL", "STATUS_FULL_PEN", "STATUS_FULL_ET"].includes(name)) return "FINISHED"
  if (["STATUS_IN_PROGRESS", "STATUS_EXTRA_TIME", "STATUS_PENALTY", "STATUS_FIRST_HALF", "STATUS_SECOND_HALF"].includes(name)) return "IN_PLAY"
  if (name === "STATUS_HALFTIME") return "PAUSED"
  if (["STATUS_POSTPONED", "STATUS_CANCELED", "STATUS_ABANDONED", "STATUS_SUSPENDED"].includes(name)) return "POSTPONED"
  return "SCHEDULED"
}

function espnStage(slug: string): string {
  switch (slug) {
    case "group-stage":   return "GROUP_STAGE"
    case "round-of-32":  return "ROUND_OF_32"
    case "round-of-16":  return "ROUND_OF_16"
    case "quarterfinals": return "QUARTER_FINALS"
    case "semifinals":   return "SEMI_FINALS"
    case "3rd-place-match": return "THIRD_PLACE"
    case "final":        return "FINAL"
    default:             return "GROUP_STAGE"
  }
}

export async function getAllMatches(): Promise<FDMatch[]> {
  const data = await fetchESPN(`/scoreboard?dates=${WC_START}-${WC_END}&limit=200`)
  return (data.events ?? []).map(toFDMatch).filter((m): m is FDMatch => m !== null)
}

export async function getTodayMatches(): Promise<FDMatch[]> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const data = await fetchESPN(`/scoreboard?dates=${today}`)
  return (data.events ?? []).map(toFDMatch).filter((m): m is FDMatch => m !== null)
}

// Оставляем для совместимости с sync-matches.ts
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
  CANCELLED: "POSTPONED",
  SUSPENDED: "POSTPONED",
  AWARDED:   "FINISHED",
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
