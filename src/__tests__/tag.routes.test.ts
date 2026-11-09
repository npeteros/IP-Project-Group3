// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { getSession } from '@/src/lib/auth'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const service = vi.hoisted(() => ({
  findManyTags: vi.fn(),
}))
vi.mock('@/src/server/tag/tag.service', () => ({
  TagService: vi.fn(function () {
    return service
  }),
}))

import { GET } from '@/app/api/v1/tags/route'

const ID = '00000000-0000-4000-8000-000000000001'

function req(method: string) {
  return new Request('http://localhost/api/v1/tags', { method }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as Awaited<
    ReturnType<typeof getSession>
  >)
})

describe('GET /api/v1/tags', () => {
  it('lists tags and responds 200', async () => {
    const body = { tags: [{ id: ID, name: 'Work', entryCount: 2 }] }
    service.findManyTags.mockResolvedValue(body)

    const res = await GET(req('GET'), undefined as never)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(body)
  })

  it('responds 401 without a session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await GET(req('GET'), undefined as never)

    expect(res.status).toBe(401)
    expect(service.findManyTags).not.toHaveBeenCalled()
  })
})
