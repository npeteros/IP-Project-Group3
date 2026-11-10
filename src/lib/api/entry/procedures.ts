import { defineMutation, defineQuery, request } from '@/src/lib/api/client'
import type {
  Entry,
  EntryCreateInput,
  EntryIdInput,
  EntryList,
  EntryListQueryInput,
  EntryUpdateInput,
} from '@/src/server/entry/schemas'

const ENTRIES = '/api/v1/entries'

export const entry = {
  findManyEntries: defineQuery(['entry', 'findManyEntries'], (input: EntryListQueryInput, signal) =>
    request<EntryList>(ENTRIES, { query: input, signal }),
  ),
  findOneEntry: defineQuery(['entry', 'findOneEntry'], ({ id }: EntryIdInput, signal) =>
    request<Entry>(`${ENTRIES}/${id}`, { signal }),
  ),
  create: defineMutation(
    (input: EntryCreateInput) => request<Entry>(ENTRIES, { method: 'POST', body: input }),
    { invalidates: [['entry'], ['stats']] },
  ),
  update: defineMutation(
    ({ id, ...input }: EntryIdInput & EntryUpdateInput) =>
      request<Entry>(`${ENTRIES}/${id}`, { method: 'PATCH', body: input }),
    { invalidates: [['entry'], ['stats']] },
  ),
  delete: defineMutation(
    ({ id }: EntryIdInput) => request<void>(`${ENTRIES}/${id}`, { method: 'DELETE' }),
    { invalidates: [['entry'], ['stats']] },
  ),
}
