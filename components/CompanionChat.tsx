'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  clearConversation,
  readConversation,
  storeConversation,
} from '@/src/lib/chat/companionConversations'
import { toEntryDraft } from '@/src/lib/chat/toEntryDraft'
import { useReflectionChat } from '@/src/lib/chat/useReflectionChat'
import { AI_PANEL } from '@/src/lib/constants'
import { CHAT_MAX_MESSAGE_LENGTH } from '@/src/server/chat/schemas'
import { Icon } from './Icon'

const QUIET_TEXT = 'text-xs leading-[1.5] text-neutral-600'

/**
 * Chat with the reflection agent about the entry being written, through the same hook as the
 * /chat page so a rate limit or error reads the same in both. The conversation is session only
 * and is gone when the user leaves the entry. With a `conversationId` it is kept in
 * `companionConversations` while this is mounted, so a caller can carry it over to another page
 * (the first save on /journal/new). The agent is sent the title and body as they are right now,
 * so it can answer about unsaved text too.
 */
export function CompanionChat({
  draft,
  conversationId,
}: {
  draft: { title: string; body: string }
  conversationId?: string
}) {
  const { title, body } = draft
  const entryDraft = useMemo(() => toEntryDraft({ title, body }), [title, body])
  const { messages, status, sendMessage, retryMessage } = useReflectionChat({
    entryDraft,
    initialMessages: () => (conversationId ? readConversation(conversationId) : []),
  })
  const [text, setText] = useState('')
  const busy = status !== 'ready'

  useEffect(() => {
    if (conversationId) storeConversation(conversationId, messages, { replying: busy })
  }, [conversationId, messages, busy])

  // Leaving the entry ends the conversation. A caller that moved it to another key first keeps it.
  useEffect(() => {
    if (!conversationId) return
    return () => clearConversation(conversationId)
  }, [conversationId])

  function submit(event: React.SyntheticEvent) {
    event.preventDefault()
    if (!text.trim() || busy) return
    sendMessage(text)
    setText('')
  }

  return (
    <section
      aria-label={AI_PANEL.companionName}
      className="flex flex-col gap-3 rounded-2xl border border-cloud-200 bg-surface p-4 shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-[22px] flex-none items-center justify-center rounded-full bg-cloud-100 text-cloud-700">
          <Icon name="cloud" size={12} strokeWidth={2.4} />
        </span>
        <span className="text-xs leading-none font-semibold text-neutral-400">
          {AI_PANEL.companionName}
        </span>
      </div>

      {messages.length === 0 && (
        <p className="font-serif text-[15px] leading-normal font-medium">
          {AI_PANEL.companionIntro}
        </p>
      )}

      {messages.length > 0 && (
        <div role="log" aria-label="Conversation" className="flex flex-col gap-2.5">
          {messages.map((message) =>
            message.role === 'user' ? (
              <p
                key={message.id}
                className="max-w-[88%] self-end rounded-[14px_14px_4px_14px] bg-neutral-900 px-3 py-2 text-[13px] leading-[1.5] text-surface"
              >
                {message.content}
              </p>
            ) : (
              <div key={message.id} className="flex flex-col gap-2">
                {message.content && (
                  <p className="max-w-[92%] self-start rounded-[14px_14px_14px_4px] border border-neutral-200 px-3 py-2 text-[13px] leading-[1.55] whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}
                {/* The reply hasn't started yet: the hook adds an empty assistant message first */}
                {!message.content && !message.error && (
                  <output className={`${QUIET_TEXT} block animate-pulse`}>Thinking…</output>
                )}
                {/* A rate limit or error is a quiet note, never an alert, and never blocks writing */}
                {message.error && (
                  <div className="flex flex-wrap items-center gap-2">
                    <output className={QUIET_TEXT}>{message.error}</output>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => retryMessage(message.id)}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs leading-none font-medium text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="text"
          aria-label="Ask the companion"
          placeholder={AI_PANEL.companionPlaceholder}
          maxLength={CHAT_MAX_MESSAGE_LENGTH}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-full border border-neutral-200 bg-bg px-3.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          className="h-9 flex-none rounded-full bg-neutral-900 px-4 text-xs leading-none font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  )
}
