import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthBrandPanel } from '@/components/AuthBrandPanel'
import { LoginForm } from '@/components/LoginForm'
import { Logo } from '@/components/ui'
import { getSession } from '@/src/lib/auth'
import { APP_NAME, LOGIN_PAGE } from '@/src/lib/constants'
import { typography } from '@/src/lib/typography'

export const metadata: Metadata = {
  title: `Sign in · ${APP_NAME}`,
}

export default async function LoginPage() {
  if (await getSession()) redirect(LOGIN_PAGE.postLoginHref)

  return (
    <div className="flex min-h-dvh bg-bg text-neutral-900">
      <AuthBrandPanel />

      <main className="flex flex-1 items-center justify-center px-7 py-12">
        <div className="flex w-full max-w-[360px] flex-col gap-10">
          <div className="lg:hidden">
            <Logo size="lg" />
          </div>

          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-2">
              <h1 className={typography.authTitle}>{LOGIN_PAGE.title}</h1>
              <p className={typography.body}>{LOGIN_PAGE.description}</p>
            </div>

            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  )
}
