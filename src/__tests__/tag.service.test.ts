// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/src/generated/prisma/client'
import { ConflictError, NotFoundError } from '@/src/server/api/errors'
import { TagService } from '@/src/server/tag/tag.service'

const T1 = '00000000-0000-4000-8000-000000000001'
const T2 = '00000000-0000-4000-8000-000000000002'

function setup({ affected = 1 }: { affected?: number } = {}) {
  const db = {
    tag: {
      findMany: vi.fn().mockResolvedValue([
        { id: T1, name: 'Work', _count: { entries: 3 } },
        { id: T2, name: 'gym', _count: { entries: 0 } },
      ]),
      updateMany: vi.fn().mockResolvedValue({ count: affected }),
      deleteMany: vi.fn().mockResolvedValue({ count: affected }),
    },
  }
  const service = new TagService('u1', db as unknown as PrismaClient)
  return { db, service }
}

describe('TagService.findManyTags', () => {
  it('maps rows to tags with entryCount', async () => {
    const { service } = setup()

    await expect(service.findManyTags()).resolves.toEqual({
      tags: [
        { id: T1, name: 'Work', entryCount: 3 },
        { id: T2, name: 'gym', entryCount: 0 },
      ],
    })
  })

  it('scopes to the user, orders by normalized name and counts only live entries', async () => {
    const { db, service } = setup()
    await service.findManyTags()

    const args = db.tag.findMany.mock.calls[0][0]
    expect(args.where).toEqual({ userId: 'u1' })
    expect(args.orderBy).toEqual([{ normalizedName: 'asc' }, { id: 'asc' }])
    expect(args.select._count).toEqual({
      select: { entries: { where: { entry: { deletedAt: null } } } },
    })
  })
})

describe('TagService.renameTag', () => {
  it('updates name and normalizedName scoped to the user', async () => {
    const { db, service } = setup()

    await expect(service.renameTag(T1, { name: 'Deep Work' })).resolves.toEqual({
      id: T1,
      name: 'Deep Work',
    })
    expect(db.tag.updateMany).toHaveBeenCalledWith({
      where: { id: T1, userId: 'u1' },
      data: { name: 'Deep Work', normalizedName: 'deep work' },
    })
  })

  it('throws NotFoundError for a missing or foreign tag', async () => {
    const { service } = setup({ affected: 0 })

    await expect(service.renameTag(T1, { name: 'x' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('maps a unique violation to ConflictError', async () => {
    const { db, service } = setup()
    db.tag.updateMany.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }))

    await expect(service.renameTag(T1, { name: 'GYM' })).rejects.toBeInstanceOf(ConflictError)
  })

  it('rethrows other errors untouched', async () => {
    const { db, service } = setup()
    const boom = new Error('db down')
    db.tag.updateMany.mockRejectedValue(boom)

    await expect(service.renameTag(T1, { name: 'x' })).rejects.toBe(boom)
  })
})

describe('TagService.deleteTag', () => {
  it('hard-deletes scoped to the user', async () => {
    const { db, service } = setup()

    await expect(service.deleteTag(T1)).resolves.toBeUndefined()
    expect(db.tag.deleteMany).toHaveBeenCalledWith({ where: { id: T1, userId: 'u1' } })
  })

  it('throws NotFoundError for a missing or foreign tag', async () => {
    const { service } = setup({ affected: 0 })

    await expect(service.deleteTag(T1)).rejects.toBeInstanceOf(NotFoundError)
  })
})
