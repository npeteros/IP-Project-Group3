// Placeholder editor data: full entry bodies and the AI panel ("For this entry") content until
// entries and AI tagging are wired to the API.

import { JOURNAL_ENTRIES } from './journal'

export type EntryAnalysis = {
  mood: string
  suggestedTags: string[]
  summary: string[]
  /** AI companion follow-up question for the entry. */
  companionPrompt: string
}

export type EntryDraft = {
  id: string
  dateLabel: string
  title: string
  body: string
  tags: string[]
  analysis: EntryAnalysis
}

const DETAILS: Record<string, { dateLabel?: string; body?: string; analysis?: EntryAnalysis }> = {
  'entry-1': {
    dateLabel: 'Today, Aug 25 · 8:14 AM',
    body: 'Woke up before the alarm and just sat with my coffee for a while. No phone, no rush — just the quiet and the sound of the kettle cooling down. I want to remember this feeling more often.',
    analysis: {
      mood: 'Calm',
      suggestedTags: ['Morning'],
      summary: [
        'Grateful for a quiet, unhurried morning',
        'Wants to protect this feeling more often',
      ],
      companionPrompt: 'What made this morning feel different from most?',
    },
  },
  'entry-2': {
    analysis: {
      mood: 'Anxious',
      suggestedTags: ['Deadlines'],
      summary: ['Client call moved up unexpectedly', 'Noticed familiar physical stress cues'],
      companionPrompt: 'What would make next Monday feel more manageable?',
    },
  },
}

const DEFAULT_ANALYSIS: EntryAnalysis = {
  mood: 'Reflective',
  suggestedTags: ['Evening'],
  summary: ['A small moment worth remembering'],
  companionPrompt: 'What do you want to carry into tomorrow from this?',
}

export function getPlaceholderEntry(id: string): EntryDraft | undefined {
  const entry = JOURNAL_ENTRIES.find((e) => e.id === id)
  if (!entry) return undefined

  const details = DETAILS[id] ?? {}
  return {
    id: entry.id,
    dateLabel: details.dateLabel ?? entry.date,
    title: entry.title,
    body: details.body ?? entry.excerpt,
    tags: entry.tags,
    analysis: details.analysis ?? DEFAULT_ANALYSIS,
  }
}
