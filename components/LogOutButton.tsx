'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '@/src/lib/auth-client'
import { LOG_OUT_LABEL } from '@/src/lib/constants'
import { Icon } from './Icon'

/** Signs out, then lands on /login. Styled as a settings row. */
export function LogOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function logOut() {
    setPending(true)
    await signOut()
    // Refresh so server components drop the old session before landing on /login.
    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={logOut}
      disabled={pending}
      className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3.5 text-left text-sm leading-none font-medium text-neutral-900 hover:bg-neutral-100/60 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
    >
      <Icon name="log-out" size={18} className="text-neutral-600" />
      {LOG_OUT_LABEL}
    </button>
  )
}
