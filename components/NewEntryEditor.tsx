'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { api } from '@/src/lib/api'
import { toEntryFormValues } from '@/src/lib/entry-form'
import { EntryCreateSchema, type EntryCreateOutput } from '@/src/server/entry/schemas'
import { EntryEditor } from './EntryEditor'

/** `/journal/new`: creates the entry, then opens it at `/journal/[id]`. */
export function NewEntryEditor({ dateLabel }: { dateLabel: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const createEntry = api.entry.create.useMutation()
  // Autocomplete is a nicety: if the tag list can't load, free-text tags still work
  const tagList = api.tag.list.useQuery()
  // Keeps Save disabled until the entry page is up, so a second click can't create a duplicate
  const [isNavigating, startNavigation] = useTransition()

  const save = async (values: EntryCreateOutput) => {
    const entry = await createEntry.mutateAsync(values)
    // Seed the entry page's query so it opens without a loading state
    queryClient.setQueryData(api.entry.findOneEntry.queryKey({ id: entry.id }), entry)
    startNavigation(() => router.push(`/journal/${entry.id}`))
    return toEntryFormValues(entry)
  }

  return (
    <EntryEditor
      schema={EntryCreateSchema}
      dateLabel={dateLabel}
      tagSuggestions={tagList.data?.tags.map((tag) => tag.name)}
      onSave={save}
      isSaving={createEntry.isPending || isNavigating}
      error={createEntry.error?.message ?? null}
    />
  )
}
