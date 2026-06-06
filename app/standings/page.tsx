import { prisma } from "@/lib/db"

const TEAM_RU: Record<string, string> = {
  "Mexico": "Мексика",
  "South Africa": "ЮАР",
  "South Korea": "Южная Корея",
  "Czechia": "Чехия",
  "Canada": "Канада",
  "Bosnia-Herzegovina": "Босния и Герцеговина",
  "Qatar": "Катар",
  "Switzerland": "Швейцария",
  "Brazil": "Бразилия",
  "Morocco": "Марокко",
  "Haiti": "Гаити",
  "Scotland": "Шотландия",
  "United States": "США",
  "Paraguay": "Парагвай",
  "Australia": "Австралия",
  "Turkey": "Турция",
  "Germany": "Германия",
  "Curaçao": "Кюрасао",
  "Ivory Coast": "Кот-д'Ивуар",
  "Ecuador": "Эквадор",
  "Netherlands": "Нидерланды",
  "Japan": "Япония",
  "Sweden": "Швеция",
  "Tunisia": "Тунис",
  "Belgium": "Бельгия",
  "Egypt": "Египет",
  "Iran": "Иран",
  "New Zealand": "Новая Зеландия",
  "Spain": "Испания",
  "Cape Verde Islands": "Кабо-Верде",
  "Saudi Arabia": "Саудовская Аравия",
  "Uruguay": "Уругвай",
  "France": "Франция",
  "Senegal": "Сенегал",
  "Iraq": "Ирак",
  "Norway": "Норвегия",
  "Argentina": "Аргентина",
  "Algeria": "Алжир",
  "Austria": "Австрия",
  "Jordan": "Иордания",
  "Portugal": "Португалия",
  "Congo DR": "ДР Конго",
  "Uzbekistan": "Узбекистан",
  "Colombia": "Колумбия",
  "England": "Англия",
  "Croatia": "Хорватия",
  "Ghana": "Гана",
  "Panama": "Панама",
}

const TEAM_FLAG: Record<string, string> = {
  "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Czechia": "🇨🇿",
  "Canada": "🇨🇦", "Bosnia-Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭",
  "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "United States": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turkey": "🇹🇷",
  "Germany": "🇩🇪", "Curaçao": "🇨🇼", "Ivory Coast": "🇨🇮", "Ecuador": "🇪🇨",
  "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
  "Spain": "🇪🇸", "Cape Verde Islands": "🇨🇻", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
  "France": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Norway": "🇳🇴",
  "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
  "Portugal": "🇵🇹", "Congo DR": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
}

interface TeamStats {
  name: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
}

export default async function StandingsPage() {
  const matches = await prisma.match.findMany({
    where: { stage: "GROUP" },
    orderBy: { kickoff: "asc" },
  })

  // Build group → team stats map
  const groupsMap: Record<string, Record<string, TeamStats>> = {}

  for (const match of matches) {
    const group = match.group?.replace(/^GROUP_/, "") ?? "?"

    if (!groupsMap[group]) groupsMap[group] = {}

    const ensureTeam = (name: string) => {
      if (!groupsMap[group][name]) {
        groupsMap[group][name] = { name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
      }
    }

    ensureTeam(match.homeTeam)
    ensureTeam(match.awayTeam)

    if (match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null) {
      const h = match.homeScore
      const a = match.awayScore
      const home = groupsMap[group][match.homeTeam]
      const away = groupsMap[group][match.awayTeam]

      home.played++; away.played++
      home.gf += h; home.ga += a; home.gd += h - a
      away.gf += a; away.ga += h; away.gd += a - h

      if (h > a) {
        home.won++; home.pts += 3; away.lost++
      } else if (h < a) {
        away.won++; away.pts += 3; home.lost++
      } else {
        home.drawn++; home.pts++; away.drawn++; away.pts++
      }
    }
  }

  // Sort groups alphabetically, sort teams within each group
  const groups = Object.entries(groupsMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, teamsMap]) => ({
      letter,
      teams: Object.values(teamsMap).sort(
        (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)
      ),
    }))

  const started = matches.some((m) => m.status === "FINISHED")

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Групповой этап</h1>

      {!started && (
        <p className="text-sm text-gray-500">
          Турнир ещё не начался — таблица обновится после первых матчей (11 июня).
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map(({ letter, teams }) => (
          <div key={letter} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-800/60 border-b border-gray-700">
              <span className="font-semibold text-sm text-gray-200">Группа {letter}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="py-2 px-3 w-6 text-left font-normal">#</th>
                  <th className="py-2 px-2 text-left font-normal">Команда</th>
                  <th className="py-2 px-3 text-center font-normal w-8">М</th>
                  <th className="py-2 px-3 text-center font-normal w-8">В</th>
                  <th className="py-2 px-3 text-center font-normal w-8">Н</th>
                  <th className="py-2 px-3 text-center font-normal w-8">П</th>
                  <th className="py-2 px-3 text-center font-normal w-12">Г</th>
                  <th className="py-2 px-3 text-center font-bold text-gray-300 w-8">О</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, idx) => {
                  const advances = idx < 2
                  return (
                    <tr
                      key={team.name}
                      className={[
                        "border-b border-gray-800/40 last:border-0",
                        advances ? "bg-green-900/10" : "",
                      ].join(" ")}
                    >
                      <td className="py-2.5 px-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{TEAM_FLAG[team.name] ?? "🏳"}</span>
                          <span className={advances ? "text-gray-100" : "text-gray-300"}>
                            {TEAM_RU[team.name] ?? team.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-400">{team.played}</td>
                      <td className="py-2.5 px-3 text-center text-gray-400">{team.won}</td>
                      <td className="py-2.5 px-3 text-center text-gray-400">{team.drawn}</td>
                      <td className="py-2.5 px-3 text-center text-gray-400">{team.lost}</td>
                      <td className="py-2.5 px-3 text-center text-gray-400 text-xs">
                        {team.gf}:{team.ga}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{team.pts}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
