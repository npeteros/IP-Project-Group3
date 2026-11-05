// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AnySpan } from '@mastra/core/observability'
import { ContentRedactionProcessor } from '@/src/mastra/observability'

function agentRunSpan() {
  return {
    input: 'Help me reflect on my journal entry about Manila.',
    output: 'Sunny, 31°C',
    attributes: {
      prompt: 'Help me reflect on my journal entry about Manila.',
      instructions: 'You are a supportive journaling companion.',
      maxSteps: 5,
    },
  } as unknown as AnySpan
}

describe('ContentRedactionProcessor', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('strips input, output, prompt and instructions but keeps other attributes', () => {
    const span = new ContentRedactionProcessor().process(agentRunSpan())

    expect(span?.input).toBeUndefined()
    expect(span?.output).toBeUndefined()
    expect(span?.attributes).toEqual({ prompt: undefined, instructions: undefined, maxSteps: 5 })
  })

  it('leaves content in place when AI_LOG_CONTENT=true', () => {
    vi.stubEnv('AI_LOG_CONTENT', 'true')

    const span = new ContentRedactionProcessor().process(agentRunSpan())

    expect(span).toEqual(agentRunSpan())
  })
})
