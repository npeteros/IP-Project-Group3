// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/src/generated/prisma/client'
import { NotFoundError } from '@/src/server/api/errors'
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
  it('derives entryDate from writtenAt in Manila time', async () => {
    const { tx, service } = setup()

    // 2025-12-31 17:30 UTC is already Jan 1 in Manila (UTC+8)
    await service.createEntry({ body: 'hi', writtenAt: '2025-12-31T17:30:00.000Z', tags: [] })
    expect(tx.entry.create.mock.calls[0][0].data.entryDate).toEqual(
      new Date('2026-01-01T00:00:00.000Z'),
    )

    // The offset in writtenAt doesn't matter, only the instant it names
    await service.createEntry({ body: 'hi', writtenAt: '2026-01-01T23:30:00-05:00', tags: [] })
    expect(tx.entry.create.mock.calls[1][0].data.entryDate).toEqual(
      new Date('2026-01-02T00:00:00.000Z'),
    )
  })

  it('stores the entry for the service user, in one transaction', async () => {
    const { tx, db, service } = setup()
    await service.createEntry({ body: 'hi', tags: [] })

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
      // An existing tag keeps its original spelling
      update: {},
    })
    expect(tx.entryTag.createMany.mock.calls[0][0].data).toEqual([
      { entryId: 'e1', tagId: 'id-work' },
      { entryId: 'e1', tagId: 'id-home' },
    ])
  })

  it('returns the EntrySchema response shape', async () => {
    const { service } = setup()
    const entry = await service.createEntry({ body: 'hi', tags: ['Work'] })

    expect(entry).toEqual({
      id: 'e1',
      title: null,
      body: 'hello',
      writtenAt: '2026-10-30T00:00:00.000Z',
      entryDate: '2026-10-30',
      createdAt: '2026-10-30T00:00:00.000Z',
      updatedAt: '2026-10-30T00:00:00.000Z',
      tags: [{ id: 't1', name: 'Work' }],
    })
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

    // 8pm UTC on Jun 1 is Jun 2 in Manila
    await service.updateEntry('e1', { writtenAt: '2026-06-01T20:00:00.000Z' })
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
