import type { PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import { ConflictError, isUniqueViolation, NotFoundError } from '@/src/server/api/errors'
import { normalizeTagName } from '@/src/server/entry/schemas'
import type { TagList, TagRenameOutput, TagRenameResponse } from '@/src/server/tag/schemas'

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

  /**
   * Renames a tag. Changing only the case of its own name is allowed, since the
   * unique key (`normalizedName`) stays the same; clashing with another tag is a 409.
   */
  async renameTag(id: string, input: TagRenameOutput): Promise<TagRenameResponse> {
    try {
      // The ownership filter lives in the write itself, so there's no check-then-write race
      const { count } = await this.db.tag.updateMany({
        where: { id, userId: this.userId },
        data: { name: input.name, normalizedName: normalizeTagName(input.name) },
      })
      if (count === 0) throw new NotFoundError('Tag not found.')
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('A tag with this name already exists.')
      throw error
    }

    return { id, name: input.name }
  }

  /** Hard delete: tags have no `deletedAt`. The `EntryTag` links cascade in the database. */
  async deleteTag(id: string): Promise<void> {
    const { count } = await this.db.tag.deleteMany({ where: { id, userId: this.userId } })
    if (count === 0) throw new NotFoundError('Tag not found.')
  }
}
