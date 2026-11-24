// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { getSession } from '@/src/lib/auth'
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
  TooManyRequestsError,
} from '@/src/server/api/errors'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const service = vi.hoisted(() => ({ analyzeEntry: vi.fn() }))
const constructed = vi.hoisted(() => vi.fn())
vi.mock('@/src/server/entry/entry-analysis.service', () => ({
  EntryAnalysisService: vi.fn(function (userId: string) {
    constructed(userId)
    return service
  }),
}))

import { POST } from '@/app/api/v1/entries/[id]/analysis/route'

const ID = '00000000-0000-4000-8000-000000000001'
const ctxFor = (id: string) => ({ params: Promise.resolve({ id }) }) as never
const req = () =>
  new Request(`http://localhost/api/v1/entries/${ID}/analysis`, { method: 'POST' }) as NextRequest

const analysis = { mood: 'CALM', summary: 'I went for a walk.', suggestedTags: ['Walks'] }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as Awaited<
    ReturnType<typeof getSession>
  >)
})

describe('POST /api/v1/entries/:id/analysis', () => {
  it('analyzes the entry for the session user and responds 200', async () => {
    service.analyzeEntry.mockResolvedValue(analysis)
    const res = await POST(req(), ctxFor(ID))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(analysis)
    expect(constructed).toHaveBeenCalledWith('u1')
    expect(service.analyzeEntry).toHaveBeenCalledWith(ID)
  })

  it('responds 401 without a session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await POST(req(), ctxFor(ID))

    expect(res.status).toBe(401)
    expect(service.analyzeEntry).not.toHaveBeenCalled()
  })

  it('responds 400 for a non-uuid id', async () => {
    const res = await POST(req(), ctxFor('nope'))

    expect(res.status).toBe(400)
    expect(service.analyzeEntry).not.toHaveBeenCalled()
  })

  it.each([
    [404, 'NOT_FOUND', new NotFoundError('Entry not found.')],
    [409, 'CONFLICT', new ConflictError('Changed.')],
    [429, 'TOO_MANY_REQUESTS', new TooManyRequestsError('AI rate limit exceeded.')],
    [500, 'INTERNAL_ERROR', new InternalServerError('Could not analyze this entry.')],
  ])('responds %i %s when the service throws it', async (status, code, error) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    service.analyzeEntry.mockRejectedValue(error)
    const res = await POST(req(), ctxFor(ID))

    expect(res.status).toBe(status)
    expect(await res.json()).toMatchObject({ error: { code } })
  })
})
