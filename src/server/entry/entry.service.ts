import type { Prisma, PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import { NotFoundError } from '@/src/server/api/errors'
import type {
  EntryCreateOutput,
  EntryListQueryOutput,
  EntryUpdateOutput,
} from '@/src/server/entry/schemas'

// DB-shaped placeholder until #16 derives it from the generated Prisma types
export type EntryTag = { id: string; name: string }

export type Entry = {
  id: string
  userId: string
  title: string | null
  body: string
  writtenAt: Date
  entryDate: Date
  createdAt: Date
  updatedAt: Date
  tags: EntryTag[]
}

const ENTRY_INCLUDE = { tags: { where: { deletedAt: null } } } satisfies Prisma.EntryInclude

/** Entry reads and writes, scoped to one user. Implemented in #16 (queries) and #17 (mutations). */
export class EntryService {
  constructor(
    private readonly userId: string,
    private readonly db: PrismaClient = prisma,
  ) {}

  async findManyEntries(input: EntryListQueryOutput): Promise<{ entries: Entry[]; total: number }> {
    const { skip, take, searchText, tagId, entryStartDate, entryEndDate } = input

    const where: Prisma.EntryWhereInput = {
      userId: this.userId,
      deletedAt: null,
      ...(searchText && {
        OR: [
          { title: { contains: searchText, mode: 'insensitive' } },
          { body: { contains: searchText, mode: 'insensitive' } },
        ],
      }),
      ...(tagId && { tags: { some: { id: tagId, deletedAt: null } } }),
      ...((entryStartDate || entryEndDate) && {
        entryDate: {
          ...(entryStartDate && { gte: new Date(`${entryStartDate}T00:00:00.000Z`) }),
          ...(entryEndDate && { lte: new Date(`${entryEndDate}T00:00:00.000Z`) }),
        },
      }),
    }

    const [entries, total] = await this.db.$transaction([
      this.db.entry.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: { writtenAt: 'desc' },
        skip,
        take,
      }),
      this.db.entry.count({ where }),
    ])

    return { entries, total }
  }

  async findOneEntry(id: string): Promise<Entry> {
    const entry = await this.db.entry.findFirst({
      where: { id, userId: this.userId, deletedAt: null },
      include: ENTRY_INCLUDE,
    })
    if (!entry) throw new NotFoundError('Entry not found.')

    return entry
  }

  async createEntry(_input: EntryCreateOutput): Promise<Entry> {
    throw new Error('Not implemented')
  }

  async updateEntry(_id: string, _input: EntryUpdateOutput): Promise<Entry> {
    throw new Error('Not implemented')
  }

  async deleteEntry(_id: string): Promise<Entry> {
    throw new Error('Not implemented')
  }
}
