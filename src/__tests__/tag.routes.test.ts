// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { getSession } from '@/src/lib/auth'
import { ConflictError, NotFoundError } from '@/src/server/api/errors'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const service = vi.hoisted(() => ({
  findManyTags: vi.fn(),
  renameTag: vi.fn(),
  deleteTag: vi.fn(),
}))
vi.mock('@/src/server/tag/tag.service', () => ({
  TagService: vi.fn(function () {
    return service
  }),
}))

import { GET } from '@/app/api/v1/tags/route'
import { DELETE, PATCH } from '@/app/api/v1/tags/[id]/route'

const ID = '00000000-0000-4000-8000-000000000001'
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) }) as never

function req(method: string, body?: unknown) {
  return new Request('http://localhost/api/v1/tags', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as NextRequest
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

describe('PATCH /api/v1/tags/:id', () => {
  it('renames and responds 200 with { id, name }', async () => {
    service.renameTag.mockResolvedValue({ id: ID, name: 'Deep Work' })

    const res = await PATCH(req('PATCH', { name: '  Deep Work  ' }), ctx())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ id: ID, name: 'Deep Work' })
    expect(service.renameTag).toHaveBeenCalledWith(ID, { name: 'Deep Work' })
  })

  it('responds 400 for a non-uuid id', async () => {
    const res = await PATCH(req('PATCH', { name: 'x' }), ctx('not-a-uuid'))

    expect(res.status).toBe(400)
    expect(service.renameTag).not.toHaveBeenCalled()
  })

  it('responds 400 for a blank name', async () => {
    const res = await PATCH(req('PATCH', { name: '   ' }), ctx())

    expect(res.status).toBe(400)
    expect(service.renameTag).not.toHaveBeenCalled()
  })

  it('responds 404 for a missing or foreign tag', async () => {
    service.renameTag.mockRejectedValue(new NotFoundError('Tag not found.'))

    const res = await PATCH(req('PATCH', { name: 'x' }), ctx())

    expect(res.status).toBe(404)
  })

  it('responds 409 when the name clashes', async () => {
    service.renameTag.mockRejectedValue(new ConflictError())

    const res = await PATCH(req('PATCH', { name: 'Gym' }), ctx())

    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/v1/tags/:id', () => {
  it('deletes and responds 204 with no body', async () => {
    service.deleteTag.mockResolvedValue(undefined)

    const res = await DELETE(req('DELETE'), ctx())

    expect(res.status).toBe(204)
    await expect(res.text()).resolves.toBe('')
    expect(service.deleteTag).toHaveBeenCalledWith(ID)
  })

  it('responds 404 for a missing or foreign tag', async () => {
    service.deleteTag.mockRejectedValue(new NotFoundError('Tag not found.'))

    const res = await DELETE(req('DELETE'), ctx())

    expect(res.status).toBe(404)
  })
})
