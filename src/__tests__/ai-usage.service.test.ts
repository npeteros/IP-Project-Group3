// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IMastraLogger } from '@mastra/core/logger'
import { TooManyRequestsError } from '@/src/server/api/errors'
import {
  AiUsageService,
  type AiUsageOutcome,
  type AiUsageReservation,
} from '@/src/server/ai-usage/ai-usage.service'

// Keep the real Prisma client and Mastra observability out of unit tests.
vi.mock('@/src/lib/prisma', () => ({ default: {} }))
vi.mock('@/src/mastra/observability', () => ({ logger: {} }))

const USER_ID = '3f2b1c4e-8a9d-4e7f-9b1a-2c3d4e5f6a7b'
const OTHER_USER_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const USAGE_ID = '0d1e2f3a-4b5c-4d6e-9f7a-8b9c0d1e2f3a'
const NOW = new Date('2026-10-30T12:00:00.000Z')

const reservation: AiUsageReservation = {
  userId: USER_ID,
  agent: 'reflection-agent',
  model: 'openai/gpt-6.1-sol',
}

const outcome: AiUsageOutcome = {
  model: 'openai/gpt-6.1-sol',
  inputTokens: 120,
  outputTokens: 45,
  latencyMs: 830,
  success: true,
}

function setup() {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    aiUsageLog: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: USAGE_ID }),
    },
  }
  const db = {
    $transaction: vi.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    aiUsageLog: {
      update: vi.fn().mockResolvedValue({}),
    },
  }
  const log = { error: vi.fn() }
  const service = new AiUsageService(
    db as unknown as ConstructorParameters<typeof AiUsageService>[0],
    log as unknown as IMastraLogger,
  )
  return { db, tx, log, service }
}

describe('AiUsageService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  describe('reserve', () => {
    it('inserts a pending row and returns its ID when under the limit', async () => {
      vi.stubEnv('AI_RATE_LIMIT_MAX_CALLS', '5')
      const { tx, service } = setup()
      tx.aiUsageLog.count.mockResolvedValue(4)

      await expect(service.reserve(reservation)).resolves.toBe(USAGE_ID)
      expect(tx.aiUsageLog.create).toHaveBeenCalledWith({
        data: {
          ...reservation,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          success: false,
        },
        select: { id: true },
      })
    })

    it('takes the per-user lock before counting', async () => {
      const { tx, service } = setup()

      await service.reserve(reservation)

      expect(tx.$executeRaw).toHaveBeenCalledOnce()
      expect(tx.$executeRaw.mock.calls[0]).toContain(USER_ID)
      expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.aiUsageLog.count.mock.invocationCallOrder[0],
      )
    })

    it.each([5, 6])(
      'throws TooManyRequestsError without inserting when count is %i with a limit of 5',
      async (count) => {
        vi.stubEnv('AI_RATE_LIMIT_MAX_CALLS', '5')
        const { tx, service } = setup()
        tx.aiUsageLog.count.mockResolvedValue(count)

        const result = service.reserve(reservation)

        await expect(result).rejects.toBeInstanceOf(TooManyRequestsError)
        await expect(result).rejects.toMatchObject({ status: 429, code: 'TOO_MANY_REQUESTS' })
        expect(tx.aiUsageLog.create).not.toHaveBeenCalled()
      },
    )

    it('counts only rows inside the window', async () => {
      vi.stubEnv('AI_RATE_LIMIT_WINDOW_SECONDS', '600')
      const { tx, service } = setup()

      await service.reserve(reservation)

      const { where } = tx.aiUsageLog.count.mock.calls[0][0]
      expect(where.createdAt).toEqual({ gte: new Date(NOW.getTime() - 600 * 1000) })
    })

    it('counts only rows for the specified user', async () => {
      const { tx, service } = setup()

      await service.reserve({ ...reservation, userId: OTHER_USER_ID })

      const { where } = tx.aiUsageLog.count.mock.calls[0][0]
      expect(where.userId).toBe(OTHER_USER_ID)
    })

    it('inserts a system row without locking or counting when userId is null', async () => {
      const { tx, service } = setup()

      await expect(service.reserve({ ...reservation, userId: null })).resolves.toBe(USAGE_ID)
      expect(tx.$executeRaw).not.toHaveBeenCalled()
      expect(tx.aiUsageLog.count).not.toHaveBeenCalled()
      expect(tx.aiUsageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: null }) }),
      )
    })
  })

  describe('finalize', () => {
    it('updates the reserved row with the outcome', async () => {
      const { db, service } = setup()

      await service.finalize(USAGE_ID, outcome)

      expect(db.aiUsageLog.update).toHaveBeenCalledWith({
        where: { id: USAGE_ID },
        data: outcome,
      })
    })

    it('swallows and logs Prisma errors without rethrowing', async () => {
      const { db, log, service } = setup()
      const error = new Error('connection refused')
      db.aiUsageLog.update.mockRejectedValue(error)

      await expect(service.finalize(USAGE_ID, outcome)).resolves.toBeUndefined()
      expect(log.error).toHaveBeenCalledWith('Failed to record AI usage', {
        error,
        usageId: USAGE_ID,
      })
    })
  })

  describe('getConfig', () => {
    it('reads the window and limit from env vars', () => {
      vi.stubEnv('AI_RATE_LIMIT_WINDOW_SECONDS', '120')
      vi.stubEnv('AI_RATE_LIMIT_MAX_CALLS', '10')
      const { service } = setup()

      expect(service.getConfig()).toEqual({ windowSeconds: 120, maxCalls: 10 })
    })

    it.each([
      ['unset', undefined],
      ['not a number', 'abc'],
      ['zero', '0'],
    ])('falls back to defaults when env vars are %s', (_label, value) => {
      vi.stubEnv('AI_RATE_LIMIT_WINDOW_SECONDS', value)
      vi.stubEnv('AI_RATE_LIMIT_MAX_CALLS', value)
      const { service } = setup()

      expect(service.getConfig()).toEqual({ windowSeconds: 3600, maxCalls: 50 })
    })
  })
})
