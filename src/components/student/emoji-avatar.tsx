'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { shortcodeToEmoji } from '@/lib/student/emoji-pool'

const avatarVariants = cva(
  'inline-flex items-center justify-center rounded-full bg-muted select-none',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-lg',
        md: 'h-10 w-10 text-xl',
        lg: 'h-14 w-14 text-3xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

interface EmojiAvatarProps extends VariantProps<typeof avatarVariants> {
  /** Emoji shortcode (e.g., "rocket"). Null shows sparkles fallback. */
  shortcode: string | null
  className?: string
}

/** Renders an emoji avatar circle from a shortcode. Shows sparkles for null/unknown. */
export function EmojiAvatar({ shortcode, size, className }: EmojiAvatarProps) {
  const resolved = shortcode ? shortcodeToEmoji(shortcode) : null
  // Sparkles fallback for null shortcode or unresolvable shortcode
  const display = resolved ?? '\u{2728}'
  const label = shortcode ?? 'no emoji'

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(avatarVariants({ size }), className)}
    >
      {display}
    </span>
  )
}
