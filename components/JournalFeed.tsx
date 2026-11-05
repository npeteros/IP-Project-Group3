'use client'

import { useDeferredValue, useState } from 'react'
import { SEARCH_PLACEHOLDER } from '@/src/lib/constants'
import type { JournalEntry } from '@/src/lib/placeholders/journal'
import { typography } from '@/src/lib/typography'
import { Icon } from './Icon'
import { EntryCard, FilterChip, StreakBadge } from './ui'

const ALL = 'All'

function matches(entry: JournalEntry, filter: string, query: string) {
  if (filter !== ALL && !entry.tags.includes(filter)) return false
  if (!query) return true
  const haystack = `${entry.title} ${entry.excerpt} ${entry.tags.join(' ')}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}

/** Journal header, tag filters, search and entry grid. Filters the entries it's given. */
export function JournalFeed({ entries, filters }: { entries: JournalEntry[]; filters: string[] }) {
  const [filter, setFilter] = useState(ALL)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const visible = entries.filter((entry) => matches(entry, filter, deferredQuery))

  return (
    <>
      <header className="flex items-center justify-between gap-4 md:items-end">
        <h1 className={typography.pageTitle}>Journal</h1>

        <div className="lg:hidden">
          <StreakBadge compact />
        </div>

        <label className="hidden h-[42px] w-[280px] items-center gap-2 rounded-[11px] border border-neutral-200 bg-surface px-3.5 text-neutral-400 focus-within:border-neutral-400 lg:flex">
          <Icon name="search" size={15} />
          <span className="sr-only">{SEARCH_PLACEHOLDER}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            className="w-full bg-transparent text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400"
          />
        </label>
      </header>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0 lg:gap-2.5">
        {[ALL, ...filters.filter((f) => f !== ALL)].map((label) => (
          <FilterChip
            key={label}
            label={label}
            active={label === filter}
            onClick={() => setFilter(label)}
          />
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
          {visible.map((entry) => (
            <EntryCard key={entry.id} entry={entry} href={`/journal/${entry.id}`} />
          ))}
        </div>
      ) : (
        <p className={`${typography.body} py-12 text-center`}>No entries match.</p>
      )}
    </>
  )
}
