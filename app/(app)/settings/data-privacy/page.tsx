import type { Metadata } from 'next'
import Link from 'next/link'
import { RadioList } from '@/components/controls'
import { Icon } from '@/components/Icon'
import { DeleteAllData, ExportCard } from '@/components/settings'
import { SectionLabel } from '@/components/ui'
import { APP_NAME } from '@/src/lib/constants'
import { PROCESSING_LOG, RETENTION_OPTIONS } from '@/src/lib/placeholders/settings'
import { typography } from '@/src/lib/typography'

export const metadata: Metadata = {
  title: `Data & privacy · ${APP_NAME}`,
}

const LOG_PREVIEW_COUNT = 2

export default function DataPrivacyPage() {
  return (
    <div className="flex max-w-[732px] flex-col gap-6 pt-2 lg:pt-0">
      <h2 className={typography.sectionTitle}>Data &amp; privacy</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-5">
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Export your journal</SectionLabel>
          <ExportCard />
        </section>

        <section className="flex flex-col gap-2.5">
          <SectionLabel>Right to forget</SectionLabel>
          <RadioList label="Automatic deletion" options={[...RETENTION_OPTIONS]} />
          <p className="px-1 text-xs leading-normal text-neutral-400">
            Automatically and permanently delete entries after a set period. This can&rsquo;t be
            undone.
          </p>
        </section>
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Processing log</SectionLabel>
          <Link
            href="/settings/data-privacy/processing-log"
            className="text-[13px] leading-none font-semibold"
          >
            View full log →
          </Link>
        </div>
        <ul className="divide-y divide-neutral-200 rounded-[14px] border border-neutral-200 bg-surface shadow-sm">
          {PROCESSING_LOG.slice(0, LOG_PREVIEW_COUNT).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-[18px] py-3.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon name="cloud" size={15} className="flex-none text-cloud-700" />
                <span className="truncate text-[13px] leading-none font-medium">{item.title}</span>
              </span>
              <span className="flex-none text-xs leading-none font-medium text-neutral-400">
                {item.at}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <DeleteAllData />
    </div>
  )
}
