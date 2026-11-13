'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatRequestInput } from '@/src/server/chat/schemas'
import {
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_MAX_MESSAGES,
  CHAT_MAX_TOTAL_MESSAGE_LENGTH,
} from '@/src/server/chat/schemas'

export type ReflectionChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  error?: string
}

type ChatStatus = 'ready' | 'submitted' | 'streaming'
type ChatRequestMessage = NonNullable<ChatRequestInput['messages']>[number]

export function limitChatHistory(messages: ReflectionChatMessage[]): ChatRequestMessage[] {
  const recent: ChatRequestMessage[] = []
  let totalLength = 0

  for (const message of messages.slice(-CHAT_MAX_MESSAGES).reverse()) {
    const content = message.content.trim().slice(-CHAT_MAX_MESSAGE_LENGTH)
    if (!content) continue
    if (totalLength + content.length > CHAT_MAX_TOTAL_MESSAGE_LENGTH) break

    recent.push({ role: message.role, content })
    totalLength += content.length
  }

  return recent.reverse()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function streamErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "We couldn't send that message. Please try again."
}

async function readErrorResponse(response: Response): Promise<string> {
  if (response.status === 429) {
    return "You've reached the AI limit for now, try again later."
  }

  try {
    const body: unknown = await response.json()
    if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string') {
      return body.error.message
    }
  } catch {
    // Non-JSON errors use the generic recoverable message below.
  }

  return "We couldn't send that message. Please try again."
}

async function consumeUiMessageStream(
  response: Response,
  onText: (delta: string) => void,
): Promise<void> {
  if (!response.body) throw new Error('The chat response did not include a stream.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let dataLines: string[] = []

  const dispatch = () => {
    if (dataLines.length === 0) return
    const data = dataLines.join('\n')
    dataLines = []
    if (data === '[DONE]') return

    let chunk: unknown
    try {
      chunk = JSON.parse(data)
    } catch {
      throw new Error('The chat response stream was invalid.')
    }

    if (!isRecord(chunk)) return
    if (chunk.type === 'error') {
      throw new Error(
        typeof chunk.errorText === 'string'
          ? chunk.errorText
          : "We couldn't finish that response. Please try again.",
      )
    }
    if (chunk.type === 'text-delta' && typeof chunk.delta === 'string') {
      onText(chunk.delta)
    }
  }

  const processLine = (line: string) => {
    if (line === '') {
      dispatch()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })

      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        processLine(buffer.slice(0, newline).replace(/\r$/, ''))
        buffer = buffer.slice(newline + 1)
        newline = buffer.indexOf('\n')
      }

      if (done) {
        if (buffer) processLine(buffer.replace(/\r$/, ''))
        dispatch()
        break
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function useReflectionChat({
  entryDraft,
}: { entryDraft?: ChatRequestInput['entryDraft'] } = {}) {
  const [messages, setMessages] = useState<ReflectionChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const controllerRef = useRef<AbortController | null>(null)
  const activeAssistantIdRef = useRef<string | null>(null)

  const streamResponse = useCallback(
    async (conversation: ReflectionChatMessage[], assistantId: string) => {
      const controller = new AbortController()
      controllerRef.current = controller
      activeAssistantIdRef.current = assistantId
      setStatus('submitted')

      try {
        const requestMessages = limitChatHistory(conversation)
        const response = await fetch('/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: requestMessages,
            ...(entryDraft ? { entryDraft } : {}),
          }),
          signal: controller.signal,
        })

        if (!response.ok) throw new Error(await readErrorResponse(response))

        await consumeUiMessageStream(response, (delta) => {
          setStatus('streaming')
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + delta }
                : message,
            ),
          )
        })
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, error: streamErrorMessage(error) }
                : message,
            ),
          )
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null
          activeAssistantIdRef.current = null
          setStatus('ready')
        }
      }
    },
    [entryDraft],
  )

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || trimmed.length > CHAT_MAX_MESSAGE_LENGTH || status !== 'ready') return

      const userMessage: ReflectionChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
      }
      const assistantMessage: ReflectionChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
      }
      const conversation = [...messages, userMessage]

      setMessages([...conversation, assistantMessage])
      void streamResponse(conversation, assistantMessage.id)
    },
    [messages, status, streamResponse],
  )

  const retryMessage = useCallback(
    (assistantId: string) => {
      if (status !== 'ready') return
      const assistantIndex = messages.findIndex((message) => message.id === assistantId)
      if (assistantIndex < 1) return

      const conversation = messages.slice(0, assistantIndex)
      if (conversation.at(-1)?.role !== 'user') return

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? { ...message, content: '', error: undefined } : message,
        ),
      )
      void streamResponse(conversation, assistantId)
    },
    [messages, status, streamResponse],
  )

  const stop = useCallback(() => {
    const assistantId = activeAssistantIdRef.current
    controllerRef.current?.abort()
    controllerRef.current = null
    activeAssistantIdRef.current = null
    setStatus('ready')
    if (assistantId) {
      setMessages((current) =>
        current.filter((message) => message.id !== assistantId || message.content.length > 0),
      )
    }
  }, [])

  useEffect(
    () => () => {
      controllerRef.current?.abort()
    },
    [],
  )

  return { messages, status, sendMessage, retryMessage, stop }
}
