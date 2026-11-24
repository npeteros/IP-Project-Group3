// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { getSession } from '@/src/lib/auth'
import { ForbiddenError, NotFoundError } from '@/src/server/api/errors'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const service = vi.hoisted(() => ({
  findManyFrameworks: vi.fn(),
  findOneFramework: vi.fn(),
  createFramework: vi.fn(),
  deleteFramework: vi.fn(),
}))
vi.mock('@/src/server/framework/framework.service', () => ({
  FrameworkService: vi.fn(function () {
    return service
  }),
}))

import { GET as LIST, POST } from '@/app/api/v1/frameworks/route'
import { DELETE, GET } from '@/app/api/v1/frameworks/[id]/route'

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) }) as never
const timestamp = '2026-11-01T00:00:00.000Z'
const framework = {
  id: ID,
  userId: 'u1',
  name: 'Sunday Reset',
  description: 'Close the week',
  icon: 'sun',
  durationMinutes: 2,
  prompts: ['What am I proud of?'],
  createdAt: timestamp,
  updatedAt: timestamp,
}
const createBody = {
  name: 'Sunday Reset',
  description: 'Close the week',
  icon: 'sun',
  durationMinutes: 2,
  prompts: ['What am I proud of?'],
}

function req(method: string, body?: unknown) {
  return new Request('http://localhost/api/v1/frameworks', {
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

describe('GET /api/v1/frameworks', () => {
  it('lists frameworks and responds 200', async () => {
    service.findManyFrameworks.mockResolvedValue({ frameworks: [framework] })

    const res = await LIST(req('GET'), undefined as never)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ frameworks: [framework] })
  })

  it('responds 401 without a session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await LIST(req('GET'), undefined as never)

    expect(res.status).toBe(401)
    expect(service.findManyFrameworks).not.toHaveBeenCalled()
  })
})

describe('POST /api/v1/frameworks', () => {
  it('creates a framework and responds 201', async () => {
    service.createFramework.mockResolvedValue(framework)

    const res = await POST(req('POST', createBody), undefined as never)

    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual(framework)
    expect(service.createFramework).toHaveBeenCalledWith(createBody)
  })

  it.each([
    ['no prompts', { ...createBody, prompts: [] }],
    ['an unknown icon', { ...createBody, icon: 'rocket' }],
    ['a zero duration', { ...createBody, durationMinutes: 0 }],
  ])('responds 400 for %s', async (_, body) => {
    const res = await POST(req('POST', body), undefined as never)

    expect(res.status).toBe(400)
    expect(service.createFramework).not.toHaveBeenCalled()
  })
})

describe('GET /api/v1/frameworks/[id]', () => {
  it('responds 200 with the framework', async () => {
    service.findOneFramework.mockResolvedValue(framework)

    const res = await GET(req('GET'), ctx())

    expect(res.status).toBe(200)
    expect(service.findOneFramework).toHaveBeenCalledWith(ID)
  })

  it('responds 400 for an id that is not a UUID', async () => {
    const res = await GET(req('GET'), ctx('daily-review'))

    expect(res.status).toBe(400)
    expect(service.findOneFramework).not.toHaveBeenCalled()
  })

  it('responds 404 when the service cannot find it', async () => {
    service.findOneFramework.mockRejectedValue(new NotFoundError('Framework not found.'))

    const res = await GET(req('GET'), ctx())

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/frameworks/[id]', () => {
  it('responds 204 with no body', async () => {
    service.deleteFramework.mockResolvedValue(undefined)

    const res = await DELETE(req('DELETE'), ctx())

    expect(res.status).toBe(204)
    await expect(res.text()).resolves.toBe('')
    expect(service.deleteFramework).toHaveBeenCalledWith(ID)
  })

  it('responds 403 for a built-in framework', async () => {
    service.deleteFramework.mockRejectedValue(new ForbiddenError())

    const res = await DELETE(req('DELETE'), ctx())

    expect(res.status).toBe(403)
  })

  it('responds 404 for another user’s framework', async () => {
    service.deleteFramework.mockRejectedValue(new NotFoundError('Framework not found.'))

    const res = await DELETE(req('DELETE'), ctx())

    expect(res.status).toBe(404)
  })
})
