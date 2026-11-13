import type { Metadata } from 'next'
import { EditEntryEditor } from '@/components/EditEntryEditor'
import { APP_NAME } from '@/src/lib/constants'

export const metadata: Metadata = {
  title: `Entry · ${APP_NAME}`,
}

export default async function EntryPage(props: PageProps<'/journal/[id]'>) {
  const { id } = await props.params

  // Keyed by id so moving between entries starts a fresh form
  return <EditEntryEditor key={id} id={id} />
}
