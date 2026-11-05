import { z } from 'zod'

export const CHAT_MAX_MESSAGES = 16
export const CHAT_MAX_MESSAGE_LENGTH = 4_000
export const CHAT_MAX_TOTAL_MESSAGE_LENGTH = 32_000
export const CHAT_MAX_DRAFT_LENGTH = 12_000

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(CHAT_MAX_MESSAGE_LENGTH),
})

const EntryDraftSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(CHAT_MAX_DRAFT_LENGTH),
})

export const ChatRequestSchema = z
  .object({
    messages: z.array(ChatMessageSchema).min(1).max(CHAT_MAX_MESSAGES),
    entryDraft: EntryDraftSchema.optional(),
  })
  .refine(
    ({ messages }) =>
      messages.reduce((total, message) => total + message.content.length, 0) <=
      CHAT_MAX_TOTAL_MESSAGE_LENGTH,
    {
      message: `Combined message content must be at most ${CHAT_MAX_TOTAL_MESSAGE_LENGTH} characters.`,
      path: ['messages'],
    },
  )

export type ChatRequestInput = z.input<typeof ChatRequestSchema>
export type ChatRequestOutput = z.infer<typeof ChatRequestSchema>
