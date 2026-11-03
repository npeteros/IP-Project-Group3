import { z } from 'zod'

// Shared by the API routes, the client hooks, the OpenAPI spec and the editor form.
// Keep this file free of server-only imports (Prisma, `next/headers`, `auth`).

export const TAG_NAME_MAX_LENGTH = 32
export const TAGS_PER_ENTRY_MAX = 20

/** The per-user unique key for a tag: trimmed and lowercased, matching `Tag.normalizedName`. */
export function normalizeTagName(name: string) {
  return name.trim().toLowerCase()
}

function dedupeTags(tags: string[]) {
  const seen = new Set<string>()
  return tags.filter((tag) => {
    const key = normalizeTagName(tag)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// --- Fields -----------------------------------------------------------------

/** A blank title becomes `undefined`, which tells the server to generate one. */
const createTitle = z
  .string()
  .trim()
  .transform((title) => title || undefined)

/** A blank (or `null`) title becomes `null`, which clears it so a new one is generated. */
const updateTitle = z
  .string()
  .trim()
  .transform((title) => title || null)
  .nullable()

const body = z.string().trim().min(1, 'Write something before saving.')

/** The entry's calendar day is derived from this in `APP_TIME_ZONE`, so clients send no time zone. */
const writtenAt = z.iso.datetime({ offset: true, error: 'Enter a valid date and time.' })

const tagName = z
  .string()
  .trim()
  .min(1, 'Tag names cannot be empty.')
  .max(TAG_NAME_MAX_LENGTH, `Tag names can be at most ${TAG_NAME_MAX_LENGTH} characters.`)

/** Tag names, de-duplicated case-insensitively. The first spelling wins. */
const tags = z
  .array(tagName)
  .max(TAGS_PER_ENTRY_MAX, `An entry can have at most ${TAGS_PER_ENTRY_MAX} tags.`)
  .transform(dedupeTags)

// --- Requests ---------------------------------------------------------------

/** `POST /api/v1/entries` body */
export const EntryCreateSchema = z.object({
  title: createTitle.optional(),
  body,
  writtenAt: writtenAt.optional(),
  tags: tags.default([]),
})

export type EntryCreateInput = z.input<typeof EntryCreateSchema>
export type EntryCreateOutput = z.infer<typeof EntryCreateSchema>

/**
 * `PATCH /api/v1/entries/:id` body. No defaults: an omitted field is left unchanged.
 * When `tags` is present it replaces the entry's full set of tags.
 */
export const EntryUpdateSchema = z
  .object({
    title: updateTitle.optional(),
    body: body.optional(),
    writtenAt: writtenAt.optional(),
    tags: tags.optional(),
  })
  .refine(
    (input) =>
      input.title !== undefined ||
      input.body !== undefined ||
      input.writtenAt !== undefined ||
      input.tags !== undefined,
    'Change at least one of title, body, writtenAt or tags.',
  )

export type EntryUpdateInput = z.input<typeof EntryUpdateSchema>
export type EntryUpdateOutput = z.infer<typeof EntryUpdateSchema>

/** `:id` path param for `GET`, `PATCH` and `DELETE /api/v1/entries/:id` */
export const EntryIdSchema = z.object({
  id: z.uuid(),
})

export type EntryIdInput = z.input<typeof EntryIdSchema>
export type EntryIdOutput = z.infer<typeof EntryIdSchema>

/** `GET /api/v1/entries` query string. Values arrive as strings, so numbers are coerced. */
export const EntryListQuerySchema = z
  .object({
    skip: z.coerce.number<number>().int().min(0).default(0),
    take: z.coerce.number<number>().int().min(1).max(100).default(20),
    searchText: z
      .string()
      .trim()
      .transform((text) => text || undefined)
      .optional(),
    tagId: z.uuid().optional(),
    entryStartDate: z.iso.date().optional(),
    entryEndDate: z.iso.date().optional(),
  })
  .refine(
    // `YYYY-MM-DD` strings sort the same way as the dates they represent
    ({ entryStartDate, entryEndDate }) =>
      !entryStartDate || !entryEndDate || entryStartDate <= entryEndDate,
    { message: 'The end date must be on or after the start date.', path: ['entryEndDate'] },
  )

export type EntryListQueryInput = z.input<typeof EntryListQuerySchema>
export type EntryListQueryOutput = z.infer<typeof EntryListQuerySchema>

// --- Responses (as they arrive over JSON: dates are ISO strings) -------------

export const EntryTagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
})

export const EntrySchema = z
  .object({
    id: z.uuid(),
    title: z.string().nullable(),
    body: z.string(),
    writtenAt: z.iso.datetime({ offset: true }),
    entryDate: z.iso.date(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    tags: z.array(EntryTagSchema),
  })
  .meta({ id: 'Entry' })

export const EntryListSchema = z
  .object({
    entries: z.array(EntrySchema),
    total: z.number().int().min(0).meta({ description: 'Count before pagination.' }),
  })
  .meta({ id: 'EntryList' })

export type Entry = z.infer<typeof EntrySchema>
export type EntryList = z.infer<typeof EntryListSchema>
