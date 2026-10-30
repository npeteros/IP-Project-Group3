// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/src/generated/prisma/client'
import { NotFoundError, BadRequestError } from '@/src/server/api/errors'
import { EntryService } from '@/src/server/entry/entry.service'

const now = new Date('2026-10-30T00:00:00.000Z')

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    userId: 'u1',
    title: null,
    body: 'hello',
    writtenAt: now,
    entryDate: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    tags: [{ tag: { id: 't1', name: 'Work' } }],
    ...overrides,
  }
}

function setup({ updated = 1 }: { updated?: number } = {}) {
  const tx = {
    entry: {
      create: vi.fn().mockResolvedValue({ id: 'e1' }),
      updateMany: vi.fn().mockResolvedValue({ count: updated }),
      findFirst: vi.fn().mockResolvedValue(record()),
    },
    tag: {
      upsert: vi
        .fn()
        .mockImplementation(({ create }) => Promise.resolve({ id: `id-${create.normalizedName}` })),
    },
    entryTag: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  }
  const db = { $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)) }
  const service = new EntryService('u1', db as unknown as PrismaClient)
  return { tx, db, service }
}

describe('EntryService.createEntry', () => {
  it('derives entryDate from writtenAt in the given time zone', async () => {
    const { tx, service } = setup()

    // 2026-01-01 03:30 UTC is still Dec 31 in New York and already Jan 1 in UTC
    await service.createEntry({
      body: 'hi',
      writtenAt: '2026-01-01T03:30:00.000Z',
      timeZone: 'America/New_York',
    })
    expect(tx.entry.create.mock.calls[0][0].data.entryDate).toEqual(
      new Date('2025-12-31T00:00:00.000Z'),
    )

    await service.createEntry({
      body: 'hi',
      writtenAt: '2026-01-01T03:30:00.000Z',
      timeZone: 'UTC',
    })
    expect(tx.entry.create.mock.calls[1][0].data.entryDate).toEqual(
      new Date('2026-01-01T00:00:00.000Z'),
    )
  })

  it('rejects an unknown time zone', async () => {
    const { service } = setup()
    await expect(service.createEntry({ body: 'hi', timeZone: 'Mars/Base' })).rejects.toBeInstanceOf(
      BadRequestError,
    )
  })

  it('stores the entry for the service user, in one transaction', async () => {
    const { tx, db, service } = setup()
    await service.createEntry({ body: 'hi' })

    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.entry.create.mock.calls[0][0].data.userId).toBe('u1')
  })

  it('de-duplicates tags case-insensitively and scopes them to the user', async () => {
    const { tx, service } = setup()
    await service.createEntry({ body: 'hi', tags: ['Work', 'work', '  WORK ', 'Home', ' '] })

    const upserts = tx.tag.upsert.mock.calls.map(([arg]) => arg)
    expect(upserts).toHaveLength(2)
    expect(upserts[0]).toMatchObject({
      where: { userId_normalizedName: { userId: 'u1', normalizedName: 'work' } },
      create: { userId: 'u1', name: 'Work', normalizedName: 'work' },
      update: {},
    })
    expect(tx.entryTag.createMany.mock.calls[0][0].data).toEqual([
      { entryId: 'e1', tagId: 'id-work' },
      { entryId: 'e1', tagId: 'id-home' },
    ])
  })

  it('returns the entry with flattened tags', async () => {
    const { service } = setup()
    const entry = await service.createEntry({ body: 'hi', tags: ['Work'] })
    expect(entry.tags).toEqual([{ id: 't1', name: 'Work' }])
  })
})

describe('EntryService.updateEntry', () => {
  it('only touches live entries owned by the user', async () => {
    const { tx, service } = setup()
    await service.updateEntry('e1', { body: 'new' })

    expect(tx.entry.updateMany.mock.calls[0][0].where).toEqual({
      id: 'e1',
      userId: 'u1',
      deletedAt: null,
    })
  })

  it('throws NotFoundError for missing, foreign or soft-deleted entries, writing no tags', async () => {
    const { tx, service } = setup({ updated: 0 })

    await expect(service.updateEntry('e1', { body: 'x', tags: ['a'] })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(tx.tag.upsert).not.toHaveBeenCalled()
  })

  it('recomputes entryDate only when writtenAt is provided', async () => {
    const { tx, service } = setup()

    await service.updateEntry('e1', { body: 'x' })
    expect(tx.entry.updateMany.mock.calls[0][0].data.entryDate).toBeUndefined()

    await service.updateEntry('e1', {
      writtenAt: '2026-06-01T20:00:00.000Z',
      timeZone: 'Asia/Manila',
    })
    expect(tx.entry.updateMany.mock.calls[1][0].data.entryDate).toEqual(
      new Date('2026-06-02T00:00:00.000Z'),
    )
  })

  it('leaves tags alone when tags is omitted', async () => {
    const { tx, service } = setup()
    await service.updateEntry('e1', { body: 'x' })

    expect(tx.entryTag.deleteMany).not.toHaveBeenCalled()
    expect(tx.entryTag.createMany).not.toHaveBeenCalled()
  })

  it('replaces the tag set: unlinks tags that were left out', async () => {
    const { tx, service } = setup()
    await service.updateEntry('e1', { tags: ['Home'] })

    expect(tx.entryTag.deleteMany).toHaveBeenCalledWith({
      where: { entryId: 'e1', tagId: { notIn: ['id-home'] } },
    })
  })

  it('unlinks every tag when tags is an empty array', async () => {
    const { tx, service } = setup()
    await service.updateEntry('e1', { tags: [] })

    expect(tx.entryTag.deleteMany).toHaveBeenCalledWith({
      where: { entryId: 'e1', tagId: { notIn: [] } },
    })
    expect(tx.entryTag.createMany).not.toHaveBeenCalled()
  })
})

describe('EntryService.deleteEntry', () => {
  it('soft-deletes by setting deletedAt, scoped to the user', async () => {
    const { tx, service } = setup()
    await service.deleteEntry('e1')

    const arg = tx.entry.updateMany.mock.calls[0][0]
    expect(arg.where).toEqual({ id: 'e1', userId: 'u1', deletedAt: null })
    expect(arg.data.deletedAt).toBeInstanceOf(Date)
  })

  it('throws NotFoundError when already deleted or not owned', async () => {
    const { service } = setup({ updated: 0 })
    await expect(service.deleteEntry('e1')).rejects.toBeInstanceOf(NotFoundError)
  })
})
