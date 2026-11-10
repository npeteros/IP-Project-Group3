// Placeholder AI panel ("For this entry") content for the entry editor. The editor itself now
// reads and writes real entries; the panel, Companion and tag suggestions are wired in S4-03.

export type EntryAnalysis = {
  mood: string
  suggestedTags: string[]
  summary: string[]
  /** AI companion follow-up question for the entry. */
  companionPrompt: string
}
