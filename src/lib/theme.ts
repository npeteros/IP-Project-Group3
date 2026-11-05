// Client-safe theme preference helpers. The preference lives in a cookie so the server can set
// `<html data-theme>` on first paint without a flash of the wrong theme.

export const THEMES = ['light', 'dark', 'system'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'system'

export const THEME_COOKIE = 'moodiary-theme'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function parseTheme(value: string | undefined | null): Theme {
  return THEMES.find((theme) => theme === value) ?? DEFAULT_THEME
}

export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`
}
