interface RadarValues {
  rank: number       // 0-1
  form: number       // 0-1
  stability: number  // 0-1
  precision: number  // 0-1
  boldness: number   // 0-1
}

interface Props {
  values: RadarValues
}

const CX = 110
const CY = 110
const R = 72
const N = 5
const START = -Math.PI / 2

const AXES = [
  { key: "rank",      label: "РЕЙТИНГ",   anchor: "middle" as const,  dx: 0,   dy: -10 },
  { key: "form",      label: "ФОРМА",      anchor: "start" as const,   dx: 6,   dy: 4   },
  { key: "precision", label: "ТОЧНОСТЬ",   anchor: "start" as const,   dx: 4,   dy: 10  },
  { key: "stability", label: "СТАБ.",      anchor: "end" as const,     dx: -4,  dy: 10  },
  { key: "boldness",  label: "СМЕЛОСТЬ",   anchor: "end" as const,     dx: -6,  dy: 4   },
]

function pt(index: number, radius: number) {
  const angle = START + index * (2 * Math.PI / N)
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  }
}

function polyPoints(vals: number[]) {
  return vals.map((v, i) => {
    const { x, y } = pt(i, v * R)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")
}

const GRID = [0.25, 0.5, 0.75, 1.0]

export function ProfileRadar({ values }: Props) {
  const vals = [values.rank, values.form, values.precision, values.stability, values.boldness]

  return (
    <svg width={220} height={220} viewBox="0 0 220 220" style={{ display: "block", margin: "0 auto" }}>
      {/* Сетка */}
      {GRID.map(level => (
        <polygon
          key={level}
          points={polyPoints([level, level, level, level, level])}
          fill="none"
          stroke="#1a1500"
          strokeWidth={level === 1.0 ? 1 : 0.5}
        />
      ))}

      {/* Оси */}
      {AXES.map((_, i) => {
        const outer = pt(i, R)
        return (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
            stroke="#1a1500"
            strokeWidth={0.5}
          />
        )
      })}

      {/* Заливка значений */}
      <polygon
        points={polyPoints(vals)}
        fill="#facc1525"
        stroke="#facc15"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Точки на вершинах */}
      {vals.map((v, i) => {
        const { x, y } = pt(i, v * R)
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3} fill="#facc15" />
      })}

      {/* Подписи осей */}
      {AXES.map((axis, i) => {
        const { x, y } = pt(i, R + 18)
        return (
          <text
            key={i}
            x={(x + axis.dx).toFixed(1)}
            y={(y + axis.dy).toFixed(1)}
            textAnchor={axis.anchor}
            fontSize={7}
            fontFamily="monospace"
            letterSpacing="0.05em"
            fill="#6b7280"
          >
            {axis.label}
          </text>
        )
      })}

      {/* Центральная точка */}
      <circle cx={CX} cy={CY} r={2} fill="#374151" />
    </svg>
  )
}
