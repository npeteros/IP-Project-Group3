'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import type { IconName } from '@/src/lib/constants'
import { Icon } from './Icon'

/**
 * Interactive building blocks. Each control works uncontrolled (pass `defaultValue`) so server
 * pages can render it with placeholder state, or controlled (pass `value` + `onChange`).
 */

function useControllableState<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [internal, setInternal] = useState(defaultValue)
  const current = value ?? internal
  function set(next: T) {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }
  return [current, set] as const
}

export type Option<T extends string> = { value: T; label: string }

const FOCUS_RING = 'peer-focus-visible:ring-2 peer-focus-visible:ring-cloud-200'

/** Native radio group: a fieldset whose options are labels wrapping visually hidden inputs. */
function RadioFieldset<T extends string>({
  label,
  options,
  current,
  onSelect,
  className,
  renderOption,
}: {
  label: string
  options: (Option<T> & { icon?: IconName })[]
  current: T
  onSelect: (value: T) => void
  className: string
  renderOption: (option: Option<T> & { icon?: IconName }, active: boolean) => React.ReactNode
}) {
  const name = useId()
  return (
    <fieldset className={`m-0 min-w-0 border-0 p-0 ${className}`}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const active = option.value === current
        return (
          <label key={option.value} className="contents">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onSelect(option.value)}
              className="peer sr-only"
            />
            {renderOption(option, active)}
          </label>
        )
      })}
    </fieldset>
  )
}

/** Pill-shaped segmented control, e.g. the theme switch or story granularity. */
export function SegmentedControl<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
  label,
  size = 'sm',
  className = '',
}: {
  options: Option<T>[]
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const [current, setCurrent] = useControllableState(
    value,
    defaultValue ?? options[0].value,
    onChange,
  )
  const item =
    size === 'md'
      ? 'flex-1 py-2 text-[13px] leading-none'
      : 'px-3 py-1.5 text-xs leading-none sm:px-4'

  return (
    <RadioFieldset
      label={label}
      options={options}
      current={current}
      onSelect={setCurrent}
      className={`flex rounded-full bg-neutral-100 p-[3px] ${className}`}
      renderOption={(option, active) => (
        <span
          className={`cursor-pointer rounded-full text-center ${item} ${FOCUS_RING} ${
            active
              ? `bg-surface text-neutral-900 shadow-sm ${size === 'md' ? 'font-bold' : 'font-semibold'}`
              : 'font-medium text-neutral-400 hover:text-neutral-600'
          }`}
        >
          {option.label}
        </span>
      )}
    />
  )
}

export function Toggle({
  checked,
  defaultChecked = false,
  onChange,
  label,
}: {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  label: string
}) {
  const [on, setOn] = useControllableState(checked, defaultChecked, onChange)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn(!on)}
      className={`relative h-6 w-[42px] flex-none rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-cloud-200 focus-visible:outline-none ${
        on ? 'bg-neutral-900' : 'bg-neutral-300'
      }`}
    >
      <span
        className={`absolute top-[3px] size-[18px] rounded-full transition-[left] ${
          on ? 'left-[21px] bg-surface' : 'left-[3px] bg-neutral-400'
        }`}
      />
    </button>
  )
}

/** Stacked radio rows inside a card, e.g. "Right to forget". */
export function RadioList<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
  label,
}: {
  options: Option<T>[]
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  label: string
}) {
  const [current, setCurrent] = useControllableState(
    value,
    defaultValue ?? options[0].value,
    onChange,
  )

  return (
    <RadioFieldset
      label={label}
      options={options}
      current={current}
      onSelect={setCurrent}
      className="divide-y divide-neutral-200 overflow-hidden rounded-[14px] border border-neutral-200 bg-surface shadow-sm"
      renderOption={(option, active) => (
        <span
          className={`flex cursor-pointer items-center justify-between gap-3 px-[18px] py-3.5 ${FOCUS_RING}`}
        >
          <span
            className={`text-[13px] leading-[1.3] font-medium ${active ? 'text-neutral-900' : 'text-neutral-600'}`}
          >
            {option.label}
          </span>
          {active ? (
            <span className="flex size-[17px] flex-none items-center justify-center rounded-full bg-neutral-900">
              <span className="size-1.5 rounded-full bg-surface" />
            </span>
          ) : (
            <span className="size-[17px] flex-none rounded-full border-[1.5px] border-neutral-400" />
          )}
        </span>
      )}
    />
  )
}

/** Side-by-side selectable cards with an icon, e.g. export format. */
export function RadioCards<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
  label,
}: {
  options: (Option<T> & { icon: IconName })[]
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  label: string
}) {
  const [current, setCurrent] = useControllableState(
    value,
    defaultValue ?? options[0].value,
    onChange,
  )
  return (
    <RadioFieldset
      label={label}
      options={options}
      current={current}
      onSelect={setCurrent}
      className="flex gap-2.5"
      renderOption={(option, active) => (
        <span
          className={`relative flex flex-1 cursor-pointer flex-col items-start gap-2 rounded-xl border-[1.5px] p-3.5 ${FOCUS_RING} ${
            active ? 'border-sage-500' : 'border-neutral-200 hover:border-neutral-300'
          }`}
        >
          {active && (
            <span className="absolute top-2.5 right-2.5 flex size-4 items-center justify-center rounded-full bg-sage-500 text-surface">
              <Icon name="check" size={10} strokeWidth={3} />
            </span>
          )}
          {option.icon && <Icon name={option.icon} size={18} className="text-neutral-600" />}
          <span className="text-[13px] leading-none font-semibold">{option.label}</span>
        </span>
      )}
    />
  )
}

export type SubNavItem = { label: string; href: string }

/**
 * Route-driven sub navigation. `tabs` renders an underlined tab strip (Insights), `vertical`
 * renders a side list on desktop that collapses to scrollable chips on mobile (Settings).
 * `exact` items only match their own path, so an index route isn't active on its children.
 */
export function SubNav({
  items,
  variant,
  label,
  heading,
}: {
  items: (SubNavItem & { exact?: boolean })[]
  variant: 'tabs' | 'vertical'
  label: string
  heading?: string
}) {
  const pathname = usePathname()
  const isActive = (item: SubNavItem & { exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const navRef = useRef<HTMLElement>(null)

  // On narrow screens the strip scrolls sideways; keep the current item visible.
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    const offset = active.getBoundingClientRect().left - nav.getBoundingClientRect().left
    nav.scrollLeft += offset - 20
  }, [pathname])

  if (variant === 'tabs') {
    return (
      <nav
        ref={navRef}
        aria-label={label}
        className="-mx-5 flex gap-6 overflow-x-auto border-b border-neutral-200 px-5 [scrollbar-width:none] md:mx-0 md:gap-7 md:px-0"
      >
        {items.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex-none border-b-2 pb-3 text-sm leading-none ${
                active
                  ? 'border-neutral-900 font-semibold text-neutral-900 hover:text-neutral-900'
                  : 'border-transparent font-medium text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className="flex flex-none gap-2 overflow-x-auto [scrollbar-width:none] lg:w-[220px] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-r lg:border-neutral-200 lg:px-5 lg:py-12"
    >
      {heading && (
        <span className="hidden px-3 pb-2.5 text-xs leading-none font-bold tracking-[0.06em] text-neutral-400 uppercase lg:block">
          {heading}
        </span>
      )}
      {items.map((item) => {
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex-none rounded-full px-4 py-2 text-[13px] leading-none lg:rounded-[10px] lg:px-3 lg:py-2.5 lg:text-sm ${
              active
                ? 'bg-neutral-900 font-semibold text-surface hover:text-surface lg:bg-neutral-100 lg:text-neutral-900 lg:hover:text-neutral-900'
                : 'border border-neutral-200 bg-surface font-medium text-neutral-600 hover:text-neutral-900 lg:border-none lg:bg-transparent lg:hover:bg-neutral-100/60'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
