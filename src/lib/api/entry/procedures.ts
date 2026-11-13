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

// Writing an entry can create tags and changes each tag's entry count, so entry writes also
// invalidate the tag list.
export const entry = {
  findManyEntries: defineQuery(['entry', 'findManyEntries'], (input: EntryListQueryInput, signal) =>
    request<EntryList>(ENTRIES, { query: input, signal }),
  ),
  findOneEntry: defineQuery(['entry', 'findOneEntry'], ({ id }: EntryIdInput, signal) =>
    request<Entry>(`${ENTRIES}/${id}`, { signal }),
  ),
  create: defineMutation(
    (input: EntryCreateInput) => request<Entry>(ENTRIES, { method: 'POST', body: input }),
    { invalidates: [['entry'], ['stats'], ['tag']] },
  ),
  update: defineMutation(
    ({ id, ...input }: EntryIdInput & EntryUpdateInput) =>
      request<Entry>(`${ENTRIES}/${id}`, { method: 'PATCH', body: input }),
    { invalidates: [['entry'], ['stats'], ['tag']] },
  ),
  delete: defineMutation(
    ({ id }: EntryIdInput) => request<void>(`${ENTRIES}/${id}`, { method: 'DELETE' }),
    { invalidates: [['entry'], ['stats'], ['tag']] },
  ),
}
