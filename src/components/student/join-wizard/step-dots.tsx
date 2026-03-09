'use client'

import { motion } from 'motion/react'

interface StepDotsProps {
  currentStep: number
  totalSteps: number
}

export function StepDots({ currentStep, totalSteps }: StepDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepIndex = i + 1
        const isActive = stepIndex === currentStep
        const isCompleted = stepIndex < currentStep

        return (
          <motion.div
            key={stepIndex}
            className={`h-2.5 w-2.5 rounded-full ${
              isActive
                ? 'bg-brand-blue'
                : isCompleted
                  ? 'bg-brand-blue/40'
                  : 'bg-muted'
            }`}
            animate={
              isActive
                ? { scale: [1, 1.3, 1] }
                : { scale: 1 }
            }
            transition={
              isActive
                ? { duration: 0.6, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
          />
        )
      })}
    </div>
  )
}
