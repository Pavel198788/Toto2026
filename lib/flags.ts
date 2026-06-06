// lib/flags.ts

function iso(code: string): string {
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("")
}

const FLAGS: Record<string, string> = {
  // Южная Америка
  "Argentina": iso("AR"), "Brazil": iso("BR"), "Uruguay": iso("UY"),
  "Colombia": iso("CO"), "Ecuador": iso("EC"), "Chile": iso("CL"),
  "Paraguay": iso("PY"), "Bolivia": iso("BO"), "Peru": iso("PE"),
  "Venezuela": iso("VE"),
  // Северная и Центральная Америка
  "United States": iso("US"), "Mexico": iso("MX"), "Canada": iso("CA"),
  "Costa Rica": iso("CR"), "Panama": iso("PA"), "Honduras": iso("HN"),
  "Jamaica": iso("JM"), "El Salvador": iso("SV"), "Guatemala": iso("GT"),
  "Cuba": iso("CU"), "Haiti": iso("HT"), "Trinidad and Tobago": iso("TT"),
  // Европа
  "France": iso("FR"), "Germany": iso("DE"), "Spain": iso("ES"),
  "Portugal": iso("PT"), "Netherlands": iso("NL"), "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Italy": iso("IT"), "Belgium": iso("BE"), "Croatia": iso("HR"),
  "Denmark": iso("DK"), "Poland": iso("PL"), "Serbia": iso("RS"),
  "Switzerland": iso("CH"), "Austria": iso("AT"), "Turkey": iso("TR"),
  "Ukraine": iso("UA"), "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Czech Republic": iso("CZ"), "Czechia": iso("CZ"), "Slovakia": iso("SK"), "Hungary": iso("HU"),
  "Romania": iso("RO"), "Slovenia": iso("SI"), "Greece": iso("GR"),
  "Albania": iso("AL"), "Norway": iso("NO"), "Sweden": iso("SE"),
  "Finland": iso("FI"), "Iceland": iso("IS"), "Ireland": iso("IE"),
  "North Macedonia": iso("MK"), "Bosnia and Herzegovina": iso("BA"), "Bosnia-Herzegovina": iso("BA"),
  // Африка
  "Morocco": iso("MA"), "Senegal": iso("SN"), "Nigeria": iso("NG"),
  "Egypt": iso("EG"), "Ghana": iso("GH"), "Cameroon": iso("CM"),
  "Ivory Coast": iso("CI"), "Algeria": iso("DZ"), "Tunisia": iso("TN"),
  "South Africa": iso("ZA"), "Mali": iso("ML"), "Congo DR": iso("CD"),
  "Burkina Faso": iso("BF"), "Guinea": iso("GN"),
  // Азия и Океания
  "Japan": iso("JP"), "South Korea": iso("KR"), "Australia": iso("AU"),
  "Saudi Arabia": iso("SA"), "Iran": iso("IR"), "Qatar": iso("QA"),
  "China": iso("CN"), "Indonesia": iso("ID"), "Uzbekistan": iso("UZ"),
  "Iraq": iso("IQ"), "Jordan": iso("JO"), "New Zealand": iso("NZ"),
  // Другие
  "Curaçao": iso("CW"), "Cape Verde Islands": iso("CV"), "Cape Verde": iso("CV"),
}

export function teamFlag(teamName: string): string {
  return FLAGS[teamName] ?? ""
}
