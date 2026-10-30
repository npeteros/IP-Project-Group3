import type { Prisma, PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import { BadRequestError, ConflictError, NotFoundError } from '@/src/server/api/errors'
import {
  normalizeTagName,
  type Entry,
  type EntryCreateOutput,
  type EntryList,
  type EntryListQueryOutput,
  type EntryUpdateOutput,
} from '@/src/server/entry/schemas'

const DEFAULT_TIME_ZONE = 'UTC'

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

/**
 * The calendar day `writtenAt` falls on in `timeZone`, as a UTC-midnight Date
 * (what a `@db.Date` column stores). 11pm on Jan 1 in New York is Jan 1, not Jan 2.
 */
function toEntryDate(writtenAt: Date, timeZone: string) {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(writtenAt)
  } catch {
    throw new BadRequestError(`Unknown time zone "${timeZone}".`)
  }

  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  return new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`)
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

/** Entry reads and writes, scoped to one user. */
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

  async createEntry(input: EntryCreateOutput): Promise<Entry> {
    const writtenAt = input.writtenAt ? new Date(input.writtenAt) : new Date()
    const entryDate = toEntryDate(writtenAt, input.timeZone)

    return this.write(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          userId: this.userId,
          // A missing title stays null until title generation lands
          title: input.title ?? null,
          body: input.body,
          writtenAt,
          entryDate,
        },
      })

      await this.syncTags(tx, entry.id, input.tags)
      return this.readEntry(tx, entry.id)
    })
  }

  async updateEntry(id: string, input: EntryUpdateOutput): Promise<Entry> {
    const writtenAt = input.writtenAt === undefined ? undefined : new Date(input.writtenAt)
    const entryDate = writtenAt && toEntryDate(writtenAt, input.timeZone ?? DEFAULT_TIME_ZONE)

    return this.write(async (tx) => {
      // The ownership and soft-delete filters live in the write itself, so a
      // concurrent delete can't slip in between a check and the update.
      const { count } = await tx.entry.updateMany({
        where: { id, userId: this.userId, deletedAt: null },
        data: {
          title: input.title,
          body: input.body,
          writtenAt,
          entryDate,
          updatedAt: new Date(), // bumped even when only the tags change
        },
      })
      if (count === 0) throw new NotFoundError('Entry not found.')

      if (input.tags !== undefined) await this.syncTags(tx, id, input.tags)
      return this.readEntry(tx, id)
    })
  }

  /** Soft delete: sets `deletedAt`, never removes the row. */
  async deleteEntry(id: string): Promise<Entry> {
    return this.write(async (tx) => {
      const { count } = await tx.entry.updateMany({
        where: { id, userId: this.userId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      if (count === 0) throw new NotFoundError('Entry not found.')

      return this.readEntry(tx, id, { includeDeleted: true })
    })
  }

  /** Runs `fn` in one transaction so a failed tag write never leaves a half-saved entry. */
  private async write<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.db.$transaction(fn)
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictError('This entry was changed at the same time.')
      throw error
    }
  }

  /**
   * Makes the entry's tag set exactly `names`: finds or creates each tag for this
   * user (matched on `normalizedName`), links the ones that aren't linked yet, and
   * unlinks the rest. Shared by create and update.
   */
  private async syncTags(tx: Prisma.TransactionClient, entryId: string, names: string[]) {
    // The schema already de-duplicates; this guards direct callers. The first spelling wins.
    const byNormalized = new Map<string, string>()
    for (const raw of names) {
      const name = raw.trim()
      const normalizedName = normalizeTagName(name)
      if (normalizedName && !byNormalized.has(normalizedName))
        byNormalized.set(normalizedName, name)
    }

    const tagIds: string[] = []
    for (const [normalizedName, name] of byNormalized) {
      // An existing tag keeps its original spelling; a soft-deleted one is restored
      // so the link isn't hidden by the `deletedAt: null` filter on reads.
      const tag = await tx.tag.upsert({
        where: { userId_normalizedName: { userId: this.userId, normalizedName } },
        create: { userId: this.userId, name, normalizedName },
        update: { deletedAt: null },
        select: { id: true },
      })
      tagIds.push(tag.id)
    }

    // Unlinking removes the join row only; the tag itself is untouched
    await tx.entryTag.deleteMany({ where: { entryId, tagId: { notIn: tagIds } } })
    if (tagIds.length > 0) {
      await tx.entryTag.createMany({
        data: tagIds.map((tagId) => ({ entryId, tagId })),
        skipDuplicates: true,
      })
    }
  }

  private async readEntry(
    tx: Prisma.TransactionClient,
    id: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Entry> {
    const row = await tx.entry.findFirst({
      where: {
        id,
        userId: this.userId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      include: ENTRY_INCLUDE,
    })
    if (!row) throw new NotFoundError('Entry not found.')

    return toEntry(row)
  }
}
