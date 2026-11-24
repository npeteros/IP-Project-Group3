import { afterEach, describe, expect, it } from 'vitest'
import {
  INTERRUPTED_REPLY,
  clearConversation,
  moveConversation,
  readConversation,
  storeConversation,
} from '@/src/lib/chat/companionConversations'
import type { ReflectionChatMessage } from '@/src/lib/chat/useReflectionChat'

const question: ReflectionChatMessage = { id: 'u1', role: 'user', content: 'Hi' }
const answer: ReflectionChatMessage = { id: 'a1', role: 'assistant', content: 'Hello.' }

afterEach(() => {
  clearConversation('a')
  clearConversation('b')
})

describe('companionConversations', () => {
  it('reads back what was stored, and nothing for an unknown key', () => {
    storeConversation('a', [question, answer])
    expect(readConversation('a')).toEqual([question, answer])
    expect(readConversation('b')).toEqual([])
  })

  it('marks the last reply as interrupted when stored mid-reply', () => {
    storeConversation('a', [question, { ...answer, content: '' }], { replying: true })
    expect(readConversation('a')).toEqual([
      question,
      { ...answer, content: '', error: INTERRUPTED_REPLY },
    ])
  })

  it('keeps an existing error, and leaves a trailing question alone, mid-reply', () => {
    const failed = { ...answer, error: 'Something went wrong.' }
    storeConversation('a', [question, failed], { replying: true })
    expect(readConversation('a')).toEqual([question, failed])

    storeConversation('b', [question], { replying: true })
    expect(readConversation('b')).toEqual([question])
  })

  it('moves a conversation to a new key', () => {
    storeConversation('a', [question])
    moveConversation('a', 'b')
    expect(readConversation('a')).toEqual([])
    expect(readConversation('b')).toEqual([question])
  })

  it('moving a missing conversation leaves the target untouched', () => {
    storeConversation('b', [question])
    moveConversation('a', 'b')
    expect(readConversation('b')).toEqual([question])
  })

  it('clears a conversation', () => {
    storeConversation('a', [question])
    clearConversation('a')
    expect(readConversation('a')).toEqual([])
  })
})
