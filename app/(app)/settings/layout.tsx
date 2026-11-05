import type { Metadata } from 'next'
import { SubNav } from '@/components/controls'
import { APP_NAME } from '@/src/lib/constants'
import { SETTINGS_NAV } from '@/src/lib/placeholders/settings'
import { typography } from '@/src/lib/typography'

export const metadata: Metadata = {
  title: `Settings · ${APP_NAME}`,
}

export default function SettingsLayout({ children }: LayoutProps<'/settings'>) {
  return (
    <div className="flex min-h-full flex-col gap-4 px-5 pt-7 pb-10 md:px-10 lg:flex-row lg:gap-0 lg:p-0">
      <h1 className={`${typography.pageTitle} lg:sr-only`}>Settings</h1>
      <SubNav
        variant="vertical"
        label="Settings sections"
        heading="Settings"
        items={SETTINGS_NAV}
      />
      <div className="min-w-0 flex-1 lg:px-16 lg:py-12">{children}</div>
    </div>
  )
}
