'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { EntryAnalysis } from '@/src/lib/placeholders/editor'
import {
  normalizeTagName,
  TAG_NAME_MAX_LENGTH,
  TAGS_PER_ENTRY_MAX,
} from '@/src/server/entry/schemas'
import { typography } from '@/src/lib/typography'
import { Icon } from './Icon'
import { SectionLabel } from './ui'

type Draft = { title: string; body: string; tags: string[] }

const EMPTY_DRAFT: Draft = { title: '', body: '', tags: [] }

function hasTag(tags: string[], name: string) {
  const key = normalizeTagName(name)
  return tags.some((tag) => normalizeTagName(tag) === key)
}

function MoodChip({ mood }: { mood: string }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-sage-100 px-2.5 py-[5px] text-[11px] leading-none font-semibold text-sage-700">
      {mood} mood detected
    </span>
  )
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')

  function commit() {
    const name = value.trim()
    if (name && !hasTag(tags, name)) onChange([...tags, name])
    setValue('')
    setAdding(false)
  }

  return (
    <ul className="flex flex-wrap items-center gap-2.5" aria-label="Tags">
      {tags.map((tag) => (
        <li
          key={tag}
          className="group flex items-center gap-1 rounded-full bg-neutral-100 py-[7px] pr-2 pl-3.5 text-[13px] leading-none font-medium text-neutral-600"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="rounded-full p-0.5 text-neutral-400 hover:text-neutral-900"
          >
            <Icon name="close" size={12} strokeWidth={2.4} />
          </button>
        </li>
      ))}
      {tags.length < TAGS_PER_ENTRY_MAX && (
        <li>
          {adding ? (
            <input
              // Focus the field the moment the user asks to add a tag.
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              aria-label="New tag"
              value={value}
              maxLength={TAG_NAME_MAX_LENGTH}
              onChange={(event) => setValue(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commit()
                }
                if (event.key === 'Escape') {
                  setValue('')
                  setAdding(false)
                }
              }}
              className="h-[29px] w-36 rounded-full border border-neutral-400 bg-surface px-3.5 text-[13px] text-neutral-900 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-[7px] text-[13px] leading-none font-semibold text-neutral-600 hover:text-neutral-900"
            >
              <Icon name="plus" size={13} strokeWidth={2.4} />
              Add tag
            </button>
          )}
        </li>
      )}
    </ul>
  )
}

function CompanionCard({
  prompt,
  onAdd,
  onDismiss,
}: {
  prompt: string
  onAdd: () => void
  onDismiss: () => void
}) {
  return (
    <section
      aria-label="Moodiary companion"
      className="flex flex-col gap-2.5 rounded-2xl border border-cloud-200 bg-surface p-4 shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-[22px] flex-none items-center justify-center rounded-full bg-cloud-100 text-cloud-700">
          <Icon name="cloud" size={12} strokeWidth={2.4} />
        </span>
        <span className="text-xs leading-none font-semibold text-neutral-400">
          Moodiary companion
        </span>
      </div>
      <p className="font-serif text-[15px] leading-normal font-medium">{prompt}</p>
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Add to entry', onClick: onAdd },
          { label: 'Not now', onClick: onDismiss },
        ].map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="rounded-full border border-neutral-200 px-3.5 py-[7px] text-xs leading-none font-medium text-neutral-600 hover:text-neutral-900"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function AnalysisPanel({
  analysis,
  tags,
  onAddTag,
}: {
  analysis: EntryAnalysis
  tags: string[]
  onAddTag: (tag: string) => void
}) {
  const suggestions = analysis.suggestedTags.filter((tag) => !hasTag(tags, tag))

  return (
    <>
      <div className="flex flex-col gap-2.5 rounded-[14px] border border-neutral-200 bg-surface p-4">
        <div className="hidden lg:block">
          <MoodChip mood={analysis.mood} />
        </div>
        {suggestions.length > 0 && (
          <>
            <h3 className="text-xs leading-none font-semibold tracking-[0.04em] text-neutral-400 uppercase lg:mt-1">
              Suggested tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onAddTag(tag)}
                  aria-label={`Add suggested tag ${tag}`}
                  className="flex items-center gap-[5px] rounded-full border-[1.5px] border-dashed border-sage-200 px-[11px] py-1.5 text-xs leading-none font-semibold text-sage-700 hover:border-sage-500"
                >
                  <Icon name="plus" size={11} strokeWidth={2.5} />
                  {tag}
                </button>
              ))}
            </div>
          </>
        )}
        {suggestions.length === 0 && (
          <p className={`${typography.bodySmall} lg:mt-1`}>All suggested tags added.</p>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-[14px] border border-neutral-200 bg-surface p-4">
        <h3 className="text-[13px] leading-none font-semibold">Summary</h3>
        <ul className="flex flex-col gap-1.5 text-[13px] leading-normal text-neutral-600">
          {analysis.summary.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden="true" className="text-sage-700">
                •
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

/**
 * Entry editor with the "For this entry" AI panel. Placeholder only: Save isn't wired to the
 * entries API yet, so edits stay in local state.
 */
export function EntryEditor({
  dateLabel,
  initial = EMPTY_DRAFT,
  analysis,
}: {
  dateLabel: string
  initial?: Draft
  /** AI tagging, summary and companion prompt. Absent for a brand-new entry. */
  analysis?: EntryAnalysis
}) {
  const [draft, setDraft] = useState(initial)
  const [showCompanion, setShowCompanion] = useState(Boolean(analysis?.companionPrompt))
  const [status, setStatus] = useState<string | null>(null)

  const update = (patch: Partial<Draft>) => {
    setStatus(null)
    setDraft((current) => ({ ...current, ...patch }))
  }

  function addCompanionPrompt() {
    if (!analysis) return
    const separator = draft.body.trim() ? '\n\n' : ''
    update({ body: `${draft.body.trimEnd()}${separator}${analysis.companionPrompt}\n` })
    setShowCompanion(false)
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-16 flex-none items-center gap-4 px-5 lg:h-auto lg:px-14 lg:pt-8">
        <span className={`${typography.caption} hidden text-[13px] lg:mr-auto lg:block`}>
          {dateLabel}
        </span>
        <Link
          href="/journal"
          className="mr-auto text-[15px] leading-none font-medium text-neutral-400 hover:text-neutral-600 lg:mr-0 lg:text-sm"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() =>
            setStatus('Saving isn’t connected yet — this editor uses placeholder data.')
          }
          className="text-[15px] leading-none font-bold text-neutral-900 lg:rounded-[11px] lg:bg-neutral-900 lg:px-[22px] lg:py-2.5 lg:text-sm lg:font-semibold lg:text-surface lg:hover:bg-neutral-900/90"
        >
          <span className="lg:hidden">Done</span>
          <span className="hidden lg:inline">Save</span>
        </button>
      </header>

      {status && (
        <output className="block mx-5 rounded-[10px] bg-amber-100 px-3.5 py-2.5 text-[13px] leading-[1.4] font-medium text-amber-700 lg:mx-14 lg:mt-4">
          {status}
        </output>
      )}

      <div className="flex flex-1 flex-col gap-8 px-6 pt-2 pb-24 lg:flex-row lg:gap-12 lg:px-14 lg:pt-6 lg:pb-12">
        <div className="flex max-w-[660px] min-w-0 flex-1 flex-col gap-3.5 lg:gap-[18px]">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <span className={`${typography.caption} text-xs`}>{dateLabel}</span>
            {analysis && <MoodChip mood={analysis.mood} />}
          </div>

          <input
            aria-label="Title"
            placeholder="Untitled"
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
            className="w-full bg-transparent font-serif text-[22px] leading-[1.3] font-medium outline-none placeholder:text-neutral-300 lg:text-[30px]"
          />

          <textarea
            aria-label="Entry"
            placeholder="How are you feeling today?"
            value={draft.body}
            onChange={(event) => update({ body: event.target.value })}
            className="min-h-[180px] w-full resize-none bg-transparent text-[15px] leading-[1.7] outline-none [field-sizing:content] placeholder:text-neutral-400 lg:min-h-[240px] lg:text-[17px] lg:leading-[1.8]"
          />

          <div className="lg:mt-1.5">
            <TagEditor tags={draft.tags} onChange={(tags) => update({ tags })} />
          </div>
        </div>

        <aside
          aria-label="For this entry"
          className="flex w-full flex-none flex-col gap-4 lg:w-[300px]"
        >
          <SectionLabel>For this entry</SectionLabel>
          {analysis ? (
            <AnalysisPanel
              analysis={analysis}
              tags={draft.tags}
              onAddTag={(tag) => update({ tags: [...draft.tags, tag] })}
            />
          ) : (
            <p className="rounded-[14px] border border-dashed border-neutral-200 p-4 text-[13px] leading-normal text-neutral-600">
              Once you&rsquo;ve written a few lines, Moodiary detects the mood, suggests tags and
              summarizes the entry here.
            </p>
          )}
          {analysis && showCompanion && (
            <CompanionCard
              prompt={analysis.companionPrompt}
              onAdd={addCompanionPrompt}
              onDismiss={() => setShowCompanion(false)}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
