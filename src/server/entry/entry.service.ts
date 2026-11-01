import type { PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
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

/** Entry reads and writes, scoped to one user. Implemented in #16 (queries) and #17 (mutations). */
export class EntryService {
  constructor(
    private readonly userId: string,
    private readonly db: PrismaClient = prisma,
  ) {}

  async findManyEntries(
    _input: EntryListQueryOutput,
  ): Promise<{ entries: Entry[]; total: number }> {
    throw new Error('Not implemented')
  }

  async findOneEntry(_id: string): Promise<Entry> {
    throw new Error('Not implemented')
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
