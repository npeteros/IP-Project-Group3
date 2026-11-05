import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthBrandPanel } from '@/components/AuthBrandPanel'
import { RegisterForm } from '@/components/RegisterForm'
import { Logo } from '@/components/ui'
import { getSession } from '@/src/lib/auth'
import { APP_NAME, REGISTER } from '@/src/lib/constants'
import { typography } from '@/src/lib/typography'

export const metadata: Metadata = {
  title: `${REGISTER.title} · ${APP_NAME}`,
}

export default async function RegisterPage() {
  if (await getSession()) redirect(REGISTER.postRegisterHref)

  return (
    <div className="flex min-h-dvh bg-bg text-neutral-900">
      <AuthBrandPanel />

      <main className="flex flex-1 items-center justify-center px-7 py-10">
        <div className="flex w-full max-w-[360px] flex-col gap-8">
          <div className="lg:hidden">
            <Logo size="lg" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className={typography.authTitle}>{REGISTER.title}</h1>
            <p className={typography.body}>{REGISTER.subtitle}</p>
          </div>
          <RegisterForm />
        </div>
      </main>
    </div>
  )
}
