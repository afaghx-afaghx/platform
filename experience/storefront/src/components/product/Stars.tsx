'use client'

import { memo } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarsProps {
  rating: number
  className?: string
  size?: number
}

/**
 * Amazon-style star rating with per-star partial fill (halves included).
 * Each star is a gray base with a width-cropped gold overlay; the crop
 * direction follows document direction automatically (inset-0 + width),
 * which is exactly what we want for RTL Persian.
 * Visual glyphs are aria-hidden; `role="img"` carries the value.
 */
export const Stars = memo(function Stars({ rating, className, size = 14 }: StarsProps) {
  const clamped = Math.max(0, Math.min(5, rating))
  const full = Math.floor(clamped)
  const frac = clamped - full
  const half = frac >= 0.25 && frac < 0.75
  const shown = frac >= 0.75 ? full + 1 : full

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 align-middle', className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} / 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const fillPct = i < shown ? 1 : i === shown && half ? 0.5 : 0
        return (
          <span
            key={i}
            aria-hidden="true"
            className="relative inline-block shrink-0"
            style={{ width: size, height: size }}
          >
            <Star
              size={size}
              className="absolute inset-0 text-[#e3e6e6]"
              fill="currentColor"
              strokeWidth={0}
            />
            {fillPct > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct * 100}%` }}>
                <Star size={size} className="text-afx-star" fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
})
