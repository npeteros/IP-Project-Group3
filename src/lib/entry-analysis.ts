import type { ApiError } from '@/src/lib/api/client'
import type { Mood } from '@/src/server/entry/schemas'

export const MOOD_LABELS: Record<Mood, string> = {
  CALM: 'Calm',
  GRATEFUL: 'Grateful',
  HAPPY: 'Happy',
  HOPEFUL: 'Hopeful',
  NEUTRAL: 'Neutral',
  ANXIOUS: 'Anxious',
  STRESSED: 'Stressed',
  SAD: 'Sad',
  FRUSTRATED: 'Frustrated',
}

/** What the AI panel shows about the analysis. A failed one never blocks writing or saving. */
export type AnalysisStatus = 'idle' | 'loading' | 'rate-limited' | 'failed'

export function analysisStatus({
  isPending,
  error,
}: {
  isPending: boolean
  error: ApiError | null
}): AnalysisStatus {
  if (isPending) return 'loading'
  if (!error) return 'idle'
  return error.status === 429 ? 'rate-limited' : 'failed'
}

// A new entry is saved on /journal/new but its analysis belongs on /journal/[id], which is a
// different page. The new-entry page queues the id here and the entry page starts the analysis.
// Only the latest entry is kept, and only briefly: an entry whose page never opened (the user went
// elsewhere first) must not start an analysis, and spend AI quota, later in the session.
const QUEUED_ANALYSIS_TTL_MS = 30_000

let queued: { id: string; at: number } | null = null

export function queueEntryAnalysis(id: string) {
  queued = { id, at: Date.now() }
}

/**
 * True once for the queued id, if it was queued within the last 30 seconds, so the analysis
 * starts exactly once. Opening any entry clears the queue.
 */
export function takeQueuedEntryAnalysis(id: string) {
  const entry = queued
  queued = null
  return entry?.id === id && Date.now() - entry.at <= QUEUED_ANALYSIS_TTL_MS
}
