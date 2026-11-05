// Placeholder Settings and Data & privacy data until preferences, export and the AI usage log
// are exposed by the API.

export const SETTINGS_NAV = [
  { label: 'General', href: '/settings', exact: true },
  { label: 'Security', href: '/settings#security', exact: true },
  { label: 'Reminders', href: '/settings#reminders', exact: true },
  { label: 'Data & privacy', href: '/settings/data-privacy' },
]

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['value']

export const LANGUAGE_NOTE =
  'AI features are tuned for English right now and may be less accurate in other languages. Writing and storage work the same everywhere.'

export const REMINDER_DEFAULTS = { enabled: true, time: '21:00' }

export const NO_TRAINING_NOTE = 'Moodiary never trains AI models on your data.'

export const EXPORT_SUMMARY = { entryCount: 24, size: '128 KB' }

export const RETENTION_OPTIONS = [
  { value: 'never', label: 'Never delete automatically' },
  { value: '2y', label: 'Delete entries after 2 years' },
  { value: '1y', label: 'Delete entries after 1 year' },
] as const

export type ProcessingLogItem = {
  id: string
  title: string
  at: string
  /** What was sent to the model. */
  detail: string
}

export const PROCESSING_LOG: ProcessingLogItem[] = [
  {
    id: 'log-1',
    title: 'Chat with your journal',
    at: 'Today, 8:42 AM',
    detail: 'Sent: 3 entries (work-tagged) to answer “recurring themes about work”',
  },
  {
    id: 'log-2',
    title: 'Deeper insights refresh',
    at: 'Today, 7:15 AM',
    detail: 'Sent: entry summaries from the last 6 months for trend analysis',
  },
  {
    id: 'log-3',
    title: 'Growth suggestions',
    at: 'Yesterday, 9:03 PM',
    detail: 'Sent: 5 recent entries, mood tags for the last 14 days',
  },
  {
    id: 'log-4',
    title: 'Personality refresh',
    at: 'Aug 20, 6:30 PM',
    detail: 'Sent: 62 entries, anonymized, for Big Five analysis',
  },
]

/**
 * Mirrors the server's rate limit shape (`AiUsageService`: max calls per rolling window, 50 per
 * hour by default) rather than the design's "20 per day", which the backend doesn't enforce.
 */
export const AI_USAGE = { used: 7, limit: 50, window: 'this hour' }

export const PROCESSING_LOG_INTRO =
  'Exactly what was sent to cloud AI, and when. Nothing here is used to train models.'
