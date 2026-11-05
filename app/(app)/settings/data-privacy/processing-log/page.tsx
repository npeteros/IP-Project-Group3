import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { Card } from '@/components/ui'
import { APP_NAME } from '@/src/lib/constants'
import { AI_USAGE, PROCESSING_LOG, PROCESSING_LOG_INTRO } from '@/src/lib/placeholders/settings'
import { typography } from '@/src/lib/typography'

export const metadata: Metadata = {
  title: `AI Processing Log · ${APP_NAME}`,
}

export default function ProcessingLogPage() {
  const usedPercent = Math.round((AI_USAGE.used / AI_USAGE.limit) * 100)

  return (
    <div className="flex max-w-[632px] flex-col gap-5 pt-2 lg:pt-0">
      <Link
        href="/settings/data-privacy"
        className="flex w-fit items-center gap-1 text-[13px] leading-none font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <Icon name="chevron-left" size={15} />
        Data &amp; privacy
      </Link>

      <div className="flex flex-col gap-2">
        <h2 className={typography.sectionTitle}>AI Processing Log</h2>
        <p className={typography.bodySmall}>{PROCESSING_LOG_INTRO}</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-cloud-100 px-4 py-3 md:px-5">
        <span className="text-xs leading-none font-semibold text-cloud-700">
          {AI_USAGE.used} of {AI_USAGE.limit} requests used {AI_USAGE.window}
        </span>
        <div className="h-1.5 w-[90px] flex-none overflow-hidden rounded-[3px] bg-surface/60">
          <div
            aria-hidden="true"
            className="h-full rounded-[3px] bg-cloud-700"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {PROCESSING_LOG.map((item) => (
          <li key={item.id}>
            <Card className="flex flex-col gap-1.5 rounded-[14px] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[13px] leading-none font-semibold">{item.title}</h3>
                <span className="flex-none text-[11px] leading-none font-medium text-neutral-400">
                  {item.at}
                </span>
              </div>
              <p className="text-xs leading-normal text-neutral-600">{item.detail}</p>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  )
}
