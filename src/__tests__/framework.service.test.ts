// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/src/generated/prisma/client'
import { ForbiddenError, NotFoundError } from '@/src/server/api/errors'
import { FrameworkService } from '@/src/server/framework/framework.service'

const BUILT_IN = '00000000-0000-4000-8000-000000000001'
const CUSTOM = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const created = new Date('2026-11-01T00:00:00.000Z')
const updated = new Date('2026-11-02T00:00:00.000Z')

const row = (overrides: Record<string, unknown> = {}) => ({
  id: BUILT_IN,
  userId: null,
  name: 'Daily Review',
  description: 'Close the day',
  icon: 'check',
  durationMinutes: 3,
  prompts: ['What went well?'],
  createdAt: created,
  updatedAt: updated,
  deletedAt: null,
  ...overrides,
})

const VISIBLE = { deletedAt: null, OR: [{ userId: null }, { userId: 'u1' }] }

function setup({
  found = row() as ReturnType<typeof row> | null,
  affected = 1,
}: { found?: ReturnType<typeof row> | null; affected?: number } = {}) {
  const db = {
    framework: {
      findMany: vi.fn().mockResolvedValue([row(), row({ id: CUSTOM, userId: 'u1' })]),
      findFirst: vi.fn().mockResolvedValue(found),
      create: vi
        .fn()
        .mockImplementation(({ data }) => Promise.resolve(row({ id: CUSTOM, ...data }))),
      updateMany: vi.fn().mockResolvedValue({ count: affected }),
    },
  }
  const service = new FrameworkService('u1', db as unknown as PrismaClient)
  return { db, service }
}

describe('FrameworkService.findManyFrameworks', () => {
  it('returns built-ins and the user’s own, live only, built-ins first', async () => {
    const { db, service } = setup()

    const { frameworks } = await service.findManyFrameworks()

    expect(db.framework.findMany).toHaveBeenCalledWith({
      where: VISIBLE,
      orderBy: [{ userId: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }, { id: 'asc' }],
    })
    expect(frameworks.map((f) => [f.id, f.userId])).toEqual([
      [BUILT_IN, null],
      [CUSTOM, 'u1'],
    ])
  })

  it('maps rows to the response shape with ISO dates and no deletedAt', async () => {
    const { service } = setup()

    const { frameworks } = await service.findManyFrameworks()

    expect(frameworks[0]).toEqual({
      id: BUILT_IN,
      userId: null,
      name: 'Daily Review',
      description: 'Close the day',
      icon: 'check',
      durationMinutes: 3,
      prompts: ['What went well?'],
      createdAt: created.toISOString(),
      updatedAt: updated.toISOString(),
    })
  })
})

describe('FrameworkService.findOneFramework', () => {
  it('looks the framework up among the visible ones', async () => {
    const { db, service } = setup()

    await expect(service.findOneFramework(BUILT_IN)).resolves.toMatchObject({ id: BUILT_IN })
    expect(db.framework.findFirst).toHaveBeenCalledWith({ where: { id: BUILT_IN, ...VISIBLE } })
  })

  it('is a 404 for a missing, deleted or another user’s framework', async () => {
    const { service } = setup({ found: null })

    await expect(service.findOneFramework(CUSTOM)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('FrameworkService.createFramework', () => {
  it('creates the framework owned by the user', async () => {
    const { db, service } = setup()
    const input = {
      name: 'Sunday Reset',
      description: 'Close the week',
      icon: 'sun' as const,
      durationMinutes: 2,
      prompts: ['What am I proud of?'],
    }

    const framework = await service.createFramework(input)

    expect(db.framework.create).toHaveBeenCalledWith({ data: { userId: 'u1', ...input } })
    expect(framework).toMatchObject({ id: CUSTOM, userId: 'u1', name: 'Sunday Reset' })
  })
})

describe('FrameworkService.deleteFramework', () => {
  it('soft-deletes the user’s own framework', async () => {
    const { db, service } = setup({ found: row({ id: CUSTOM, userId: 'u1' }) })

    await service.deleteFramework(CUSTOM)

    expect(db.framework.updateMany).toHaveBeenCalledWith({
      where: { id: CUSTOM, userId: 'u1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it('refuses to delete a built-in', async () => {
    const { db, service } = setup({ found: row() })

    await expect(service.deleteFramework(BUILT_IN)).rejects.toBeInstanceOf(ForbiddenError)
    expect(db.framework.updateMany).not.toHaveBeenCalled()
  })

  it('is a 404 for a missing, deleted or another user’s framework', async () => {
    const { db, service } = setup({ found: null })

    await expect(service.deleteFramework(CUSTOM)).rejects.toBeInstanceOf(NotFoundError)
    expect(db.framework.findFirst).toHaveBeenCalledWith({
      where: { id: CUSTOM, ...VISIBLE },
      select: { userId: true },
    })
    expect(db.framework.updateMany).not.toHaveBeenCalled()
  })

  it('is a 404 when the framework is deleted concurrently', async () => {
    const { service } = setup({ found: row({ id: CUSTOM, userId: 'u1' }), affected: 0 })

    await expect(service.deleteFramework(CUSTOM)).rejects.toBeInstanceOf(NotFoundError)
  })
})
