// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/src/lib/auth'
import { InternalServerError, NotFoundError } from '@/src/server/api/errors'
import { withAuth } from '@/src/server/api/handler'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const user = { id: 'user-1', name: 'Jane', email: 'jane@example.com' }
const request = new Request('http://localhost/api/v1/test') as NextRequest

function signIn() {
  vi.mocked(getSession).mockResolvedValue({ user } as Awaited<ReturnType<typeof getSession>>)
}

describe('withAuth', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when signed out', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const handler = vi.fn()

    const res = await withAuth(handler)(request, undefined)

    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes the session user and ctx to the handler', async () => {
    signIn()
    const ctx = { params: Promise.resolve({ id: 'abc' }) }

    const res = await withAuth<typeof ctx>(async ({ user, ctx }) =>
      Response.json({ userId: user.id, ...(await ctx.params) }),
    )(request, ctx)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ userId: 'user-1', id: 'abc' })
  })

  it('maps an AppError to its status and code', async () => {
    signIn()

    const res = await withAuth(() => {
      throw new NotFoundError()
    })(request, undefined)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found.' } })
  })

  it('maps a ZodError to 400 with flattened issues', async () => {
    signIn()

    const res = await withAuth(() => {
      z.object({ id: z.uuid() }).parse({ id: 'nope' })
      return Response.json({})
    })(request, undefined)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.issues.fieldErrors.id).toHaveLength(1)
  })

  it('hides unknown errors behind a generic 500 and logs them', async () => {
    signIn()
    const cause = new Error('connection refused at 10.0.0.5')

    const res = await withAuth(() => {
      throw cause
    })(request, undefined)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
    })
    expect(console.error).toHaveBeenCalledWith(cause)
  })

  it('logs the cause of a thrown InternalServerError', async () => {
    signIn()
    const cause = new Error('upstream timeout')

    const res = await withAuth(() => {
      throw new InternalServerError('Could not reach the AI service.', { cause })
    })(request, undefined)

    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('Could not reach the AI service.')
    expect(console.error).toHaveBeenCalledWith(cause)
  })
})
