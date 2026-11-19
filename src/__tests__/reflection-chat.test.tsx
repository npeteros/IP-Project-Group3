import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatPage from '@/app/(app)/chat/page'
import { limitChatHistory } from '@/src/lib/chat/useReflectionChat'
import {
  CHAT_MAX_MESSAGES,
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_MAX_TOTAL_MESSAGE_LENGTH,
} from '@/src/server/chat/schemas'

function streamResponse(text: string) {
  const chunks = [
    { type: 'text-start', id: 'response-1' },
    { type: 'text-delta', id: 'response-1', delta: text },
    { type: 'text-end', id: 'response-1' },
  ]
  const body = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('')
  return new Response(`${body}data: [DONE]\n\n`, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('reflection chat', () => {
  it('sends the API message shape and renders a streamed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse('A gentle reflection.'))
    vi.stubGlobal('fetch', fetchMock)
    render(<ChatPage />)

    fireEvent.click(
      screen.getByRole('button', { name: 'What themes keep coming up in my entries?' }),
    )

    expect(await screen.findByText('A gentle reflection.')).toBeTruthy()
    const request = fetchMock.mock.calls[0][1]
    expect(JSON.parse(String(request?.body))).toEqual({
      messages: [{ role: 'user', content: 'What themes keep coming up in my entries?' }],
    })
  })

  it('shows a friendly rate-limit message and lets the user retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'TOO_MANY_REQUESTS' } }), { status: 429 }),
      )
      .mockResolvedValueOnce(streamResponse('Try reflecting on one small moment.'))
    vi.stubGlobal('fetch', fetchMock)
    render(<ChatPage />)

    fireEvent.click(screen.getByRole('button', { name: 'What has been weighing on me lately?' }))
    const error = await screen.findByRole('alert')
    expect(error.textContent).toContain("You've reached the AI limit for now, try again later.")

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Try reflecting on one small moment.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('aborts an in-flight request when Stop is pressed', async () => {
    let requestSignal: AbortSignal | undefined
    const fetchMock = vi.fn((_url: RequestInfo | URL, options?: RequestInit) => {
      requestSignal = options?.signal ?? undefined
      return new Promise<Response>(() => {})
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<ChatPage />)

    fireEvent.click(
      screen.getByRole('button', { name: 'What themes keep coming up in my entries?' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }))

    expect(requestSignal?.aborted).toBe(true)
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps recent messages within the request limits', () => {
    const history = Array.from({ length: CHAT_MAX_MESSAGES }, (_, index) => ({
      id: String(index),
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: String(index).padEnd(CHAT_MAX_MESSAGE_LENGTH, 'x'),
    }))
    const limited = limitChatHistory([
      ...history,
      { id: 'latest', role: 'user', content: 'latest question' },
    ])

    expect(limited.length).toBeLessThanOrEqual(CHAT_MAX_MESSAGES)
    expect(
      limited.reduce((total, message) => total + message.content.length, 0),
    ).toBeLessThanOrEqual(CHAT_MAX_TOTAL_MESSAGE_LENGTH)
    expect(limited.at(-1)).toEqual({ role: 'user', content: 'latest question' })
  })

  it('exposes an inline error and retry for other failed requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Please try again.' } }), {
          status: 500,
        }),
      )
      .mockResolvedValueOnce(streamResponse('I’m here when you’re ready.'))
    vi.stubGlobal('fetch', fetchMock)
    render(<ChatPage />)

    fireEvent.click(
      screen.getByRole('button', { name: 'What moments have brought me joy recently?' }),
    )
    expect((await screen.findByRole('alert')).textContent).toContain('Please try again.')

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByText('I’m here when you’re ready.')).toBeTruthy())
  })
})
