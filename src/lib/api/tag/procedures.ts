import { defineMutation, defineQuery, request } from '@/src/lib/api/client'
import type {
  TagIdInput,
  TagList,
  TagRenameInput,
  TagRenameResponse,
} from '@/src/server/tag/schemas'

const TAGS = '/api/v1/tags'

export const tag = {
  list: defineQuery(['tag', 'list'], (_input: void, signal) => request<TagList>(TAGS, { signal })),
  // Entry cards show tag names, so tag changes invalidate entries too
  rename: defineMutation(
    ({ id, ...input }: TagIdInput & TagRenameInput) =>
      request<TagRenameResponse>(`${TAGS}/${id}`, { method: 'PATCH', body: input }),
    { invalidates: [['tag'], ['entry']] },
  ),
  delete: defineMutation(
    ({ id }: TagIdInput) => request<void>(`${TAGS}/${id}`, { method: 'DELETE' }),
    { invalidates: [['tag'], ['entry']] },
  ),
}
