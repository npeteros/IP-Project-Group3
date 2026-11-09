import type { PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import type { TagList } from '@/src/server/tag/schemas'

/** Tag reads and management, scoped to one user. */
export class TagService {
  constructor(
    private readonly userId: string,
    private readonly db: PrismaClient = prisma,
  ) {}

  /** The user's tags by name, each with a count of its live (not soft-deleted) entries. */
  async findManyTags(): Promise<TagList> {
    const rows = await this.db.tag.findMany({
      where: { userId: this.userId },
      // `normalizedName` sorts case-insensitively; `id` breaks ties for a stable order
      orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        _count: { select: { entries: { where: { entry: { deletedAt: null } } } } },
      },
    })

    return {
      tags: rows.map((row) => ({ id: row.id, name: row.name, entryCount: row._count.entries })),
    }
  }
}
