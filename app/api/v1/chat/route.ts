import { handleChatStream } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse } from 'ai'
import { mastra } from '@/src/mastra'
import { createUserRequestContext } from '@/src/mastra/guardrails/requestContext'
import { prepareUiStream } from '@/src/mastra/guardrails/AiUsageProcessor'
import { instructionsForEntryDraft } from '@/src/mastra/agents/reflection-agent'
import { readJsonBody, withAuth } from '@/src/server/api/handler'
import { ChatRequestSchema } from '@/src/server/chat/schemas'

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
