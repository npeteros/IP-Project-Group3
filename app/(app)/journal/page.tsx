import { Icon } from "@/components/Icon";
import { EntryCard, FilterChip, StreakBadge } from "@/components/ui";
import { JOURNAL_ENTRIES, JOURNAL_FILTERS, NEW_ENTRY_LABEL, SEARCH_PLACEHOLDER } from "@/lib/constants";
import { typography } from "@/lib/typography";
 
export default function JournalPage() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-7 pb-24 md:px-10 lg:gap-6 lg:px-14 lg:pt-12 lg:pb-12">
      <header className="flex items-center justify-between gap-4 md:items-end">
        <h1 className={typography.pageTitle}>Journal</h1>
 
        <div className="lg:hidden">
          <StreakBadge compact />
        </div>
 
        <label className="hidden h-[42px] w-[280px] items-center gap-2 rounded-[11px] border border-neutral-200 bg-surface px-3.5 text-neutral-400 lg:flex">
          <Icon name="search" size={15} />
          <input
            type="search"
            placeholder={SEARCH_PLACEHOLDER}
            className="w-full bg-transparent text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400"
          />
        </label>
      </header>
 
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0 lg:gap-2.5">
        {JOURNAL_FILTERS.map((filter, index) => (
          <FilterChip key={filter} label={filter} active={index === 0} />
        ))}
      </div>
 
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
        {JOURNAL_ENTRIES.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
 
      <button
        type="button"
        aria-label={NEW_ENTRY_LABEL}
        className="fixed right-5 bottom-24 flex size-14 items-center justify-center rounded-[18px] bg-neutral-900 text-surface shadow-md lg:hidden"
      >
        <Icon name="plus" size={22} strokeWidth={2.2} />
      </button>
    </div>
  );
}