import { handleChatStream } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse } from 'ai'
import { mastra } from '@/src/mastra'
import { createUserRequestContext } from '@/src/mastra/guardrails/requestContext'
import { isAiRateLimited, type TripwireInfo } from '@/src/mastra/guardrails/AiUsageProcessor'
import { instructionsForEntryDraft } from '@/src/mastra/agents/reflection-agent'
import { readJsonBody, withAuth } from '@/src/server/api/handler'
import { TooManyRequestsError } from '@/src/server/api/errors'
import { ChatRequestSchema } from '@/src/server/chat/schemas'

type StreamChunk = { type: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getTripwireInfo(chunk: unknown): TripwireInfo | undefined {
  if (!isRecord(chunk) || chunk.type !== 'data-tripwire' || !isRecord(chunk.data)) {
    return undefined
  }

  const { data } = chunk
  return {
    reason: typeof data.reason === 'string' ? data.reason : undefined,
    processorId: typeof data.processorId === 'string' ? data.processorId : undefined,
    metadata: data.metadata,
  }
}

async function prepareUiStream<T extends StreamChunk>(
  stream: ReadableStream<T>,
): Promise<ReadableStream<T>> {
  const reader = stream.getReader()
  const bufferedChunks: T[] = []
  let reachedText = false

  while (!reachedText) {
    const { done, value } = await reader.read()
    if (done) break

    bufferedChunks.push(value)
    const tripwire = getTripwireInfo(value)
    if (isAiRateLimited(tripwire)) {
      await reader.cancel()
      throw new TooManyRequestsError(tripwire?.reason ?? 'AI rate limit exceeded.')
    }

    reachedText = value.type === 'text-delta'
  }

  let bufferedIndex = 0
  return new ReadableStream<T>({
    async pull(controller) {
      if (bufferedIndex < bufferedChunks.length) {
        controller.enqueue(bufferedChunks[bufferedIndex])
        bufferedIndex += 1
        return
      }

      const { done, value } = await reader.read()
      if (done) controller.close()
      else controller.enqueue(value)
    },
    cancel(reason) {
      return reader.cancel(reason)
    },
  })
}

export const POST = withAuth(async ({ request, user }) => {
  const input = ChatRequestSchema.parse(await readJsonBody(request))
  const messages = input.messages.map(({ role, content }) => ({
    id: crypto.randomUUID(),
    role,
    parts: [{ type: 'text' as const, text: content }],
  }))

  const stream = await handleChatStream({
    mastra,
    agentId: 'reflection-agent',
    version: 'v7',
    params: {
      messages,
      requestContext: createUserRequestContext(user.id),
      abortSignal: request.signal,
      ...(input.entryDraft && { instructions: instructionsForEntryDraft(input.entryDraft) }),
    },
  })

  return createUIMessageStreamResponse({ stream: await prepareUiStream(stream) })
})
