'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { api } from '@/src/lib/api'
import { analysisStatus, takeQueuedEntryAnalysis } from '@/src/lib/entry-analysis'
import { changedEntryFields, toEntryFormValues } from '@/src/lib/entry-form'
import { formatEntryTimestamp } from '@/src/lib/timezone'
import { typography } from '@/src/lib/typography'
import {
  EntryIdSchema,
  EntryUpdateSchema,
  TAGS_PER_ENTRY_MAX,
  normalizeTagName,
  type EntryUpdateOutput,
} from '@/src/server/entry/schemas'
import { EntryAiPanel } from './EntryAiPanel'
import { EntryEditor } from './EntryEditor'
import { ManageTags } from './ManageTags'

const LINK_BUTTON = `rounded-xl bg-neutral-900 px-5 py-3 text-surface hover:text-surface ${typography.label}`

function EntryLoading() {
  return (
    <output className="flex flex-col gap-4 px-6 pt-24 lg:px-14">
      <span className="sr-only">Loading entry…</span>
      <span className="block h-8 w-2/3 max-w-[420px] animate-pulse rounded-lg bg-neutral-100" />
      <span className="block h-4 w-full max-w-[660px] animate-pulse rounded-lg bg-neutral-100" />
      <span className="block h-4 w-full max-w-[600px] animate-pulse rounded-lg bg-neutral-100" />
      <span className="block h-4 w-1/2 max-w-[330px] animate-pulse rounded-lg bg-neutral-100" />
    </output>
  )
}

/** Shown for a missing, deleted or someone else's entry: the API answers 404 for all three. */
function EntryNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className={typography.pageTitle}>Entry not found</h1>
      <p className={`${typography.body} max-w-[360px]`}>
        This entry doesn&rsquo;t exist or has been deleted.
      </p>
      <Link href="/journal" className={LINK_BUTTON}>
        Back to journal
      </Link>
    </div>
  )
}

function EntryLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-24 text-center"
    >
      <h1 className={typography.pageTitle}>Couldn&rsquo;t load this entry</h1>
      <p className={`${typography.body} max-w-[360px]`}>{message}</p>
      <button type="button" onClick={onRetry} className={LINK_BUTTON}>
        Try again
      </button>
    </div>
  )
}

/** `/journal/[id]`: loads the entry, saves only what changed, and deletes it after a confirmation. */
export function EditEntryEditor({ id }: { id: string }) {
  const router = useRouter()
  // An id that isn't a UUID can't exist, so skip the request and show the same not-found state
  const idIsValid = EntryIdSchema.safeParse({ id }).success
  const query = api.entry.findOneEntry.useQuery({ id }, { enabled: idIsValid })
  const updateEntry = api.entry.update.useMutation()
  // Accepting a suggested tag is its own write: it mustn't make the editor read-only, and its
  // failure is reported as a failed accept rather than a failed save
  const acceptSuggestion = api.entry.update.useMutation()
  const deleteEntry = api.entry.delete.useMutation()
  const analyze = api.entry.analyze.useMutation()
  const { mutate: runAnalysis } = analyze
  // Suggestions the user waved away. A new analysis brings new suggestions, so it starts over.
  const [dismissedTags, setDismissedTags] = useState<string[]>([])
  // Autocomplete is a nicety: if the tag list can't load, free-text tags still work
  const tagList = api.tag.list.useQuery()
  const [isNavigating, startNavigation] = useTransition()
  const [now] = useState(() => new Date())

  // Fire and forget: the analysis never blocks writing or saving, and its failure is only a note
  const startAnalysis = useCallback(() => {
    setDismissedTags([])
    runAnalysis({ id })
  }, [id, runAnalysis])

  // An entry that was just created on /journal/new gets its first analysis here. Nothing has been
  // dismissed yet, so unlike `startAnalysis` this has no state to reset.
  useEffect(() => {
    if (takeQueuedEntryAnalysis(id)) runAnalysis({ id })
  }, [id, runAnalysis])

  const entry = query.data
  // The delete invalidates this entry's own query, which then 404s. That mustn't flash the
  // not-found state while the app is still on its way back to the journal.
  const isLeaving = deleteEntry.isPending || deleteEntry.isSuccess || isNavigating

  if (!idIsValid) return <EntryNotFound />
  if (!entry) {
    if (!query.isError) return <EntryLoading />
    if (query.error.status === 404) return <EntryNotFound />
    return <EntryLoadError message={query.error.message} onRetry={() => void query.refetch()} />
  }
  // The entry was deleted elsewhere while this page was open
  if (query.isError && query.error.status === 404 && !isLeaving) return <EntryNotFound />

  const save = async (values: EntryUpdateOutput) => {
    deleteEntry.reset()
    acceptSuggestion.reset()
    const changes = changedEntryFields(values, entry)
    if (!changes) return toEntryFormValues(entry)

    const updated = await updateEntry.mutateAsync({ id: entry.id, ...changes })
    // Tags and other fields don't change what the entry says, so only text edits are re-analyzed
    if (changes.title !== undefined || changes.body !== undefined) startAnalysis()
    return toEntryFormValues(updated)
  }

  const remove = () => {
    updateEntry.reset()
    acceptSuggestion.reset()
    deleteEntry.mutate(
      { id: entry.id },
      { onSuccess: () => startNavigation(() => router.push('/journal')) },
    )
  }

  return (
    <EntryEditor
      key={entry.id}
      schema={EntryUpdateSchema}
      dateLabel={formatEntryTimestamp(new Date(entry.writtenAt), now)}
      initial={toEntryFormValues(entry)}
      tagSuggestions={tagList.data?.tags.map((tag) => tag.name)}
      onSave={save}
      onDelete={remove}
      aiPanel={(editor) => {
        const mentions = (names: string[], name: string) =>
          names.some((existing) => normalizeTagName(existing) === normalizeTagName(name))
        const savedTags = entry.tags.map((tag) => tag.name)
        // Accepting saves the tag now (as AI_SUGGESTED) rather than waiting for the next Save. It
        // sends the saved tags plus the suggestion, so tag edits the user hasn't saved stay unsaved.
        const acceptTag = async (name: string) => {
          updateEntry.reset()
          deleteEntry.reset()
          try {
            const saved = await acceptSuggestion.mutateAsync({
              id: entry.id,
              tags: [...savedTags, name],
              aiSuggestedTags: [name],
            })
            editor.tagAccepted(
              saved.tags.map((tag) => tag.name),
              name,
            )
          } catch {
            // Reported through `error`; the suggestion stays on offer
          }
        }
        // Accepting would go over the limit, which the server always rejects
        const atTagLimit =
          savedTags.length >= TAGS_PER_ENTRY_MAX || editor.tags.length >= TAGS_PER_ENTRY_MAX

        return (
          <EntryAiPanel
            conversationId={entry.id}
            draft={editor.draft}
            analysis={{
              // The fresh result wins until the refetched entry catches up
              mood: analyze.data?.mood ?? entry.mood,
              summary: analyze.data?.summary ?? entry.summary,
              status: analysisStatus(analyze),
              onAnalyze: startAnalysis,
              suggestions: atTagLimit
                ? []
                : (analyze.data?.suggestedTags ?? []).filter(
                    (name) => !mentions(dismissedTags, name) && !mentions(editor.tags, name),
                  ),
              acceptingTag: acceptSuggestion.isPending
                ? (acceptSuggestion.variables?.aiSuggestedTags?.[0] ?? null)
                : null,
              // A Save and an accept send different tag sets, so only one may be in flight
              suggestionsLocked: updateEntry.isPending || acceptSuggestion.isPending,
              onAcceptTag: acceptTag,
              onDismissTag: (name) => setDismissedTags((current) => [...current, name]),
            }}
          />
        )
      }}
      manageTags={(editor) => (
        <ManageTags onRenamed={editor.tagRenamed} onDeleted={editor.tagDeleted} />
      )}
      isSaving={updateEntry.isPending}
      isDeleting={isLeaving}
      canSave={!acceptSuggestion.isPending}
      error={
        deleteEntry.error?.message ??
        updateEntry.error?.message ??
        (acceptSuggestion.error && acceptSuggestion.variables?.aiSuggestedTags
          ? `Couldn’t add “${acceptSuggestion.variables.aiSuggestedTags[0]}”: ${acceptSuggestion.error.message}`
          : null)
      }
    />
  )
}
