type Scale<Steps extends number> = Record<Steps, string>

export type Palette = {
  bg: string
  surface: string
  /** Brand panel (auth screens); stays dark in both themes. */
  panel: string
  /** Text and marks on `panel`. */
  onPanel: string
  neutral: Scale<100 | 200 | 300 | 400 | 600 | 900>
  sage: Scale<100 | 200 | 500 | 700>
  cloud: Scale<100 | 200 | 500 | 700>
  amber: Scale<100 | 200 | 500 | 700>
  shadows: { sm: string; md: string }
}

export const palette: Palette = {
  bg: 'oklch(98% 0.008 75)',
  surface: 'oklch(99% 0.004 75)',
  panel: 'oklch(22% 0.012 75)',
  onPanel: 'oklch(99% 0.004 75)',
  neutral: {
    100: 'oklch(95% 0.008 75)',
    200: 'oklch(90% 0.007 75)',
    300: 'oklch(84% 0.008 75)',
    400: 'oklch(70% 0.01 75)',
    600: 'oklch(50% 0.012 75)',
    900: 'oklch(22% 0.012 75)',
  },
  // Secondary accent
  sage: {
    100: 'oklch(94% 0.03 150)',
    200: 'oklch(87% 0.05 150)',
    500: 'oklch(62% 0.07 150)',
    700: 'oklch(38% 0.06 150)',
  },
  // Primary / AI accent (dusty blue)
  cloud: {
    100: 'oklch(94% 0.03 250)',
    200: 'oklch(87% 0.05 250)',
    500: 'oklch(62% 0.07 250)',
    700: 'oklch(38% 0.06 250)',
  },
  // Streaks & momentum
  amber: {
    100: 'oklch(94% 0.035 55)',
    200: 'oklch(87% 0.06 55)',
    500: 'oklch(62% 0.07 55)',
    700: 'oklch(42% 0.08 55)',
  },
  shadows: {
    sm: '0 1px 2px oklch(22% 0.012 75 / 0.06), 0 1px 1px oklch(22% 0.012 75 / 0.04)',
    md: '0 10px 28px oklch(22% 0.012 75 / 0.10)',
  },
}

/**
 * Dark theme: same hues and chroma family, lightness inverted. Step names keep their role, not
 * their lightness: `neutral-900` is always the primary text colour, `100` the subtle fill, and
 * accent `100`/`200` are tinted fills while `500`/`700` are the readable foregrounds.
 */
export const darkPalette: Palette = {
  bg: 'oklch(17% 0.008 75)',
  surface: 'oklch(21% 0.008 75)',
  panel: 'oklch(13% 0.01 75)',
  onPanel: 'oklch(95% 0.006 75)',
  neutral: {
    100: 'oklch(26% 0.008 75)',
    200: 'oklch(32% 0.008 75)',
    300: 'oklch(40% 0.009 75)',
    400: 'oklch(64% 0.01 75)',
    600: 'oklch(77% 0.01 75)',
    900: 'oklch(94% 0.008 75)',
  },
  sage: {
    100: 'oklch(28% 0.035 150)',
    200: 'oklch(37% 0.05 150)',
    500: 'oklch(68% 0.08 150)',
    700: 'oklch(84% 0.06 150)',
  },
  cloud: {
    100: 'oklch(28% 0.035 250)',
    200: 'oklch(37% 0.05 250)',
    500: 'oklch(68% 0.08 250)',
    700: 'oklch(84% 0.06 250)',
  },
  amber: {
    100: 'oklch(29% 0.04 55)',
    200: 'oklch(38% 0.06 55)',
    500: 'oklch(72% 0.09 55)',
    700: 'oklch(85% 0.08 55)',
  },
  shadows: {
    sm: '0 1px 2px oklch(0% 0 0 / 0.35)',
    md: '0 10px 28px oklch(0% 0 0 / 0.5)',
  },
}

const SCALES = ['neutral', 'sage', 'cloud', 'amber'] as const

/** Flattens a palette into `--mo-*` custom properties, e.g. `--mo-sage-100`. */
export function paletteCssVariables(p: Palette): Record<string, string> {
  const vars: Record<string, string> = {
    '--mo-bg': p.bg,
    '--mo-surface': p.surface,
    '--mo-panel': p.panel,
    '--mo-on-panel': p.onPanel,
    '--mo-shadow-sm': p.shadows.sm,
    '--mo-shadow-md': p.shadows.md,
  }

  for (const scale of SCALES) {
    for (const [step, value] of Object.entries(p[scale])) {
      vars[`--mo-${scale}-${step}`] = value
    }
  }

  return vars
}

function declarations(p: Palette, colorScheme: 'light' | 'dark') {
  const vars = Object.entries(paletteCssVariables(p))
    .map(([name, value]) => `${name}:${value};`)
    .join('')
  return `${vars}color-scheme:${colorScheme};`
}

/**
 * The theme stylesheet injected into <head>. `<html data-theme>` picks the palette: `light`,
 * `dark`, or `system` (follows the OS via `prefers-color-scheme`).
 */
export function themeStylesheet(): string {
  const light = declarations(palette, 'light')
  const dark = declarations(darkPalette, 'dark')
  return [
    `:root{${light}}`,
    `:root[data-theme="dark"]{${dark}}`,
    `@media (prefers-color-scheme: dark){:root[data-theme="system"]{${dark}}}`,
  ].join('')
}
