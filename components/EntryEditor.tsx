'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import type { z } from 'zod'
import { EMPTY_ENTRY_FORM, type EntryFormValues } from '@/src/lib/entry-form'
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

type EntrySchema = typeof EntryCreateSchema | typeof EntryUpdateSchema

/** What the panels beside the form can read from the form, and the ways they can change it. */
export type EntryEditorContext = {
  /** The title and body as typed right now, including edits that aren't saved yet. */
  draft: { title: string; body: string }
  /** The tags as the form shows them right now. */
  tags: string[]
  /** Makes `names` the saved tag set: the form shows them and no longer counts them as edited. */
  setSavedTags: (names: string[]) => void
  /** A tag was renamed elsewhere. The form follows it without counting that as an edit. */
  tagRenamed: (from: string, to: string) => void
  /** A tag was deleted elsewhere. The form drops it without counting that as an edit. */
  tagDeleted: (name: string) => void
}

type EntryEditorProps<S extends EntrySchema> = {
  /** `EntryCreateSchema` for a new entry, `EntryUpdateSchema` for an existing one. */
  schema: S
  dateLabel: string
  initial?: EntryFormValues
  /** Existing tag names offered while typing a tag. */
  tagSuggestions?: string[]
  /** The "For this entry" panel: mood, summary, suggested tags and the Companion. */
  aiPanel?: (context: EntryEditorContext) => ReactNode
  /** The tag manager shown under the tags. */
  manageTags?: (context: EntryEditorContext) => ReactNode
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
 * Entry editor. A react-hook-form form validated by the shared entry schema it's given, so every
 * message shown inline comes from `schemas.ts`. It owns the form state and knows nothing about
 * the API: callers do the saving through `onSave` and `onDelete`, and fill the AI panel and the
 * tag manager through `aiPanel` and `manageTags`.
 *
 * The `<form>` wraps only the title, body and tags, and the Save button points at it with the
 * `form` attribute. That keeps the panels, which have forms and inputs of their own, outside it:
 * nested forms are invalid, and Enter in one of their fields must not submit the entry.
 */
export function EntryEditor<S extends EntrySchema>({
  schema,
  dateLabel,
  initial = EMPTY_ENTRY_FORM,
  tagSuggestions,
  aiPanel,
  manageTags,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  error = null,
}: EntryEditorProps<S>) {
  const formId = useId()
  const {
    register,
    control,
    handleSubmit,
    reset,
    resetField,
    setValue,
    getValues,
    setFocus,
    formState: { errors, isDirty, defaultValues },
  } = useForm<EntryFormValues, unknown, z.output<S>>({
    // Both entry schemas accept `EntryFormValues` but type their input differently (the update
    // fields are optional), so the resolver is narrowed to the form's own shape here.
    resolver: zodResolver(schema) as unknown as Resolver<EntryFormValues, unknown, z.output<S>>,
    defaultValues: initial,
  })
  // Tags have no input of their own (the tag editor calls `setValue`), so register the field
  // explicitly: `resetField`, which the panels rely on, ignores fields the form doesn't know.
  // This runs on every render because `reset` (after each save) unregisters all fields, and
  // the inputs' own `register` calls are what bring theirs back.
  register('tags')
  const tags = useWatch({ control, name: 'tags' })
  const [title, body] = useWatch({ control, name: ['title', 'body'] })
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

  /**
   * Applies `change` to both the saved tags and the ones on screen, so a tag renamed or deleted
   * elsewhere shows up here without making the form look edited (or hiding edits made before).
   */
  function followTagChange(change: (names: string[]) => string[]) {
    const saved = (defaultValues?.tags ?? []).filter((name): name is string => name !== undefined)
    // Read what's on screen first: `resetField` replaces it with the saved tags
    const shown = change(getValues('tags'))
    resetField('tags', { defaultValue: change(saved) })
    setValue('tags', shown, { shouldDirty: true })
  }

  const context: EntryEditorContext = {
    draft: { title: title ?? '', body: body ?? '' },
    tags,
    setSavedTags: (names) => resetField('tags', { defaultValue: names }),
    tagRenamed: (from, to) =>
      followTagChange((names) =>
        names.map((name) => (normalizeTagName(name) === normalizeTagName(from) ? to : name)),
      ),
    tagDeleted: (name) =>
      followTagChange((names) =>
        names.filter((existing) => normalizeTagName(existing) !== normalizeTagName(name)),
      ),
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
          form={formId}
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
          <div className="lg:hidden">
            <span className={`${typography.caption} text-xs`}>{dateLabel}</span>
          </div>

          <form
            id={formId}
            onSubmit={submit}
            noValidate
            className="flex flex-col gap-3.5 lg:gap-[18px]"
          >
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
          </form>

          {manageTags?.(context)}
        </div>

        <aside
          aria-label="For this entry"
          className="flex w-full flex-none flex-col gap-4 lg:w-[300px]"
        >
          <SectionLabel>For this entry</SectionLabel>
          {aiPanel?.(context)}
        </aside>
      </div>
    </div>
  )
}
