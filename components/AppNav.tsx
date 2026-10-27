'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '@/src/lib/auth-client'
import { LOG_OUT_LABEL, NAV_ITEMS, NEW_ENTRY_LABEL } from '@/src/lib/constants'
import { Icon } from './Icon'
import { Logo, PrimaryButton, StreakBadge } from './ui'

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => href !== '#' && pathname.startsWith(href)
}

function useLogOut() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function logOut() {
    setPending(true)
    await signOut()
    // Refresh so server components drop the old session before landing on /login.
    router.replace('/login')
    router.refresh()
  }

  return { logOut, pending }
}

export function Sidebar() {
  const isActive = useIsActive()
  const { logOut, pending } = useLogOut()

  return (
    <aside className="hidden w-[260px] flex-none flex-col gap-7 border-r border-neutral-200 bg-surface px-5 py-7 lg:flex">
      <div className="px-1">
        <Logo />
      </div>

      <PrimaryButton className="h-11">
        <Icon name="plus" size={15} strokeWidth={2.2} />
        {NEW_ENTRY_LABEL}
      </PrimaryButton>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm leading-none ${
                active
                  ? 'bg-neutral-100 font-semibold text-neutral-900 hover:text-neutral-900'
                  : 'font-medium text-neutral-400 hover:bg-neutral-100/60 hover:text-neutral-600'
              }`}
            >
              <Icon name={item.icon} size={18} strokeWidth={item.icon === 'layers' ? 1.75 : 2} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      <StreakBadge />

      <button
        type="button"
        onClick={logOut}
        disabled={pending}
        className="-mt-4 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm leading-none font-medium text-neutral-400 hover:bg-neutral-100/60 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon name="log-out" size={18} />
        {LOG_OUT_LABEL}
      </button>
    </aside>
  )
}

export function MobileTabBar() {
  const isActive = useIsActive()
  const { logOut, pending } = useLogOut()

  return (
    <nav className="flex h-20 flex-none items-center justify-around border-t border-neutral-200 bg-surface pb-3 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 ${
              active
                ? 'text-neutral-900 hover:text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Icon name={item.icon} size={20} strokeWidth={item.icon === 'layers' ? 1.75 : 2} />
            <span
              className={`text-[11px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
      <button
        type="button"
        onClick={logOut}
        disabled={pending}
        className="flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon name="log-out" size={20} />
        <span className="text-[11px] leading-none font-medium">{LOG_OUT_LABEL}</span>
      </button>
    </nav>
  )
}
