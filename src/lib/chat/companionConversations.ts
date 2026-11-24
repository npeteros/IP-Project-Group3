import type { ReflectionChatMessage } from '@/src/lib/chat/useReflectionChat'

/**
 * Companion conversations, held in memory for the session only and never sent anywhere.
 *
 * Saving on /journal/new opens the entry at /journal/[id], a different page, so the Companion
 * remounts. The conversation is kept here under a key so it survives that move. Each page clears
 * its key when it unmounts, so leaving the entry still ends the conversation.
 */
const conversations = new Map<string, ReflectionChatMessage[]>()

/** The key for the conversation on /journal/new, before the entry has an id. */
export const NEW_ENTRY_CONVERSATION = 'new'

export const INTERRUPTED_REPLY = 'This reply was interrupted.'

export function readConversation(key: string): ReflectionChatMessage[] {
  return conversations.get(key) ?? []
}

/**
 * Stores the conversation under `key`. Pass `replying` while a reply is still streaming: if the
 * page goes away before it finishes, the stored copy marks that reply as interrupted, so it can
 * be retried instead of looking stuck.
 */
export function storeConversation(
  key: string,
  messages: ReflectionChatMessage[],
  { replying = false }: { replying?: boolean } = {},
) {
  const last = messages.at(-1)
  conversations.set(
    key,
    replying && last?.role === 'assistant' && !last.error
      ? [...messages.slice(0, -1), { ...last, error: INTERRUPTED_REPLY }]
      : messages,
  )
}

/** Moves a conversation to a new key, e.g. from /journal/new to the entry it was saved as. */
export function moveConversation(from: string, to: string) {
  const messages = conversations.get(from)
  conversations.delete(from)
  if (messages) conversations.set(to, messages)
}

export function clearConversation(key: string) {
  conversations.delete(key)
}
