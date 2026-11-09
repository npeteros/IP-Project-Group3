import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { JournalFeed } from '@/components/JournalFeed'
import { NEW_ENTRY_HREF, NEW_ENTRY_LABEL } from '@/src/lib/constants'
import { JOURNAL_ENTRIES, JOURNAL_FILTERS } from '@/src/lib/placeholders/journal'

export default function JournalPage() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-7 pb-24 md:px-10 lg:gap-6 lg:px-14 lg:pt-12 lg:pb-12">
      <JournalFeed entries={JOURNAL_ENTRIES} filters={JOURNAL_FILTERS} />

      <Link
        href={NEW_ENTRY_HREF}
        aria-label={NEW_ENTRY_LABEL}
        className="fixed right-5 bottom-24 flex size-14 items-center justify-center rounded-[18px] bg-neutral-900 text-surface shadow-md hover:text-surface lg:hidden"
      >
        <Icon name="plus" size={22} strokeWidth={2.2} />
      </Link>
    </div>
  )
}
