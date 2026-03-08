'use client'

import { motion } from 'motion/react'

/** Color palette matching bar-chart.tsx */
const COLORS = [
  '#6366f1', // indigo-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
]

export interface DonutChartDatum {
  optionId: string
  label: string
  count: number
  color?: string
}

interface DonutChartProps {
  data: DonutChartDatum[]
  total: number
  large?: boolean
}

/**
 * Convert polar coordinates to SVG cartesian.
 */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/**
 * Build an SVG arc path for a donut segment.
 */
function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle
  const largeArc = sweep > 180 ? 1 : 0

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle)
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle)
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle)
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle)

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ')
}

/**
 * Animated donut/pie chart with Motion SVG path animations.
 *
 * SVG-based with configurable outer and inner radius for donut hole.
 * Each segment animates in with spring physics on opacity and scale.
 */
export function DonutChart({ data, total, large }: DonutChartProps) {
  const cx = 100
  const cy = 100
  const outerR = 80
  const innerR = 50

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 200 200" className={large ? 'h-80 w-80 md:h-96 md:w-96' : 'h-48 w-48 md:h-56 md:w-56'}>
          <circle
            cx={cx}
            cy={cy}
            r={(outerR + innerR) / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={outerR - innerR}
            className="text-muted"
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            className={large ? 'fill-muted-foreground text-[16px]' : 'fill-muted-foreground text-[11px]'}
          >
            No votes yet
          </text>
        </svg>
      </div>
    )
  }

  // Build segments with cumulative angles
  const segments: { datum: DonutChartDatum; startAngle: number; endAngle: number; color: string }[] = []
  let cumAngle = 0
  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const sweep = (d.count / total) * 360
    if (sweep > 0) {
      segments.push({
        datum: d,
        startAngle: cumAngle,
        endAngle: cumAngle + sweep - 0.5, // small gap between segments
        color: d.color ?? COLORS[i % COLORS.length],
      })
    }
    cumAngle += sweep
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" className={large ? 'h-80 w-80 md:h-96 md:w-96' : 'h-48 w-48 md:h-56 md:w-56'}>
        {segments.map((seg, i) => (
          <motion.path
            key={seg.datum.optionId}
            d={describeArc(cx, cy, outerR, innerR, seg.startAngle, seg.endAngle)}
            fill={seg.color}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              delay: i * 0.08,
            }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        {/* Center total */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="central"
          className={`fill-foreground ${large ? 'text-[36px]' : 'text-[22px]'} font-bold`}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          dominantBaseline="central"
          className={`fill-muted-foreground ${large ? 'text-[16px]' : 'text-[10px]'}`}
        >
          votes
        </text>
      </svg>

      {/* Legend */}
      <div className={`flex flex-wrap justify-center ${large ? 'gap-x-6 gap-y-2' : 'gap-x-4 gap-y-1'}`}>
        {data.map((d, i) => {
          const color = d.color ?? COLORS[i % COLORS.length]
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
          return (
            <div key={d.optionId} className={`flex items-center gap-1.5 ${large ? 'text-lg' : 'text-xs'}`}>
              <span
                className={`inline-block ${large ? 'h-4 w-4' : 'h-2.5 w-2.5'} rounded-full`}
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{d.label}</span>
              <span className="text-muted-foreground">({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
