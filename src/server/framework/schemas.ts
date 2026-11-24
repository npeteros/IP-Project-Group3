import { z } from 'zod'
import { FRAMEWORK_ICONS } from '@/src/lib/constants'

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

export const FRAMEWORK_NAME_MAX_LENGTH = 80
export const FRAMEWORK_DESCRIPTION_MAX_LENGTH = 160
export const FRAMEWORK_PROMPT_MAX_LENGTH = 200
export const FRAMEWORK_PROMPTS_MAX = 10

/** `POST /api/v1/frameworks` body. The duration isn't sent: it's estimated from the prompts. */
export const FrameworkCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a framework name.')
    .max(
      FRAMEWORK_NAME_MAX_LENGTH,
      `Framework names can be at most ${FRAMEWORK_NAME_MAX_LENGTH} characters.`,
    ),
  description: z
    .string()
    .trim()
    .min(1, 'Enter a framework description.')
    .max(
      FRAMEWORK_DESCRIPTION_MAX_LENGTH,
      `Descriptions can be at most ${FRAMEWORK_DESCRIPTION_MAX_LENGTH} characters.`,
    ),
  icon: z.enum(FRAMEWORK_ICONS, 'Choose an icon.'),
  prompts: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Prompts cannot be empty.')
        .max(
          FRAMEWORK_PROMPT_MAX_LENGTH,
          `Prompts can be at most ${FRAMEWORK_PROMPT_MAX_LENGTH} characters.`,
        ),
    )
    .min(1, 'Add at least one prompt.')
    .max(FRAMEWORK_PROMPTS_MAX, `A framework can have at most ${FRAMEWORK_PROMPTS_MAX} prompts.`),
})

export type FrameworkCreateInput = z.input<typeof FrameworkCreateSchema>
export type FrameworkCreateOutput = z.infer<typeof FrameworkCreateSchema>

export type Framework = z.infer<typeof FrameworkSchema>
export type FrameworkList = z.infer<typeof FrameworkListSchema>
