import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EntryEditor } from '@/components/EntryEditor'
import { APP_NAME } from '@/src/lib/constants'
import { getPlaceholderEntry } from '@/src/lib/placeholders/editor'

export async function generateMetadata(props: PageProps<'/journal/[id]'>): Promise<Metadata> {
  const { id } = await props.params
  const entry = getPlaceholderEntry(id)
  return { title: entry ? `${entry.title} · ${APP_NAME}` : APP_NAME }
}

export default async function EntryPage(props: PageProps<'/journal/[id]'>) {
  const { id } = await props.params
  const entry = getPlaceholderEntry(id)
  if (!entry) notFound()

  return (
    <EntryEditor
      key={entry.id}
      dateLabel={entry.dateLabel}
      initial={{ title: entry.title, body: entry.body, tags: entry.tags }}
      analysis={entry.analysis}
    />
  )
}
