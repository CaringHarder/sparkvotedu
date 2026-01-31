'use client'

import { motion, AnimatePresence } from 'motion/react'

/** Color palette for poll options -- 8 distinct Tailwind-compatible colors */
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

export interface BarChartDatum {
  optionId: string
  label: string
  count: number
  color?: string
}

interface BarChartProps {
  data: BarChartDatum[]
  total: number
}

/**
 * Animated horizontal bar chart with spring physics.
 *
 * Bar width is proportional to the max count (widest bar fills container),
 * ensuring visible relative differences even with low totals.
 * Each bar animates width with a bouncy spring transition.
 */
export function AnimatedBarChart({ data, total }: BarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
          const widthPct = (d.count / maxCount) * 100
          const color = d.color ?? COLORS[i % COLORS.length]

          return (
            <motion.div
              key={d.optionId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="space-y-1"
            >
              {/* Label row */}
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{d.label}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {d.count} vote{d.count !== 1 ? 's' : ''} ({pct}%)
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-8 w-full overflow-hidden rounded-md bg-muted">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{ backgroundColor: color }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    mass: 0.8,
                  }}
                >
                  {/* Count inside bar when wide enough */}
                  {widthPct > 15 && (
                    <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-white">
                      {d.count}
                    </span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
