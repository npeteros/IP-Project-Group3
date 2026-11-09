import Link from 'next/link'
import { APP_NAME, AUTH_PANEL } from '@/src/lib/constants'
import { Icon } from './Icon'
import { Logo } from './ui'

const CURRENT_YEAR = new Date().getFullYear()

/** Dark quote panel beside the sign-in and sign-up forms. Desktop only. */
export function AuthBrandPanel() {
  return (
    <aside className="hidden w-[39%] max-w-[560px] flex-none flex-col justify-between bg-panel p-14 text-on-panel lg:flex">
      <Link href="/" className="w-fit text-on-panel hover:text-on-panel">
        <Logo inverted />
      </Link>

      <figure className="flex max-w-[400px] flex-col gap-4">
        <Icon name="quote" size={34} strokeWidth={1.4} className="text-neutral-400" />
        <blockquote className="font-serif text-[26px] leading-[1.5] font-medium italic">
          &ldquo;{AUTH_PANEL.quote}&rdquo;
        </blockquote>
        <figcaption className="text-[13px] leading-none font-semibold text-neutral-400">
          {AUTH_PANEL.quoteAuthor}
        </figcaption>
      </figure>

      <p className="text-xs leading-none font-medium text-neutral-400">
        &copy; {CURRENT_YEAR} {APP_NAME}
      </p>
    </aside>
  )
}
