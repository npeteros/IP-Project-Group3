'use client'

import { useState } from 'react'
import { themeCookie, type Theme } from '@/src/lib/theme'
import { SegmentedControl } from './controls'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

/** Light / Dark / System switch. Applies instantly and persists to the theme cookie. */
export function ThemeSwitch({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme)

  function change(next: Theme) {
    setTheme(next)
    document.documentElement.dataset.theme = next
    document.cookie = themeCookie(next)
  }

  return <SegmentedControl label="Theme" options={OPTIONS} value={theme} onChange={change} />
}
