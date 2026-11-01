import { entry } from '@/src/lib/api/entry/procedures'

export * from '@/src/lib/api/client'
export type { Entry, EntryList } from '@/src/server/entry/schemas'

export const api = { entry }
