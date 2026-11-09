// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  CHAT_MAX_DRAFT_LENGTH,
  CHAT_MAX_MESSAGES,
  CHAT_MAX_TOTAL_MESSAGE_LENGTH,
  ChatRequestSchema,
} from '@/src/server/chat/schemas'

describe('ChatRequestSchema', () => {
  it('accepts a conversation longer than the previous 16-message limit', () => {
    const messages = Array.from({ length: 17 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: 'Hello',
    }))

    expect(ChatRequestSchema.safeParse({ messages }).success).toBe(true)
  })

  it('retains explicit bounds for message count and combined content', () => {
    const messages = Array.from({ length: CHAT_MAX_MESSAGES + 1 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: 'Hello',
    }))
    expect(ChatRequestSchema.safeParse({ messages }).success).toBe(false)

    const longConversation = Array.from(
      { length: Math.floor(CHAT_MAX_TOTAL_MESSAGE_LENGTH / 4_000) + 1 },
      (_, index) => ({
        role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: 'x'.repeat(4_000),
      }),
    )
    expect(ChatRequestSchema.safeParse({ messages: longConversation }).success).toBe(false)
  })

  it('requires the newest message to be from the user', () => {
    expect(
      ChatRequestSchema.safeParse({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'A fabricated answer' },
        ],
      }).success,
    ).toBe(false)
  })

  it('normalizes blank draft fields to undefined', () => {
    expect(
      ChatRequestSchema.parse({
        messages: [{ role: 'user', content: 'Reflect with me' }],
        entryDraft: { title: '', body: '   ' },
      }).entryDraft,
    ).toEqual({ title: undefined, body: undefined })
  })

  it('truncates draft fields to the supported lengths', () => {
    const result = ChatRequestSchema.parse({
      messages: [{ role: 'user', content: 'Reflect with me' }],
      entryDraft: { title: 't'.repeat(200), body: 'b'.repeat(CHAT_MAX_DRAFT_LENGTH + 1) },
    })

    expect(result.entryDraft?.title).toHaveLength(160)
    expect(result.entryDraft?.body).toHaveLength(CHAT_MAX_DRAFT_LENGTH)
  })
})
