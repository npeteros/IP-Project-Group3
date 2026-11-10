import { defineQuery, request } from '@/src/lib/api/client'
import type { Stats } from '@/src/server/stats/schemas'

const STATS = '/api/v1/stats'

export const stats = {
  get: defineQuery(['stats', 'get'], (_input: void, signal) => request<Stats>(STATS, { signal })),
}
