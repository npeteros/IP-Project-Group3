import type { Metadata } from 'next'
import { SubNav } from '@/components/controls'
import { APP_NAME } from '@/src/lib/constants'
import { INSIGHTS_TABS } from '@/src/lib/placeholders/insights'
import { typography } from '@/src/lib/typography'

export const metadata: Metadata = {
  title: `Insights · ${APP_NAME}`,
}

export default function InsightsLayout({ children }: LayoutProps<'/insights'>) {
  return (
    <div className="flex flex-col gap-5 px-5 pt-7 pb-10 md:px-10 lg:px-14 lg:pt-10 lg:pb-12">
      <h1 className={typography.pageTitle}>Insights</h1>
      <SubNav variant="tabs" label="Insights sections" items={INSIGHTS_TABS} />
      <div className="pt-1">{children}</div>
    </div>
  )
}
