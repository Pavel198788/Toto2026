import type { CumulativeEntry } from "@/lib/analytics-stats"

interface Props {
  series: CumulativeEntry[]
  matchCount: number
}

function cellStyle(pts: number): string {
  if (pts === 0) return "bg-[#1a1500] text-[#3a3000]"
  if (pts <= 9) return "bg-amber-900/80 text-amber-300"
  if (pts <= 15) return "bg-yellow-600 text-yellow-100"
  return "bg-yellow-400 text-black"
}

export function AnalyticsHeatmap({ series, matchCount }: Props) {
  const rows = [...series]
    .map(s => {
      const perMatch = s.points.map((cum, i) => cum - (s.points[i - 1] ?? 0))
      return { ...s, perMatch, total: s.points[matchCount - 1] ?? 0 }
    })
    .sort((a, b) => b.total - a.total)

  if (rows.length === 0 || matchCount === 0) return null

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <table className="border-collapse" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th className="w-20 pb-1 pr-2" />
            {Array.from({ length: matchCount }, (_, i) => (
              <th key={i} className="w-6 pb-1 text-[8px] text-gray-600 font-normal text-center">
                {i + 1}
              </th>
            ))}
            <th className="w-8 pb-1 pl-2 text-[9px] text-gray-500 font-bold text-right">Σ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.userId}>
              <td className="pr-2 py-0.5 text-[10px] text-gray-300 font-semibold text-left sticky left-0 bg-[#111]"
                  style={{ maxWidth: "5rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {row.name.split(" ")[0]}
              </td>
              {row.perMatch.map((pts, i) => (
                <td key={i} className="py-0.5 px-px text-center">
                  <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-bold mx-auto ${cellStyle(pts)}`}>
                    {pts > 0 ? pts : ""}
                  </div>
                </td>
              ))}
              <td className="pl-2 text-xs font-black text-yellow-400 text-right">
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
