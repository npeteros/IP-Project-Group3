'use client'

import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { APP_NAME, CHAT_PAGE } from '@/src/lib/constants'
import { CHAT_MAX_MESSAGE_LENGTH } from '@/src/server/chat/schemas'
import { useReflectionChat, type ReflectionChatMessage } from '@/src/lib/chat/useReflectionChat'
import { typography } from '@/src/lib/typography'

const STARTER_PROMPTS = [
  'What themes keep coming up in my entries?',
  'What has been weighing on me lately?',
  'What moments have brought me joy recently?',
]

function MessageBubble({
  message,
  pending,
  onRetry,
}: {
  message: ReflectionChatMessage
  pending: boolean
  onRetry: () => void
}) {
  if (message.role === 'user') {
    return (
      <div className="max-w-[78%] self-end rounded-[18px_18px_4px_18px] bg-neutral-900 px-4 py-3 text-sm leading-[1.5] text-surface lg:max-w-[70%] lg:px-[18px] lg:py-3.5 lg:text-[15px] lg:leading-[1.55]">
        {message.content}
      </div>
    )
  }

  return (
    <div className="flex max-w-[82%] flex-col gap-1.5 self-start lg:max-w-[78%]">
      <div className="flex items-center gap-1.5">
        <Icon name="cloud" size={13} strokeWidth={2.2} className="text-cloud-700" />
        <span className="text-[11px] leading-none font-semibold text-neutral-400">{APP_NAME}</span>
      </div>
      <div className="rounded-[18px_18px_18px_4px] border border-neutral-200 bg-surface px-4 py-3 text-sm leading-[1.55] lg:px-[18px] lg:py-3.5 lg:text-[15px] lg:leading-[1.6]">
        {message.content ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : pending ? (
          <p className="text-neutral-400" aria-live="polite">
            Reflecting…
          </p>
        ) : null}
        {message.error && (
          <div className="mt-2 text-sm text-amber-700" role="alert">
            <p>{message.error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [input, setInput] = useState('')
  const { messages, status, sendMessage, retryMessage, stop } = useReflectionChat()
  const isPending = status !== 'ready'

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    sendMessage(input)
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 flex-none items-center border-b border-neutral-200 bg-surface px-5 lg:h-auto lg:border-none lg:bg-transparent lg:px-14 lg:pt-10 lg:pb-4">
        <div className="mx-auto w-full max-w-[760px]">
          <h1 className="text-[15px] leading-[1.2] font-semibold lg:font-serif lg:text-[30px] lg:leading-none">
            {CHAT_PAGE.title}
          </h1>
          <p className={`${typography.bodySmall} mt-2 hidden text-neutral-400 lg:block`}>
            {CHAT_PAGE.disclaimer}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 lg:px-14 lg:py-4">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 lg:gap-[18px]">
          <p className="max-w-[260px] self-center text-center text-[11px] leading-[1.4] font-medium text-neutral-400 lg:hidden">
            {CHAT_PAGE.disclaimer}
          </p>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center lg:py-16">
              <p className={`${typography.body} max-w-[420px] text-neutral-500`}>
                Start with a question about your journal, and we’ll reflect on what you’ve written.
              </p>
              <div className="flex max-w-[560px] flex-wrap justify-center gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isPending}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-neutral-200 bg-surface px-4 py-2 text-sm text-neutral-700 transition hover:border-cloud-700 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                pending={isPending && message.id === messages.at(-1)?.id}
                onRetry={() => retryMessage(message.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-none border-t border-neutral-200 bg-surface px-5 py-3.5 lg:border-none lg:bg-transparent lg:px-14 lg:pt-5 lg:pb-10">
        <form
          onSubmit={submitMessage}
          className="mx-auto flex w-full max-w-[760px] items-center gap-2.5 lg:gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={CHAT_MAX_MESSAGE_LENGTH}
            placeholder={CHAT_PAGE.inputPlaceholder}
            aria-label={CHAT_PAGE.inputPlaceholder}
            disabled={isPending}
            className="h-[46px] min-w-0 flex-1 rounded-full border border-neutral-200 bg-bg px-4 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 lg:h-[52px] lg:bg-surface lg:px-5 lg:text-[15px]"
          />
          {isPending ? (
            <button
              type="button"
              onClick={stop}
              className="h-[46px] flex-none rounded-full border border-neutral-200 px-4 text-sm font-medium text-neutral-700 lg:h-[52px]"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim()}
              className="flex size-[46px] flex-none items-center justify-center rounded-full bg-neutral-900 text-surface disabled:opacity-50 lg:size-[52px]"
            >
              <Icon name="send" size={18} />
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
