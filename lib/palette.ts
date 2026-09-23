import type { CSSProperties } from "react";

export const palette = {
  bg: "oklch(98% 0.008 75)",
  surface: "oklch(99% 0.004 75)",
  neutral: {
    100: "oklch(95% 0.008 75)",
    200: "oklch(90% 0.007 75)",
    300: "oklch(84% 0.008 75)",
    400: "oklch(70% 0.01 75)",
    600: "oklch(50% 0.012 75)",
    900: "oklch(22% 0.012 75)",
  },
  // Secondary accent
  sage: {
    100: "oklch(94% 0.03 150)",
    200: "oklch(87% 0.05 150)",
    500: "oklch(62% 0.07 150)",
    700: "oklch(38% 0.06 150)",
  },
  // Primary / AI accent (dusty blue)
  cloud: {
    100: "oklch(94% 0.03 250)",
    200: "oklch(87% 0.05 250)",
    500: "oklch(62% 0.07 250)",
    700: "oklch(38% 0.06 250)",
  },
  // Streaks & momentum
  amber: {
    100: "oklch(94% 0.035 55)",
    200: "oklch(87% 0.06 55)",
    500: "oklch(62% 0.07 55)",
    700: "oklch(42% 0.08 55)",
  },
} as const;

export const shadows = {
  sm: "0 1px 2px oklch(22% 0.012 75 / 0.06), 0 1px 1px oklch(22% 0.012 75 / 0.04)",
  md: "0 10px 28px oklch(22% 0.012 75 / 0.10)",
} as const;

// Flattens the palette into `--mo-*` custom properties, e.g. `--mo-sage-100`.
export function paletteCssVariables(): CSSProperties {
  const vars: Record<string, string> = {
    "--mo-bg": palette.bg,
    "--mo-surface": palette.surface,
    "--mo-shadow-sm": shadows.sm,
    "--mo-shadow-md": shadows.md,
  };

  for (const scale of ["neutral", "sage", "cloud", "amber"] as const) {
    for (const [step, value] of Object.entries(palette[scale])) {
      vars[`--mo-${scale}-${step}`] = value;
    }
  }

  return vars as CSSProperties;
}
