import type { Metadata } from 'next'
import { EntryEditor } from '@/components/EntryEditor'
import { APP_NAME, NEW_ENTRY_LABEL } from '@/src/lib/constants'
import { formatTodayTimestamp } from '@/src/lib/timezone'

export const metadata: Metadata = {
  title: `${NEW_ENTRY_LABEL} · ${APP_NAME}`,
}

// Read the clock outside render; this page is rendered per request (the app layout checks the session).
function nowLabel() {
  return formatTodayTimestamp(new Date())
}

export default function NewEntryPage() {
  return <EntryEditor dateLabel={nowLabel()} />
}
