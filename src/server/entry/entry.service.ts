import type { Prisma, PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import { NotFoundError } from '@/src/server/api/errors'
import type {
  Entry,
  EntryCreateOutput,
  EntryList,
  EntryListQueryOutput,
  EntryUpdateOutput,
} from '@/src/server/entry/schemas'

/** Loads an entry's live tags through the `EntryTag` join, as `{ id, name }`. */
const ENTRY_INCLUDE = {
  tags: {
    where: { tag: { deletedAt: null } },
    select: { tag: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.EntryInclude

type EntryRow = Prisma.EntryGetPayload<{ include: typeof ENTRY_INCLUDE }>

/** Maps a DB row to the `EntrySchema` response shape. `entryDate` is a `@db.Date`, so its UTC date is the calendar date. */
function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    writtenAt: row.writtenAt.toISOString(),
    entryDate: row.entryDate.toISOString().slice(0, 10),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tags: row.tags.map(({ tag }) => tag),
  }
}

/** Entry reads and writes, scoped to one user. Implemented in #16 (queries) and #17 (mutations). */
export class EntryService {
  constructor(
    private readonly userId: string,
    private readonly db: PrismaClient = prisma,
  ) {}

  async findManyEntries(input: EntryListQueryOutput): Promise<EntryList> {
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
      ...(tagId && { tags: { some: { tagId, tag: { deletedAt: null } } } }),
      ...((entryStartDate || entryEndDate) && {
        entryDate: {
          ...(entryStartDate && { gte: new Date(`${entryStartDate}T00:00:00.000Z`) }),
          ...(entryEndDate && { lte: new Date(`${entryEndDate}T00:00:00.000Z`) }),
        },
      }),
    }

    const [rows, total] = await this.db.$transaction([
      this.db.entry.findMany({
        where,
        include: ENTRY_INCLUDE,
        // `id` breaks ties so entries sharing a `writtenAt` don't shift between pages
        orderBy: [{ writtenAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.db.entry.count({ where }),
    ])

    return { entries: rows.map(toEntry), total }
  }

  async findOneEntry(id: string): Promise<Entry> {
    const row = await this.db.entry.findFirst({
      where: { id, userId: this.userId, deletedAt: null },
      include: ENTRY_INCLUDE,
    })
    if (!row) throw new NotFoundError('Entry not found.')

    return toEntry(row)
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
