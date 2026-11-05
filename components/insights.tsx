import Link from 'next/link'
import type { ThemeTrend, Trait } from '@/src/lib/placeholders/insights'
import { AI_DISCLOSURE } from '@/src/lib/placeholders/insights'
import { typography } from '@/src/lib/typography'
import { Card } from './ui'

/** Card with the Insights heading style. `aside` sits on the right of the heading row. */
export function InsightCard({
  title,
  aside,
  className = '',
  children,
}: {
  title?: string
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={`flex flex-col gap-3.5 p-[18px] md:p-[22px] ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3">
          <h2 className={typography.cardHeading}>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </Card>
  )
}

const LINE_COLORS = {
  sage: { text: 'text-sage-500', dot: 'bg-sage-500' },
  cloud: { text: 'text-cloud-500', dot: 'bg-cloud-500' },
}

const VIEW_WIDTH = 600
const PAD_X = 20
const PAD_TOP = 12
const PAD_BOTTOM = 14

/**
 * Area line chart for 0–100 scores. The SVG stretches to the card width; dots are HTML so they
 * stay round. Points are evenly spaced, matching the axis labels underneath.
 */
export function LineChart({
  id,
  label,
  points,
  color,
  height = 160,
  dots = false,
}: {
  /** Unique per page, for the gradient id. */
  id: string
  /** Accessible description of the chart. */
  label: string
  points: { label: string; score: number }[]
  color: keyof typeof LINE_COLORS
  height?: number
  dots?: boolean
}) {
  const plotBottom = height - PAD_BOTTOM
  const xs = points.map(
    (_, i) => PAD_X + (i * (VIEW_WIDTH - 2 * PAD_X)) / Math.max(points.length - 1, 1),
  )
  const ys = points.map(
    (p) => PAD_TOP + ((100 - Math.min(100, Math.max(0, p.score))) / 100) * (plotBottom - PAD_TOP),
  )
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const area = `${line} L${xs.at(-1)},${plotBottom} L${xs[0]},${plotBottom} Z`
  const gradientId = `${id}-fill`

  return (
    <div className="flex flex-col gap-3">
      <div className={`relative ${LINE_COLORS[color].text}`} style={{ height }}>
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-label={label}
        >
          <title>{label}</title>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {dots &&
          xs.map((x, i) => (
            <span
              key={points[i].label}
              aria-hidden="true"
              className={`absolute size-[9px] -translate-1/2 rounded-full ${LINE_COLORS[color].dot}`}
              style={{ left: `${(x / VIEW_WIDTH) * 100}%`, top: ys[i] }}
            />
          ))}
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between px-1 text-xs leading-none font-semibold text-neutral-400 md:px-2"
      >
        {points.map((p) => (
          <span key={p.label}>
            <span className="md:hidden">{p.label.slice(0, 1)}</span>
            <span className="hidden md:inline">{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const LEVEL_COLORS: Record<Trait['level'], string> = {
  High: 'text-cloud-700',
  Moderate: 'text-neutral-600',
  Low: 'text-neutral-600',
}

export function TraitBar({ trait }: { trait: Trait }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[13px] leading-none font-medium">
        <span>{trait.name}</span>
        <span className={`text-xs font-bold ${LEVEL_COLORS[trait.level]}`}>{trait.level}</span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-[4px] bg-neutral-100 md:h-2">
        <div
          aria-hidden="true"
          className="h-full rounded-[4px] bg-cloud-500"
          style={{ width: `${trait.score}%` }}
        />
      </div>
    </div>
  )
}

const TREND_STYLES: Record<ThemeTrend, { label: string; className: string }> = {
  rising: { label: '↑ rising', className: 'bg-cloud-100 text-cloud-700' },
  steady: { label: 'steady', className: 'bg-neutral-100 text-neutral-600' },
  falling: { label: '↓ easing', className: 'bg-sage-100 text-sage-700' },
}

export function TrendBadge({ trend }: { trend: ThemeTrend }) {
  const { label, className } = TREND_STYLES[trend]
  return (
    <span
      className={`flex-none rounded-lg px-2.5 py-[5px] text-[11px] leading-none font-bold ${className}`}
    >
      {label}
    </span>
  )
}

/** "Generated via cloud AI" footnote with a link to the Processing Log. */
export function AiDisclosure() {
  return (
    <p className="text-xs leading-normal text-neutral-400">
      {AI_DISCLOSURE}{' '}
      <Link href="/settings/data-privacy/processing-log" className="font-semibold">
        View log
      </Link>
    </p>
  )
}
