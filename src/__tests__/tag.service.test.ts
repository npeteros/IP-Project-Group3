// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/src/generated/prisma/client'
import { TagService } from '@/src/server/tag/tag.service'

const T1 = '00000000-0000-4000-8000-000000000001'
const T2 = '00000000-0000-4000-8000-000000000002'

function setup() {
  const db = {
    tag: {
      findMany: vi.fn().mockResolvedValue([
        { id: T1, name: 'Work', _count: { entries: 3 } },
        { id: T2, name: 'gym', _count: { entries: 0 } },
      ]),
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
