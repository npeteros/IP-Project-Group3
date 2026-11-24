'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { api } from '@/src/lib/api'
import { NEW_ENTRY_CONVERSATION, moveConversation } from '@/src/lib/chat/companionConversations'
import { queueEntryAnalysis } from '@/src/lib/entry-analysis'
import { toEntryFormValues } from '@/src/lib/entry-form'
import { EntryCreateSchema, type EntryCreateOutput } from '@/src/server/entry/schemas'
import { EntryAiPanel } from './EntryAiPanel'
import { EntryEditor } from './EntryEditor'
import { ManageTags } from './ManageTags'

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
    // The entry page picks this up and starts the analysis there
    queueEntryAnalysis(entry.id)
    // The Companion conversation carries on with the entry instead of starting over
    moveConversation(NEW_ENTRY_CONVERSATION, entry.id)
    startNavigation(() => router.push(`/journal/${entry.id}`))
    return toEntryFormValues(entry)
  }

  return (
    <EntryEditor
      schema={EntryCreateSchema}
      dateLabel={dateLabel}
      tagSuggestions={tagList.data?.tags.map((tag) => tag.name)}
      onSave={save}
      // Nothing to analyze until it's saved, but the Companion can already talk about the draft
      aiPanel={(editor) => (
        <EntryAiPanel conversationId={NEW_ENTRY_CONVERSATION} draft={editor.draft} />
      )}
      manageTags={(editor) => (
        <ManageTags onRenamed={editor.tagRenamed} onDeleted={editor.tagDeleted} />
      )}
      isSaving={createEntry.isPending || isNavigating}
      error={createEntry.error?.message ?? null}
    />
  )
}
