'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { api } from '@/src/lib/api'
import { changedEntryFields, toEntryFormValues } from '@/src/lib/entry-form'
import { formatEntryTimestamp } from '@/src/lib/timezone'
import { typography } from '@/src/lib/typography'
import {
  EntryIdSchema,
  EntryUpdateSchema,
  type EntryUpdateOutput,
} from '@/src/server/entry/schemas'
import { EntryEditor } from './EntryEditor'

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
  const deleteEntry = api.entry.delete.useMutation()
  // Autocomplete is a nicety: if the tag list can't load, free-text tags still work
  const tagList = api.tag.list.useQuery()
  const [isNavigating, startNavigation] = useTransition()
  const [now] = useState(() => new Date())

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
    const changes = changedEntryFields(values, entry)
    if (!changes) return toEntryFormValues(entry)

    const updated = await updateEntry.mutateAsync({ id: entry.id, ...changes })
    return toEntryFormValues(updated)
  }

  const remove = () => {
    updateEntry.reset()
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
      isSaving={updateEntry.isPending}
      isDeleting={isLeaving}
      error={deleteEntry.error?.message ?? updateEntry.error?.message ?? null}
    />
  )
}
