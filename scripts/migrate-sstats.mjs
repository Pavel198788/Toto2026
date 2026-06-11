// Мигрирует externalId в G1 БД с FD-IDs на sstats IDs.
// Сопоставление: canonTeam(homeTeam) + canonTeam(awayTeam) + UTC-дата (YYYY-MM-DD)
import pg from "pg"
const { Client } = pg

const DB_URL = "postgresql://neondb_owner:npg_VbaFPOI3iT4G@ep-red-scene-aqh8s2tq-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"

function canonTeam(name) {
  const n = name.trim().toLowerCase()
  if (/korea republic|south korea/.test(n)) return "south-korea"
  if (/korea\s*dpr|north korea/.test(n)) return "north-korea"
  if (/\busa\b|united states/.test(n)) return "usa"
  if (/ivory coast|c[oô]te d.?ivoire/.test(n)) return "ivory-coast"
  if (/\bdr\s+congo\b|congo\s+dr\b/.test(n)) return "dr-congo"
  if (/trinidad/.test(n)) return "trinidad"
  if (/czechia|czech republic/.test(n)) return "czech-republic"
  if (/bosnia/.test(n)) return "bosnia-herzegovina"
  if (/t[üu]rkiye|turkey/.test(n)) return "turkey"
  return n.replace(/\s+/g, "-")
}

const res = await fetch("https://api.sstats.net/games/list?LeagueId=1&Year=2026")
const json = await res.json()
const sstatsGames = json.data ?? []
console.log(`sstats: получено ${sstatsGames.length} матчей`)

const client = new Client({ connectionString: DB_URL })
await client.connect()

const { rows: dbMatches } = await client.query(
  `SELECT id, "homeTeam", "awayTeam", kickoff, "externalId" FROM "Match"`
)
console.log(`БД: ${dbMatches.length} матчей`)

// Индекс: canonHome|canonAway|YYYY-MM-DD → { id, externalId }
const byTeamDate = new Map()
for (const m of dbMatches) {
  // kickoff — наивный TIMESTAMP (без TZ), pg читает как локальное время (Moscow UTC+3).
  // Используем локальные методы чтобы получить ту же дату, что хранится в БД.
  const d = new Date(m.kickoff)
  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const key = `${canonTeam(m.homeTeam)}|${canonTeam(m.awayTeam)}|${dateStr}`
  byTeamDate.set(key, { id: m.id, externalId: m.externalId })
}

let updated = 0, skipped = 0, notFound = 0

for (const g of sstatsGames) {
  const dateStr = g.date.slice(0, 10)  // "2026-06-11T19:00:00+00:00" → "2026-06-11"
  const key = `${canonTeam(g.homeTeam.name)}|${canonTeam(g.awayTeam.name)}|${dateStr}`
  const dbRow = byTeamDate.get(key)

  if (!dbRow) {
    console.log(`  НЕ НАЙДЕН: ${g.homeTeam.name} vs ${g.awayTeam.name} ${dateStr} (sstats id=${g.id})`)
    notFound++
    continue
  }

  if (dbRow.externalId === g.id) {
    skipped++
    continue
  }

  await client.query(`UPDATE "Match" SET "externalId" = $1 WHERE id = $2`, [g.id, dbRow.id])
  console.log(`  ОБНОВЛЁН: ${g.homeTeam.name} vs ${g.awayTeam.name} ${dateStr}  ${dbRow.externalId} → ${g.id}`)
  updated++
}

await client.end()
console.log(`\nИтого: обновлено=${updated}, пропущено(уже актуально)=${skipped}, не найдено=${notFound}`)
