import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { RegisterForm } from '@/components/RegisterForm'
import { Logo } from '@/components/ui'
import { APP_NAME, REGISTER } from '@/src/lib/constants'
import { typography } from '@/src/lib/typography'

export const metadata: Metadata = {
  title: `${REGISTER.title} · ${APP_NAME}`,
}

const CURRENT_YEAR = new Date().getFullYear()

export default function RegisterPage() {
  return (
    <div className="flex min-h-dvh bg-bg text-neutral-900">
      {/* Brand panel — desktop only */}
      <aside className="hidden w-[39%] max-w-175 flex-none flex-col justify-between bg-neutral-900 px-14 py-14 text-surface lg:flex">
        <Link href="/" className="w-fit text-surface hover:text-surface">
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 flex-none items-center justify-center rounded-[9px] bg-surface text-neutral-900">
              <Icon name="book" size={16} />
            </span>
            <span className="font-serif text-xl leading-none font-semibold">{APP_NAME}</span>
          </span>
        </Link>

        <figure className="flex max-w-115 flex-col gap-6">
          <Icon name="quote" size={22} strokeWidth={1.6} className="text-neutral-400" />
          <blockquote className="font-serif text-[26px] leading-[1.6] font-normal italic">
            &ldquo;{REGISTER.quote}&rdquo;
          </blockquote>
          <figcaption className="text-[13px] leading-none text-neutral-400">
            {REGISTER.quoteAuthor}
          </figcaption>
        </figure>

        <p className="text-xs leading-none text-neutral-600">
          &copy; {CURRENT_YEAR} {APP_NAME}
        </p>
      </aside>

      {/* Form */}
      <main className="flex flex-1 items-center justify-center px-7 py-10">
        <div className="flex w-full max-w-90 flex-col gap-8">
          <div className="lg:hidden">
            <Logo size="lg" />
          </div>
          <div className="flex flex-col gap-2.5">
            <h1 className={typography.authTitle}>{REGISTER.title}</h1>
            <p className="text-sm leading-normal text-neutral-600">{REGISTER.subtitle}</p>
          </div>
          <RegisterForm />
        </div>
      </main>
    </div>
  )
}
