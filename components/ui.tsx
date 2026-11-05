import { APP_NAME, type IconName, type Tone } from '@/src/lib/constants'
import { STREAK_DAYS, type JournalEntry } from '@/src/lib/placeholders/journal'
import { typography } from '@/src/lib/typography'
import { Icon } from './Icon'

export function Logo({
  size = 'md',
  inverted = false,
  name = APP_NAME,
}: {
  size?: 'md' | 'lg'
  /** Mark and text for use on the brand `panel` background. */
  inverted?: boolean
  name?: string
}) {
  const box = size === 'lg' ? 'size-8' : 'size-[30px]'
  const markColors = inverted ? 'bg-on-panel text-panel' : 'bg-neutral-900 text-surface'

  return (
    <div className={`flex items-center gap-2.5 ${inverted ? 'text-on-panel' : ''}`}>
      <div
        className={`${box} flex flex-none items-center justify-center rounded-[9px] ${markColors}`}
      >
        <Icon name="book" size={size === 'lg' ? 16 : 15} />
      </div>
      <span
        className={
          size === 'lg' ? 'font-serif text-xl leading-none font-semibold' : typography.wordmark
        }
      >
        {name}
      </span>
    </div>
  )
}

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-2 text-amber-500">
      <Icon name="flame" size={14} />
      <span className="text-[13px] leading-none font-bold text-amber-700">
        {compact ? STREAK_DAYS : `${STREAK_DAYS} day streak`}
      </span>
    </div>
  )
}

export function Tag({
  label,
  className = 'bg-neutral-100',
}: {
  label: string
  className?: string
}) {
  return (
    <span className={`${typography.tag} rounded-full px-2.5 py-1 text-neutral-600 ${className}`}>
      {label}
    </span>
  )
}

export function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`${typography.chip} flex-none rounded-full px-4 py-2 lg:px-[18px] lg:py-[9px] ${
        active
          ? 'bg-neutral-900 font-semibold text-surface'
          : 'border border-neutral-200 bg-surface font-medium text-neutral-600'
      }`}
    >
      {label}
    </button>
  )
}

export function Card({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-surface shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function EntryCard({ entry, tagClassName }: { entry: JournalEntry; tagClassName?: string }) {
  return (
    <Card className="flex flex-col gap-2 p-[18px] lg:p-5">
      <span className={typography.caption}>{entry.date}</span>
      <h3 className={typography.entryTitle}>{entry.title}</h3>
      <p className={typography.bodySmall}>{entry.excerpt}</p>
      <div className="mt-0.5 flex gap-1.5">
        {entry.tags.map((tag) => (
          <Tag key={tag} label={tag} className={tagClassName} />
        ))}
      </div>
    </Card>
  )
}

const TONE_CLASSES: Record<Tone, { pill: string; dot: string; square: string }> = {
  cloud: {
    pill: 'border-cloud-200 bg-cloud-100 text-cloud-700',
    dot: 'bg-cloud-700',
    square: 'bg-cloud-100 text-cloud-700',
  },
  sage: {
    pill: 'border-sage-200 bg-sage-100 text-sage-700',
    dot: 'bg-sage-700',
    square: 'bg-sage-100 text-sage-700',
  },
}

export function ToneBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex flex-none items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2.5 ${TONE_CLASSES[tone].pill}`}
    >
      <Icon name="check" size={14} />
      <span className="text-xs leading-none font-semibold">{label}</span>
    </span>
  )
}

export function MoodDot({ tone }: { tone: Tone }) {
  return <span className={`size-[7px] rounded-full ${TONE_CLASSES[tone].dot}`} />
}

export function SectionLabel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <h2 className={`${typography.sectionLabel} ${className}`}>{children}</h2>
}

/** Outlined button for secondary actions. Pass `onClick` only from client components. */
export function SecondaryButton({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border border-neutral-200 text-neutral-900 hover:bg-neutral-100 ${typography.label} ${className}`}
    >
      {children}
    </button>
  )
}

/** A labelled card of settings rows, e.g. "Appearance" or "Security". */
export function SettingsGroup({
  label,
  id,
  children,
}: {
  label: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="flex scroll-mt-8 flex-col gap-2.5">
      <SectionLabel>{label}</SectionLabel>
      <div className="divide-y divide-neutral-200 rounded-[14px] border border-neutral-200 bg-surface shadow-sm">
        {children}
      </div>
    </section>
  )
}

export function SettingsRow({
  icon,
  iconTone,
  label,
  children,
}: {
  icon?: IconName
  /** Renders the icon inside a tinted square instead of bare. */
  iconTone?: Tone
  label: React.ReactNode
  /** Right-hand content: a value, toggle, control or chevron. */
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[60px] items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {icon &&
          (iconTone ? (
            <span
              className={`flex size-7 flex-none items-center justify-center rounded-lg ${TONE_CLASSES[iconTone].square}`}
            >
              <Icon name={icon} size={15} />
            </span>
          ) : (
            <Icon name={icon} size={18} className="flex-none text-neutral-600" />
          ))}
        <span className="text-sm leading-none font-medium">{label}</span>
      </div>
      {children}
    </div>
  )
}

export function StatCard({
  value,
  label,
  icon,
  className = '',
}: {
  value: React.ReactNode
  label: string
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={`flex flex-col justify-center gap-1 p-[22px] ${className}`}>
      <div className="flex items-baseline gap-1.5">
        {icon}
        <span className={typography.stat}>{value}</span>
      </div>
      <span className="text-[13px] leading-[1.3] font-medium text-neutral-600">{label}</span>
    </Card>
  )
}

/** Horizontal bar, `value` is 0–100. */
export function ProgressBar({
  value,
  label,
  barClassName = 'bg-sage-500',
}: {
  value: number
  label: string
  barClassName?: string
}) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-[4px] bg-neutral-100">
      <div
        aria-hidden="true"
        className={`h-full rounded-[4px] ${barClassName}`}
        style={{ width: `${clamped}%` }}
      />
      <span className="sr-only">{`${label}: ${clamped}%`}</span>
    </div>
  )
}

export function PrimaryButton({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-surface ${typography.label} ${className}`}
    >
      {children}
    </button>
  )
}
