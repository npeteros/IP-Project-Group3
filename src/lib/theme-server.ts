import { cookies } from 'next/headers'
import { parseTheme, THEME_COOKIE, type Theme } from '@/src/lib/theme'

/** The visitor's saved theme preference, or the default. Server-only. */
export async function getTheme(): Promise<Theme> {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value)
}
