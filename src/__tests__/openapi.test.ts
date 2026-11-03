// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/src/lib/auth'
import { NotFoundError } from '@/src/server/api/errors'
import { withAuth } from '@/src/server/api/handler'
import { ApiErrorSchema, openApiDocument } from '@/src/server/api/openapi'
import { GET } from '@/app/api/v1/openapi.json/route'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const request = new Request('http://localhost/api/v1/test') as NextRequest

describe('openApiDocument', () => {
  it('is an OpenAPI 3.2.1 document served from /api/v1', () => {
    expect(openApiDocument.openapi).toBe('3.2.1')
    expect(openApiDocument.servers).toEqual([{ url: '/api/v1' }])
  })

  it('requires the session cookie by default', () => {
    expect(openApiDocument.security).toEqual([{ sessionCookie: [] }])
    expect(openApiDocument.components?.securitySchemes?.sessionCookie).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
    })
  })

  it('registers a reusable response per error status, all pointing at ApiError', () => {
    const responses = openApiDocument.components?.responses ?? {}

    expect(Object.keys(responses)).toEqual([
      'BadRequest',
      'Unauthorized',
      'Forbidden',
      'NotFound',
      'Conflict',
      'InternalError',
    ])
    for (const response of Object.values(responses)) {
      expect(response).toMatchObject({
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      })
    }
  })
})

describe('ApiErrorSchema', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['UNAUTHORIZED', () => vi.mocked(getSession).mockResolvedValue(null), () => {}],
    [
      'NOT_FOUND',
      () =>
        vi
          .mocked(getSession)
          .mockResolvedValue({ user: { id: 'u' } } as Awaited<ReturnType<typeof getSession>>),
      () => {
        throw new NotFoundError()
      },
    ],
    [
      'VALIDATION_ERROR',
      () =>
        vi
          .mocked(getSession)
          .mockResolvedValue({ user: { id: 'u' } } as Awaited<ReturnType<typeof getSession>>),
      () => {
        z.object({ id: z.uuid() }).parse({ id: 'nope' })
      },
    ],
  ])('matches what withAuth returns for %s', async (_code, setSession, throwError) => {
    setSession()

    const res = await withAuth(() => {
      throwError()
      return Response.json({})
    })(request, undefined)

    expect(ApiErrorSchema.safeParse(await res.json()).success).toBe(true)
  })
})

describe('GET /api/v1/openapi.json', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('serves the document outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const res = GET()

    expect(res.status).toBe(200)
    expect((await res.json()).openapi).toBe('3.2.1')
  })

  it('is hidden in production', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(GET().status).toBe(404)
  })
})
