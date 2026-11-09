import { z } from 'zod'
import { EntryTagSchema, tagName } from '@/src/server/entry/schemas'

// Shared by the API routes, the client hooks and the OpenAPI spec.
// Keep this file free of server-only imports (Prisma, `next/headers`, `auth`).

export const TagIdSchema = z.object({
  id: z.uuid(),
})

export type TagIdInput = z.input<typeof TagIdSchema>
export type TagIdOutput = z.infer<typeof TagIdSchema>

/** `PATCH /api/v1/tags/:id` body. Uniqueness is checked case-insensitively on `normalizedName`. */
export const TagRenameSchema = z.object({
  name: tagName,
})

export type TagRenameInput = z.input<typeof TagRenameSchema>
export type TagRenameOutput = z.infer<typeof TagRenameSchema>

export const TagSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    entryCount: z
      .number()
      .int()
      .min(0)
      .meta({ description: 'Live (not soft-deleted) entries with this tag.' }),
  })
  .meta({ id: 'Tag' })

export const TagListSchema = z
  .object({
    tags: z.array(TagSchema),
  })
  .meta({ id: 'TagList' })

export const TagRenameResponseSchema = EntryTagSchema

export type Tag = z.infer<typeof TagSchema>
export type TagList = z.infer<typeof TagListSchema>
export type TagRenameResponse = z.infer<typeof TagRenameResponseSchema>
