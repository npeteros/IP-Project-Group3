import { entry } from '@/src/lib/api/entry/procedures'
import { tag } from '@/src/lib/api/tag/procedures'

export * from '@/src/lib/api/client'
export type { Entry, EntryList } from '@/src/server/entry/schemas'
export type { Tag, TagList } from '@/src/server/tag/schemas'

export const api = { entry, tag }
