import { entry } from '@/src/lib/api/entry/procedures'
import { framework } from '@/src/lib/api/framework/procedures'
import { stats } from '@/src/lib/api/stats/procedures'
import { tag } from '@/src/lib/api/tag/procedures'

export * from '@/src/lib/api/client'
export type { Entry, EntryList } from '@/src/server/entry/schemas'
export type { Framework, FrameworkList } from '@/src/server/framework/schemas'
export type { Stats } from '@/src/server/stats/schemas'
export type { Tag, TagList } from '@/src/server/tag/schemas'

export const api = { entry, framework, stats, tag }
