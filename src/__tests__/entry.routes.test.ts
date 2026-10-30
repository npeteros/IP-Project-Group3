// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { getSession } from '@/src/lib/auth'
import { NotFoundError } from '@/src/server/api/errors'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const service = vi.hoisted(() => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}))
vi.mock('@/src/server/entry/entry.service', () => ({
  EntryService: vi.fn(function () {
    return service
  }),
}))

import { POST } from '@/app/api/v1/entries/route'
import { DELETE, PATCH } from '@/app/api/v1/entries/[id]/route'

const ctx = { params: Promise.resolve({ id: 'e1' }) } as never

function req(method: string, body?: unknown, raw?: string) {
  return new Request('http://localhost/api/v1/entries', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as Awaited<
    ReturnType<typeof getSession>
  >)
})

describe('POST /api/v1/entries', () => {
  it('creates and responds 201', async () => {
    service.createEntry.mockResolvedValue({ id: 'e1' })
    const res = await POST(req('POST', { body: 'hi' }), undefined as never)

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'e1' })
  })

  it('responds 400 VALIDATION_ERROR for an invalid body', async () => {
    const res = await POST(req('POST', { body: '' }), undefined as never)

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(service.createEntry).not.toHaveBeenCalled()
  })

  it('responds 400 BAD_REQUEST for malformed JSON', async () => {
    const res = await POST(req('POST', undefined, '{nope'), undefined as never)

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })

  it('responds 401 when signed out', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    expect((await POST(req('POST', { body: 'hi' }), undefined as never)).status).toBe(401)
  })
})

describe('PATCH /api/v1/entries/[id]', () => {
  it('updates and responds 200', async () => {
    service.updateEntry.mockResolvedValue({ id: 'e1' })
    const res = await PATCH(req('PATCH', { body: 'new' }), ctx)

    expect(res.status).toBe(200)
    expect(service.updateEntry).toHaveBeenCalledWith('e1', { body: 'new' })
  })

  it('maps NotFoundError to 404', async () => {
    service.updateEntry.mockRejectedValue(new NotFoundError('Entry not found.'))
    expect((await PATCH(req('PATCH', { body: 'new' }), ctx)).status).toBe(404)
  })
})

describe('DELETE /api/v1/entries/[id]', () => {
  it('responds 204 with no body', async () => {
    service.deleteEntry.mockResolvedValue({ id: 'e1' })
    const res = await DELETE(req('DELETE'), ctx)

    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    expect(service.deleteEntry).toHaveBeenCalledWith('e1')
  })

  it('maps NotFoundError (already deleted) to 404', async () => {
    service.deleteEntry.mockRejectedValue(new NotFoundError('Entry not found.'))
    expect((await DELETE(req('DELETE'), ctx)).status).toBe(404)
  })
})
