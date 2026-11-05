import { describe, expect, it } from 'vitest'
import { darkPalette, palette, paletteCssVariables, themeStylesheet } from '@/src/lib/palette'
import { DEFAULT_THEME, parseTheme, THEME_COOKIE, themeCookie } from '@/src/lib/theme'

describe('parseTheme', () => {
  it.each(['light', 'dark', 'system'] as const)('accepts %s', (theme) => {
    expect(parseTheme(theme)).toBe(theme)
  })

  it.each([undefined, null, '', 'DARK', 'sepia'])('falls back to the default for %s', (value) => {
    expect(parseTheme(value)).toBe(DEFAULT_THEME)
  })
})

describe('themeCookie', () => {
  it('writes a site-wide, year-long cookie', () => {
    const cookie = themeCookie('dark')
    expect(cookie).toContain(`${THEME_COOKIE}=dark`)
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('Max-Age=31536000')
  })
})

describe('palettes', () => {
  it('define the same tokens in light and dark', () => {
    expect(Object.keys(paletteCssVariables(darkPalette)).sort()).toEqual(
      Object.keys(paletteCssVariables(palette)).sort(),
    )
  })
})

describe('themeStylesheet', () => {
  const css = themeStylesheet()

  it('applies the light palette by default', () => {
    expect(css).toContain(`:root{--mo-bg:${palette.bg};`)
  })

  it('applies the dark palette for data-theme="dark"', () => {
    expect(css).toContain(`:root[data-theme="dark"]{--mo-bg:${darkPalette.bg};`)
  })

  it('follows the OS for data-theme="system"', () => {
    expect(css).toContain(
      `@media (prefers-color-scheme: dark){:root[data-theme="system"]{--mo-bg:${darkPalette.bg};`,
    )
  })
})
