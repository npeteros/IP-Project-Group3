'use client'

import { api } from '@/src/lib/api'
import { Icon } from './Icon'

/** En dash, written as an escape so it isn't mistaken for a hyphen in source. */
export const STREAK_PLACEHOLDER = '\u2013'

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const { data } = api.stats.get.useQuery()
  const streak = data?.currentStreak ?? STREAK_PLACEHOLDER

  return (
    <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-2 text-amber-500">
      <Icon name="flame" size={14} />
      <span className="text-[13px] leading-none font-bold text-amber-700">
        {compact ? streak : `${streak} day streak`}
      </span>
    </div>
  )
}
