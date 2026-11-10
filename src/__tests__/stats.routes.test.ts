// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { getSession } from '@/src/lib/auth'
import { StatsService } from '@/src/server/stats/stats.service'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const service = vi.hoisted(() => ({ getStats: vi.fn() }))
vi.mock('@/src/server/stats/stats.service', () => ({
  StatsService: vi.fn(function () {
    return service
  }),
}))

import { GET } from '@/app/api/v1/stats/route'

const req = () => new Request('http://localhost/api/v1/stats') as NextRequest

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as Awaited<
    ReturnType<typeof getSession>
  >)
})

describe('GET /api/v1/stats', () => {
  it("returns the user's stats with 200", async () => {
    const body = { currentStreak: 3, lastEntryDate: '2026-06-10' }
    service.getStats.mockResolvedValue(body)

    const res = await GET(req(), undefined as never)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(body)
    expect(StatsService).toHaveBeenCalledWith('u1')
  })

  it('responds 401 without a session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await GET(req(), undefined as never)

    expect(res.status).toBe(401)
    expect(service.getStats).not.toHaveBeenCalled()
  })
})
