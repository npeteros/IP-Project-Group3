import { defineQuery, request } from '@/src/lib/api/client'
import type { TagList } from '@/src/server/tag/schemas'

const TAGS = '/api/v1/tags'

export const tag = {
  list: defineQuery(['tag', 'list'], (_input: void, signal) => request<TagList>(TAGS, { signal })),
}
