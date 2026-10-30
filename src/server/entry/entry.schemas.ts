import { z } from 'zod'

// Interim home for the read schemas until the full entry schemas (#15) land
const isoDate = z.iso.date()

export const EntryListQuerySchema = z
  .object({
    skip: z.coerce.number().int().min(0).default(0),
    take: z.coerce.number().int().min(1).max(100).default(20),
    searchText: z.string().trim().min(1).optional(),
    tagId: z.string().min(1).optional(),
    entryStartDate: isoDate.optional(),
    entryEndDate: isoDate.optional(),
  })
  .refine((v) => !v.entryStartDate || !v.entryEndDate || v.entryStartDate <= v.entryEndDate, {
    message: 'entryStartDate must be on or before entryEndDate.',
    path: ['entryEndDate'],
  })

export type EntryListQuery = z.output<typeof EntryListQuerySchema>

export const EntryIdSchema = z.object({ id: z.string().min(1) })

export type EntryId = z.output<typeof EntryIdSchema>
