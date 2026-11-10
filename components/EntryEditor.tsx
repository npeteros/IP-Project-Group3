'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import type { z } from 'zod'
import { EMPTY_ENTRY_FORM, type EntryFormValues } from '@/src/lib/entry-form'
import type { EntryAnalysis } from '@/src/lib/placeholders/editor'
import { typography } from '@/src/lib/typography'
import { useUnsavedChangesWarning } from '@/src/lib/use-unsaved-changes-warning'
import {
  normalizeTagName,
  type EntryCreateSchema,
  type EntryUpdateSchema,
} from '@/src/server/entry/schemas'
import { Icon } from './Icon'
import { SectionLabel } from './ui'

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

function TagEditor({
  tags,
  onChange,
  suggestions = [],
  disabled = false,
  errorId,
  invalid = false,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  /** Existing tag names offered while typing. */
  suggestions?: string[]
  disabled?: boolean
  errorId?: string
  invalid?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const listId = useId()
  const offered = suggestions.filter((name) => !hasTag(tags, name))

  // The schema is the only place tag limits live, so a too-long name or a 21st tag is added here
  // and the form's inline error says why it can't be saved.
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
          className="group flex max-w-full items-center gap-1 rounded-full bg-neutral-100 py-[7px] pr-2 pl-3.5 text-[13px] leading-none font-medium break-all text-neutral-600"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            disabled={disabled}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="rounded-full p-0.5 text-neutral-400 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="close" size={12} strokeWidth={2.4} />
          </button>
        </li>
      ))}
      <li>
        {adding ? (
          <>
            <input
              // Focus the field the moment the user asks to add a tag.
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              aria-label="New tag"
              aria-invalid={invalid}
              aria-describedby={errorId}
              list={offered.length > 0 ? listId : undefined}
              value={value}
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
            <datalist id={listId}>
              {offered.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </datalist>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-[7px] text-[13px] leading-none font-semibold text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="plus" size={13} strokeWidth={2.4} />
            Add tag
          </button>
        )}
      </li>
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

type EntrySchema = typeof EntryCreateSchema | typeof EntryUpdateSchema

type EntryEditorProps<S extends EntrySchema> = {
  /** `EntryCreateSchema` for a new entry, `EntryUpdateSchema` for an existing one. */
  schema: S
  dateLabel: string
  initial?: EntryFormValues
  /** AI tagging, summary and companion prompt. Absent for a brand-new entry. */
  analysis?: EntryAnalysis
  /** Existing tag names offered while typing a tag. */
  tagSuggestions?: string[]
  /**
   * Called with the values the schema parsed. Resolve with the saved values to reset the form to
   * them (so it stops counting as unsaved). A rejection is swallowed here: report it via `error`.
   */
  onSave: (values: z.output<S>) => Promise<EntryFormValues | void>
  /** Shows a Delete button, behind a confirmation, when given. */
  onDelete?: () => void
  isSaving?: boolean
  isDeleting?: boolean
  /** The last save or delete failure, shown above the entry. */
  error?: string | null
}

/** The first message on a tags error, which is either the list's own or one tag's. */
function tagsErrorMessage(error: unknown): string | undefined {
  const { message } = (error ?? {}) as { message?: string }
  if (message) return message
  return Array.from((error ?? []) as ArrayLike<{ message?: string } | undefined>).find(
    (item) => item?.message,
  )?.message
}

const ERROR_TEXT = 'text-xs leading-[1.4] font-medium text-amber-700'

/**
 * Entry editor with the "For this entry" AI panel. A react-hook-form form validated by the
 * shared entry schema it's given, so every message shown inline comes from `schemas.ts`. It owns
 * the form state and knows nothing about the API: callers do the saving through `onSave` and
 * `onDelete`.
 */
export function EntryEditor<S extends EntrySchema>({
  schema,
  dateLabel,
  initial = EMPTY_ENTRY_FORM,
  analysis,
  tagSuggestions,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  error = null,
}: EntryEditorProps<S>) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<EntryFormValues, unknown, z.output<S>>({
    // Both entry schemas accept `EntryFormValues` but type their input differently (the update
    // fields are optional), so the resolver is narrowed to the form's own shape here.
    resolver: zodResolver(schema) as unknown as Resolver<EntryFormValues, unknown, z.output<S>>,
    defaultValues: initial,
  })
  const tags = useWatch({ control, name: 'tags' })
  const [showCompanion, setShowCompanion] = useState(Boolean(analysis?.companionPrompt))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const keepEntryRef = useRef<HTMLButtonElement>(null)
  const busy = isSaving || isDeleting
  const tagsError = tagsErrorMessage(errors.tags)

  useUnsavedChangesWarning(isDirty && !isDeleting)

  // Put focus on the safe choice when the confirmation appears
  useEffect(() => {
    if (confirmingDelete) keepEntryRef.current?.focus()
  }, [confirmingDelete])

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await onSave(values)
      if (saved) reset(saved)
    } catch {
      // The caller reports the failure through `error`; the form keeps the user's edits
    }
  })

  const setTags = (next: string[]) =>
    setValue('tags', next, { shouldDirty: true, shouldValidate: true })

  function addCompanionPrompt() {
    if (!analysis) return
    const body = getValues('body')
    const separator = body.trim() ? '\n\n' : ''
    setValue('body', `${body.trimEnd()}${separator}${analysis.companionPrompt}\n`, {
      shouldDirty: true,
    })
    setShowCompanion(false)
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-full flex-col">
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
        {onDelete && !confirmingDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
            className="text-[15px] leading-none font-medium text-amber-700 hover:text-amber-700/80 disabled:cursor-not-allowed disabled:opacity-60 lg:text-sm"
          >
            Delete
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          aria-busy={isSaving}
          className="text-[15px] leading-none font-bold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-[11px] lg:bg-neutral-900 lg:px-[22px] lg:py-2.5 lg:text-sm lg:font-semibold lg:text-surface lg:hover:bg-neutral-900/90"
        >
          {isSaving ? (
            'Saving…'
          ) : (
            <>
              <span className="lg:hidden">Done</span>
              <span className="hidden lg:inline">Save</span>
            </>
          )}
        </button>
      </header>

      {onDelete && confirmingDelete && (
        <section
          aria-label="Confirm delete"
          className="mx-5 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-amber-500 px-3.5 py-2.5 lg:mx-14 lg:mt-4"
        >
          <span className="text-[13px] font-medium">
            Delete this entry? It will be removed from your journal.
          </span>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onDelete}
            className="h-9 rounded-[10px] bg-amber-700 px-4 text-[13px] leading-none font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            ref={keepEntryRef}
            type="button"
            disabled={isDeleting}
            onClick={() => setConfirmingDelete(false)}
            className="h-9 rounded-[10px] px-3 text-[13px] leading-none font-semibold text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Keep entry
          </button>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="mx-5 block rounded-[10px] bg-amber-100 px-3.5 py-2.5 text-[13px] leading-[1.4] font-medium text-amber-700 lg:mx-14 lg:mt-4"
        >
          {error}
        </div>
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
            readOnly={busy}
            {...register('title')}
            onKeyDown={(event) => {
              // Enter moves on to the entry instead of submitting the form
              if (event.key === 'Enter') {
                event.preventDefault()
                setFocus('body')
              }
            }}
            className="w-full bg-transparent font-serif text-[22px] leading-[1.3] font-medium outline-none placeholder:text-neutral-300 lg:text-[30px]"
          />

          <div className="flex flex-col gap-2">
            <textarea
              aria-label="Entry"
              placeholder="How are you feeling today?"
              readOnly={busy}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={errors.body ? 'entry-body-error' : undefined}
              {...register('body')}
              className="min-h-[96px] w-full resize-none bg-transparent text-[15px] leading-[1.7] outline-none [field-sizing:content] placeholder:text-neutral-400 lg:min-h-[120px] lg:text-[17px] lg:leading-[1.8]"
            />
            {errors.body && (
              <p id="entry-body-error" role="alert" className={ERROR_TEXT}>
                {errors.body.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:mt-1.5">
            <TagEditor
              tags={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              disabled={busy}
              invalid={Boolean(tagsError)}
              errorId={tagsError ? 'entry-tags-error' : undefined}
            />
            {tagsError && (
              <p id="entry-tags-error" role="alert" className={ERROR_TEXT}>
                {tagsError}
              </p>
            )}
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
              tags={tags}
              onAddTag={(tag) => setTags([...tags, tag])}
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
    </form>
  )
}
