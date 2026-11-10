import { z } from 'zod'

// Shared by framework routes, client procedures, and forms; keep this file server-agnostic.

export const FrameworkSchema = z
  .object({
    id: z.uuid(),
    userId: z.string().nullable(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    durationMinutes: z.number().int().positive(),
    prompts: z.array(z.string()),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .meta({ id: 'Framework' })

export const FrameworkListSchema = z
  .object({
    frameworks: z.array(FrameworkSchema),
  })
  .meta({ id: 'FrameworkList' })

export const FrameworkIdSchema = z.object({
  id: z.uuid(),
})

export type FrameworkIdInput = z.input<typeof FrameworkIdSchema>
export type FrameworkIdOutput = z.infer<typeof FrameworkIdSchema>

export const FrameworkCreateSchema = z.object({
  name: z.string().trim().min(1, 'Enter a framework name.'),
  description: z.string().trim().min(1, 'Enter a framework description.'),
  icon: z.string().trim().min(1, 'Choose an icon.'),
  durationMinutes: z.number().int().positive(),
  prompts: z
    .array(z.string().trim().min(1, 'Prompts cannot be empty.'))
    .min(1, 'Add at least one prompt.')
    .max(10, 'A framework can have at most 10 prompts.'),
})

export type FrameworkCreateInput = z.input<typeof FrameworkCreateSchema>
export type FrameworkCreateOutput = z.infer<typeof FrameworkCreateSchema>

export type Framework = z.infer<typeof FrameworkSchema>
export type FrameworkList = z.infer<typeof FrameworkListSchema>
