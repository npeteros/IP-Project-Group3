import type { PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'

// Placeholder types until the entry schemas (#15) and Prisma models land
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

export type EntryCreateInput = {
  title?: string
  body: string
  writtenAt?: string
  timeZone?: string
  tags?: string[]
}

export type EntryUpdateInput = Partial<EntryCreateInput>

/** Entry reads and writes, scoped to one user. Implemented in #16 (queries) and #17 (mutations). */
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

  async createEntry(_input: EntryCreateInput): Promise<Entry> {
    throw new Error('Not implemented')
  }

  async updateEntry(_id: string, _input: EntryUpdateInput): Promise<Entry> {
    throw new Error('Not implemented')
  }

  async deleteEntry(_id: string): Promise<Entry> {
    throw new Error('Not implemented')
  }
}
