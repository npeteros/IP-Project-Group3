import type { Prisma, PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import type { EntryCreateInput, EntryUpdateInput } from '@/src/lib/schemas'
import { BadRequestError, ConflictError, NotFoundError } from '@/src/server/api/errors'

// Re-exported so existing imports (e.g. the api.entry hooks) keep working
export type { EntryCreateInput, EntryUpdateInput }

// Placeholder types until the response schemas land
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

export type EntryListInput = {
  skip?: number
  take?: number
  searchText?: string
  tagId?: string
  entryStartDate?: string
  entryEndDate?: string
}

const DEFAULT_TIME_ZONE = 'UTC'

/** Loads an entry together with its tags, ordered the same way everywhere. */
const entryInclude = {
  tags: { include: { tag: true }, orderBy: { tag: { name: 'asc' } } },
} satisfies Prisma.EntryInclude

type EntryRecord = Prisma.EntryGetPayload<{ include: typeof entryInclude }>

/** Tags are unique per user by this key, so "Work", "work" and " WORK " are one tag. */
function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
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

function parseWrittenAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new BadRequestError('writtenAt is not a valid date.')
  return date
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

  async findManyEntries(_input: EntryListInput): Promise<{ entries: Entry[]; total: number }> {
    throw new Error('Not implemented')
  }

  async findOneEntry(_id: string): Promise<Entry> {
    throw new Error('Not implemented')
  }

  async createEntry(input: EntryCreateInput): Promise<Entry> {
    const writtenAt = input.writtenAt ? parseWrittenAt(input.writtenAt) : new Date()
    const entryDate = toEntryDate(writtenAt, input.timeZone ?? DEFAULT_TIME_ZONE)

    return this.write(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          userId: this.userId,
          title: input.title ?? null,
          body: input.body,
          writtenAt,
          entryDate,
        },
      })

      await this.syncTags(tx, entry.id, input.tags ?? [])
      return this.readEntry(tx, entry.id)
    })
  }

  async updateEntry(id: string, input: EntryUpdateInput): Promise<Entry> {
    const writtenAt = input.writtenAt === undefined ? undefined : parseWrittenAt(input.writtenAt)
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
   * user (matched case-insensitively on `normalizedName`), links the ones that
   * aren't linked yet, and unlinks the rest. Shared by create and update.
   */
  private async syncTags(tx: Prisma.TransactionClient, entryId: string, names: string[]) {
    // De-duplicate within the request; the first spelling wins as the display name
    const byNormalized = new Map<string, string>()
    for (const raw of names) {
      const name = raw.trim().replace(/\s+/g, ' ')
      const normalizedName = normalizeTagName(name)
      if (normalizedName && !byNormalized.has(normalizedName))
        byNormalized.set(normalizedName, name)
    }

    const tagIds: string[] = []
    for (const [normalizedName, name] of byNormalized) {
      // Update is empty on purpose: an existing tag keeps the spelling it was created with
      const tag = await tx.tag.upsert({
        where: { userId_normalizedName: { userId: this.userId, normalizedName } },
        create: { userId: this.userId, name, normalizedName },
        update: {},
        select: { id: true },
      })
      tagIds.push(tag.id)
    }

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
    const record = await tx.entry.findFirst({
      where: {
        id,
        userId: this.userId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      include: entryInclude,
    })
    if (!record) throw new NotFoundError('Entry not found.')

    return toEntry(record)
  }
}

function toEntry(record: EntryRecord): Entry {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    body: record.body,
    writtenAt: record.writtenAt,
    entryDate: record.entryDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags: record.tags.map(({ tag }) => ({ id: tag.id, name: tag.name })),
  }
}
