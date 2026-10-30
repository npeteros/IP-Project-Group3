import { defineMutation, defineQuery, request } from '@/src/lib/api/client'
import type { Entry, EntryList } from '@/src/lib/api/entry/types'
import type { EntryListQuery } from '@/src/server/entry/entry.schemas'
import type { EntryCreateInput, EntryUpdateInput } from '@/src/server/entry/entry.service'

const ENTRIES = '/api/v1/entries'

export const entry = {
  findManyEntries: defineQuery(
    ['entry', 'findManyEntries'],
    (input: Partial<EntryListQuery>, signal) =>
      request<EntryList>(ENTRIES, { query: input, signal }),
  ),
  findOneEntry: defineQuery(['entry', 'findOneEntry'], ({ id }: { id: string }, signal) =>
    request<Entry>(`${ENTRIES}/${id}`, { signal }),
  ),
  create: defineMutation(
    (input: EntryCreateInput) => request<Entry>(ENTRIES, { method: 'POST', body: input }),
    { invalidates: [['entry']] },
  ),
  update: defineMutation(
    ({ id, ...input }: { id: string } & EntryUpdateInput) =>
      request<Entry>(`${ENTRIES}/${id}`, { method: 'PATCH', body: input }),
    { invalidates: [['entry']] },
  ),
  delete: defineMutation(
    ({ id }: { id: string }) => request<void>(`${ENTRIES}/${id}`, { method: 'DELETE' }),
    { invalidates: [['entry']] },
  ),
}
