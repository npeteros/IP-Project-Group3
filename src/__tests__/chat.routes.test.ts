// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { getSession } from '@/src/lib/auth'
import { handleChatStream } from '@mastra/ai-sdk'
import { USER_ID_KEY } from '@/src/mastra/guardrails/requestContext'

vi.mock('@/src/lib/auth', () => ({ getSession: vi.fn() }))

const chat = vi.hoisted(() => ({ handleChatStream: vi.fn() }))
const draftInstructions = vi.hoisted(() => ({
  build: vi.fn((draft: { title?: string; body: string }) => JSON.stringify(draft)),
}))
vi.mock('@mastra/ai-sdk', () => ({ handleChatStream: chat.handleChatStream }))
vi.mock('@/src/mastra', () => ({ mastra: {} }))
vi.mock('@/src/mastra/agents/reflection-agent', () => ({
  instructionsForEntryDraft: draftInstructions.build,
}))

import { POST } from '@/app/api/v1/chat/route'

const USER_ID = '3f2b1c4e-8a9d-4e7f-9b1a-2c3d4e5f6a7b'

function request(body?: unknown, raw?: string) {
  return new Request('http://localhost/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  }) as NextRequest
}

function stream(chunks: object[]) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue({
    user: { id: USER_ID },
  } as Awaited<ReturnType<typeof getSession>>)
  chat.handleChatStream.mockResolvedValue(
    stream([
      { type: 'text-start', id: 'text-1' },
      { type: 'text-delta', id: 'text-1', delta: 'A gentle reflection.' },
      { type: 'text-end', id: 'text-1' },
    ]),
  )
})

describe('POST /api/v1/chat', () => {
  it('streams a response with request-context identity and the editor draft', async () => {
    const req = request({
      messages: [{ role: 'user', content: 'What do you notice?' }],
      entryDraft: { title: 'A quiet day', body: 'I took a long walk after lunch.' },
    })
    const res = await POST(req, undefined as never)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const responseText = await res.text()
    expect(responseText).toContain('A gentle reflection.')

    expect(handleChatStream).toHaveBeenCalledOnce()
    const [options] = vi.mocked(handleChatStream).mock.calls[0]
    expect(options.agentId).toBe('reflection-agent')
    expect(options.version).toBe('v7')
    if (!options.params.requestContext) throw new Error('requestContext was not provided.')
    expect(options.params.requestContext.get(USER_ID_KEY)).toBe(USER_ID)
    expect(options.params.abortSignal).toBe(req.signal)
    expect(options.params.instructions).toContain('A quiet day')
    expect(options.params.instructions).toContain('I took a long walk after lunch.')
    expect(options.params.messages).toMatchObject([
      { role: 'user', parts: [{ type: 'text', text: 'What do you notice?' }] },
    ])
  })

  it('returns 401 without a session and does not start the agent', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await POST(
      request({ messages: [{ role: 'user', content: 'Hello' }] }),
      undefined as never,
    )

    expect(res.status).toBe(401)
    expect(chat.handleChatStream).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid message bodies', async () => {
    const res = await POST(request({ messages: [] }), undefined as never)

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(chat.handleChatStream).not.toHaveBeenCalled()
  })

  it('returns a machine-readable 429 for an AI-usage tripwire before streaming text', async () => {
    chat.handleChatStream.mockResolvedValue(
      stream([
        {
          type: 'data-tripwire',
          data: {
            reason: 'AI rate limit exceeded.',
            processorId: 'ai-usage',
            metadata: { code: 'TOO_MANY_REQUESTS' },
          },
        },
      ]),
    )

    const res = await POST(
      request({ messages: [{ role: 'user', content: 'Reflect with me.' }] }),
      undefined as never,
    )

    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({
      error: { code: 'TOO_MANY_REQUESTS', message: 'AI rate limit exceeded.' },
    })
  })
})
