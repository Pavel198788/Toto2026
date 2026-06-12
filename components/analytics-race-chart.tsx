"use client"

import { useState } from "react"
import type { CumulativeEntry } from "@/lib/analytics-stats"

interface Props {
  series: CumulativeEntry[]
  matchCount: number
  tourBoundaries: number[]
  leaderUserId: string
}

const STEP = 14
const LEFT_PAD = 8
const RIGHT_PAD = 88
const TOP_PAD = 10
const BOTTOM_PAD = 24
const CHART_HEIGHT = 160

const PALETTE = [
  "#facc15",
  "#4ade80",
  "#60a5fa",
  "#f97316",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fb923c",
  "#818cf8",
  "#2dd4bf",
  "#e879f9",
  "#a3e635",
  "#f87171",
  "#94a3b8",
]

export function AnalyticsRaceChart({ series, matchCount, tourBoundaries, leaderUserId }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (matchCount === 0 || series.length === 0) return null

  const svgW = LEFT_PAD + matchCount * STEP + RIGHT_PAD
  const svgH = TOP_PAD + CHART_HEIGHT + BOTTOM_PAD
  const plotH = CHART_HEIGHT

  const maxPoints = Math.max(...series.map(s => s.points[matchCount - 1] ?? 0), 1)

  function xOf(i: number) {
    return LEFT_PAD + i * STEP
  }
  function yOf(pts: number) {
    return TOP_PAD + plotH - (pts / maxPoints) * plotH
  }

  const sorted = [...series].sort((a, b) => {
    if (a.userId === leaderUserId) return -1
    if (b.userId === leaderUserId) return 1
    return (b.points[matchCount - 1] ?? 0) - (a.points[matchCount - 1] ?? 0)
  })

  function polylinePoints(pts: number[]) {
    return pts.map((p, i) => `${xOf(i)},${yOf(p)}`).join(" ")
  }

  function colorOf(userId: string, rankIdx: number) {
    return userId === leaderUserId ? PALETTE[0] : PALETTE[Math.min(rankIdx, PALETTE.length - 1)]
  }

  const TOP5_IDS = new Set(sorted.slice(0, 5).map(s => s.userId))

  const tooltipEntries =
    hoverIndex !== null
      ? sorted
          .slice(0, 5)
          .map(s => ({ name: s.name, pts: s.points[hoverIndex] ?? 0 }))
          .sort((a, b) => b.pts - a.pts)
      : []

  return (
    <div className="relative">
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <svg
          width={svgW}
          height={svgH}
          style={{ display: "block" }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="leader-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </linearGradient>
          </defs>

          {tourBoundaries.map(bi => (
            <line
              key={bi}
              x1={xOf(bi)}
              y1={TOP_PAD}
              x2={xOf(bi)}
              y2={TOP_PAD + plotH}
              stroke="#2a2000"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ))}

          {tourBoundaries.map((bi, i) => {
            const label = `ТУР ${i + 2}`
            return (
              <text
                key={label}
                x={xOf(bi) + 3}
                y={TOP_PAD + plotH + 14}
                fill="#5a4500"
                fontSize={8}
                fontFamily="monospace"
              >
                {label}
              </text>
            )
          })}
          <text
            x={LEFT_PAD}
            y={TOP_PAD + plotH + 14}
            fill="#5a4500"
            fontSize={8}
            fontFamily="monospace"
          >
            ТУР 1
          </text>

          {sorted.map((s, rankIdx) =>
            !TOP5_IDS.has(s.userId) ? (
              <polyline
                key={s.userId}
                points={polylinePoints(s.points)}
                fill="none"
                stroke="#374151"
                strokeWidth={0.8}
                opacity={0.4}
              />
            ) : null
          )}

          {(() => {
            const leader = sorted.find(s => s.userId === leaderUserId)
            if (!leader) return null
            const pts = leader.points
            const topPoints = pts.map((p, i) => `${xOf(i)},${yOf(p)}`).join(" ")
            const bottomRight = `${xOf(matchCount - 1)},${TOP_PAD + plotH}`
            const bottomLeft = `${xOf(0)},${TOP_PAD + plotH}`
            return (
              <polygon
                points={`${topPoints} ${bottomRight} ${bottomLeft}`}
                fill="url(#leader-fill)"
              />
            )
          })()}

          {sorted.map((s, rankIdx) =>
            TOP5_IDS.has(s.userId) && s.userId !== leaderUserId ? (
              <polyline
                key={s.userId}
                points={polylinePoints(s.points)}
                fill="none"
                stroke={colorOf(s.userId, rankIdx)}
                strokeWidth={1.5}
              />
            ) : null
          )}

          {(() => {
            const leader = sorted.find(s => s.userId === leaderUserId)
            if (!leader) return null
            return (
              <polyline
                points={polylinePoints(leader.points)}
                fill="none"
                stroke="#facc15"
                strokeWidth={2.5}
              />
            )
          })()}

          {sorted.slice(0, 5).map((s, rankIdx) => {
            const lastPts = s.points[matchCount - 1] ?? 0
            const y = yOf(lastPts)
            return (
              <text
                key={s.userId}
                x={xOf(matchCount - 1) + 5}
                y={Math.max(TOP_PAD + 8, Math.min(TOP_PAD + plotH - 2, y + 3))}
                fill={colorOf(s.userId, rankIdx)}
                fontSize={9}
                fontFamily="monospace"
              >
                {s.name.split(" ")[0]}
              </text>
            )
          })}

          {hoverIndex !== null && (
            <line
              x1={xOf(hoverIndex)}
              y1={TOP_PAD}
              x2={xOf(hoverIndex)}
              y2={TOP_PAD + plotH}
              stroke="#facc1540"
              strokeWidth={1}
            />
          )}

          {Array.from({ length: matchCount }, (_, i) => (
            <rect
              key={i}
              x={LEFT_PAD + i * STEP - STEP / 2}
              y={TOP_PAD}
              width={STEP}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </svg>
      </div>

      {hoverIndex !== null && tooltipEntries.length > 0 && (
        <div className="absolute left-2 top-1 bg-[#0d0d0d] border border-[#2a2000] rounded-sm px-2 py-1.5 pointer-events-none z-10">
          {tooltipEntries.map(e => (
            <div key={e.name} className="flex gap-3 text-xs">
              <span className="text-gray-400 w-20 truncate">{e.name.split(" ")[0]}</span>
              <span className="text-yellow-400 font-bold">{e.pts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
