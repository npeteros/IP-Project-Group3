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
const queued = new Set<string>()

export function queueEntryAnalysis(id: string) {
  queued.add(id)
}

/** True once for a queued id, so the analysis starts exactly once. */
export function takeQueuedEntryAnalysis(id: string) {
  return queued.delete(id)
}
