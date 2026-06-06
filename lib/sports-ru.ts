// lib/sports-ru.ts — скрапер расписания ЧМ-2026 с sports.ru
import { parse } from "node-html-parser"

const CALENDAR_URL = "https://www.sports.ru/football/tournament/fifa-world-cup/calendar/"

// sports.ru slug → имя команды как в football-data.org (проверено по реальным данным из БД)
const SLUG_TO_TEAM: Record<string, string> = {
  // Северная Америка
  "mexico":                  "Mexico",
  "usa":                     "United States",
  "canada":                  "Canada",
  "panama":                  "Panama",
  "honduras":                "Honduras",
  "costa-rica":              "Costa Rica",
  "el-salvador":             "El Salvador",
  "jamaica":                 "Jamaica",
  "haiti":                   "Haiti",
  "curacao":                 "Curaçao",
  // Южная Америка
  "argentina":               "Argentina",
  "brazil":                  "Brazil",
  "colombia":                "Colombia",
  "uruguay":                 "Uruguay",
  "ecuador":                 "Ecuador",
  "venezuela":               "Venezuela",
  "chile":                   "Chile",
  "paraguay":                "Paraguay",
  "bolivia":                 "Bolivia",
  "peru":                    "Peru",
  // Европа
  "spain":                   "Spain",
  "france":                  "France",
  "germany":                 "Germany",
  "england":                 "England",
  "portugal":                "Portugal",
  "netherlands":             "Netherlands",
  "belgium":                 "Belgium",
  "italy":                   "Italy",
  "croatia":                 "Croatia",
  "austria":                 "Austria",
  "switzerland":             "Switzerland",
  "denmark":                 "Denmark",
  "serbia":                  "Serbia",
  "scotland":                "Scotland",
  "turkey":                  "Turkey",
  "ukraine":                 "Ukraine",
  "poland":                  "Poland",
  "czechia":                 "Czechia",
  "czech-republic":          "Czechia",
  "slovakia":                "Slovakia",
  "hungary":                 "Hungary",
  "romania":                 "Romania",
  "norway":                  "Norway",
  "sweden":                  "Sweden",
  "bosnia-and-herzegovina":  "Bosnia-Herzegovina",
  // Африка
  "morocco":                 "Morocco",
  "senegal":                 "Senegal",
  "nigeria":                 "Nigeria",
  "egypt":                   "Egypt",
  "cameroon":                "Cameroon",
  "ghana":                   "Ghana",
  "ivory-coast":             "Ivory Coast",
  "south-africa":            "South Africa",
  "algeria":                 "Algeria",
  "tunisia":                 "Tunisia",
  "drc":                     "Congo DR",
  "cabo-verde":              "Cape Verde Islands",
  // Азия
  "japan":                   "Japan",
  "south-korea":             "South Korea",
  "australia":               "Australia",
  "saudi-arabia":            "Saudi Arabia",
  "iran":                    "Iran",
  "iraq":                    "Iraq",
  "qatar":                   "Qatar",
  "uzbekistan":              "Uzbekistan",
  "jordan":                  "Jordan",
  "indonesia":               "Indonesia",
  // ОФК
  "new-zealand":             "New Zealand",
}

// Города sports.ru (часть строки в нижнем регистре) → { city, country } по-русски
const CITY_LOOKUP: Array<{ match: string; city: string; country: string }> = [
  // Мексика
  { match: "мехико",      city: "Мехико",       country: "Мексика" },
  { match: "гвадалахара", city: "Гвадалахара",  country: "Мексика" },
  { match: "монтеррей",   city: "Монтеррей",    country: "Мексика" },
  // Канада
  { match: "ванкувер",    city: "Ванкувер",     country: "Канада"  },
  { match: "торонто",     city: "Торонто",      country: "Канада"  },
  // США
  { match: "даллас",      city: "Даллас",       country: "США" },
  { match: "арлингтон",   city: "Даллас",       country: "США" },
  { match: "лас-вегас",   city: "Лас-Вегас",   country: "США" },
  { match: "вегас",       city: "Лас-Вегас",   country: "США" },
  { match: "санта-клара", city: "Сан-Хосе",    country: "США" },
  { match: "сан-хосе",    city: "Сан-Хосе",    country: "США" },
  { match: "нью-йорк",    city: "Нью-Йорк",    country: "США" },
  { match: "ист-ратерфор",city: "Нью-Йорк",    country: "США" },
  { match: "лос-анджелес",city: "Лос-Анджелес",country: "США" },
  { match: "инглвуд",     city: "Лос-Анджелес",country: "США" },
  { match: "пасадена",    city: "Лос-Анджелес",country: "США" },
  { match: "фоксборо",    city: "Бостон",       country: "США" },
  { match: "бостон",      city: "Бостон",       country: "США" },
  { match: "майами",      city: "Майами",       country: "США" },
  { match: "майами-гарден",city: "Майами",      country: "США" },
  { match: "филадельфия", city: "Филадельфия",  country: "США" },
  { match: "денвер",      city: "Денвер",       country: "США" },
  { match: "сиэтл",       city: "Сиэтл",        country: "США" },
  { match: "хьюстон",     city: "Хьюстон",      country: "США" },
  { match: "канзас",      city: "Канзас-Сити",  country: "США" },
]

function resolveCity(raw: string): { city: string; country: string } | null {
  const lower = raw.toLowerCase()
  const found = CITY_LOOKUP.find((e) => lower.includes(e.match))
  return found ? { city: found.city, country: found.country } : null
}

export interface SportsRuVenue {
  homeTeam: string   // как в football-data.org
  awayTeam: string   // как в football-data.org
  city: string
  country: string
}

export async function fetchSportsRuVenues(): Promise<Map<string, { city: string; country: string }>> {
  const result = new Map<string, { city: string; country: string }>()

  let html: string
  try {
    const res = await fetch(CALENDAR_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TotoBot/1.0)" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return result
    html = await res.text()
  } catch {
    return result
  }

  const root = parse(html)

  for (const row of root.querySelectorAll("tr")) {
    const tds = row.querySelectorAll("td")
    if (tds.length < 5) continue

    // Получаем slug команд из href ссылок на команды
    const homeLink = tds[1].querySelector("a")?.getAttribute("href") ?? ""
    const awayLink = tds[3].querySelector("a")?.getAttribute("href") ?? ""

    const homeSlug = homeLink.match(/\/football\/team\/([^/]+)\//)?.[1] ?? ""
    const awaySlug = awayLink.match(/\/football\/team\/([^/]+)\//)?.[1] ?? ""

    const homeTeam = SLUG_TO_TEAM[homeSlug]
    const awayTeam = SLUG_TO_TEAM[awaySlug]
    if (!homeTeam || !awayTeam) continue

    // Город — 5-я ячейка
    const cityRaw = tds[4].text.trim()
    const location = resolveCity(cityRaw)
    if (!location) continue

    // Ключ: "HomeTeam|AwayTeam"
    result.set(`${homeTeam}|${awayTeam}`, location)
  }

  return result
}
