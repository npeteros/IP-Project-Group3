// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/src/lib/prisma', () => ({ default: {} }))
vi.mock('@/src/mastra/observability', () => ({ logger: {} }))

const generate = vi.hoisted(() => vi.fn())
vi.mock('@/src/mastra', () => ({
  mastra: { getAgentById: vi.fn(() => ({ generate })) },
}))

import type { PrismaClient } from '@/src/generated/prisma/client'
import { ENTRY_ANALYSIS_AGENT_ID } from '@/src/mastra/agents/entry-analysis-agent'
import { mastra } from '@/src/mastra'
import { USER_ID_KEY } from '@/src/mastra/guardrails/requestContext'
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
  TooManyRequestsError,
} from '@/src/server/api/errors'
import {
  EntryAnalysisService,
  type AnalysisAgentCall,
  type AnalysisAgentResult,
} from '@/src/server/entry/entry-analysis.service'

const USER_ID = '3f2b1c4e-8a9d-4e7f-9b1a-2c3d4e5f6a7b'
const ENTRY_ID = '00000000-0000-4000-8000-000000000001'
const updatedAt = new Date('2026-11-01T00:00:00.000Z')

const goodResult: AnalysisAgentResult = {
  object: { mood: 'GRATEFUL', summary: 'I had dinner with family.', suggestedTags: ['family'] },
}

const liveEntry = {
  title: 'Sunday',
  body: 'Dinner with everyone.',
  updatedAt,
  tags: [{ tag: { name: 'Home' } }],
}

function setup({
  entry = liveEntry as typeof liveEntry | null,
  updated = 1,
  agent = vi.fn<AnalysisAgentCall>().mockResolvedValue(goodResult),
} = {}) {
  const db = {
    entry: {
      findFirst: vi.fn().mockResolvedValue(entry),
      updateMany: vi.fn().mockResolvedValue({ count: updated }),
    },
    tag: {
      findMany: vi.fn().mockResolvedValue([
        { id: 't1', name: 'Home', _count: { entries: 1 } },
        { id: 't2', name: 'Family', _count: { entries: 3 } },
      ]),
    },
  }
  const service = new EntryAnalysisService(USER_ID, db as unknown as PrismaClient, agent)
  return { db, agent, service }
}

describe('EntryAnalysisService.analyzeEntry', () => {
  it('saves mood, summary and analyzedAt, and returns the analysis', async () => {
    const { db, service } = setup()

    await expect(service.analyzeEntry(ENTRY_ID)).resolves.toEqual({
      mood: 'GRATEFUL',
      summary: 'I had dinner with family.',
      // Mapped onto the user's existing spelling
      suggestedTags: ['Family'],
    })

    const update = db.entry.updateMany.mock.calls[0][0]
    expect(update.where).toEqual({ id: ENTRY_ID, userId: USER_ID, deletedAt: null, updatedAt })
    expect(update.data).toEqual({
      mood: 'GRATEFUL',
      summary: 'I had dinner with family.',
      analyzedAt: expect.any(Date),
      // Analysis isn't an edit: updatedAt keeps its value
      updatedAt,
    })
  })

  it('reads only live entries and tags owned by the user', async () => {
    const { db, service } = setup()
    await service.analyzeEntry(ENTRY_ID)

    expect(db.entry.findFirst.mock.calls[0][0].where).toEqual({
      id: ENTRY_ID,
      userId: USER_ID,
      deletedAt: null,
    })
    expect(db.tag.findMany.mock.calls[0][0].where).toEqual({ userId: USER_ID })
  })

  it('calls the agent for the user with both tag lists in the prompt', async () => {
    const { agent, service } = setup()
    await service.analyzeEntry(ENTRY_ID)

    const [prompt, userId] = agent.mock.calls[0]
    expect(userId).toBe(USER_ID)
    expect(prompt).toContain("The user's existing tags: Home, Family")
    expect(prompt).toContain('Tags already on this entry: Home')
    expect(prompt).toContain('Dinner with everyone.')
  })

  it('throws NotFoundError for a missing, foreign or deleted entry without calling the agent', async () => {
    const { agent, db, service } = setup({ entry: null })

    await expect(service.analyzeEntry(ENTRY_ID)).rejects.toBeInstanceOf(NotFoundError)
    expect(agent).not.toHaveBeenCalled()
    expect(db.entry.updateMany).not.toHaveBeenCalled()
  })

  it('throws TooManyRequestsError when rate limited, leaving the entry untouched', async () => {
    const { db, service } = setup({
      agent: vi.fn<AnalysisAgentCall>().mockResolvedValue({
        tripwire: {
          reason: 'AI rate limit exceeded.',
          processorId: 'ai-usage',
          metadata: { code: 'TOO_MANY_REQUESTS' },
        },
      }),
    })

    await expect(service.analyzeEntry(ENTRY_ID)).rejects.toBeInstanceOf(TooManyRequestsError)
    expect(db.entry.updateMany).not.toHaveBeenCalled()
  })

  it.each([
    ['the agent throws', () => Promise.reject(new Error('provider down'))],
    ['another processor trips', () => Promise.resolve({ tripwire: { processorId: 'other' } })],
    ['the output is unusable', () => Promise.resolve({ object: { mood: 'CALM' } })],
  ])('throws InternalServerError when %s, leaving the entry untouched', async (_, impl) => {
    const { db, service } = setup({ agent: vi.fn<AnalysisAgentCall>(impl) })

    await expect(service.analyzeEntry(ENTRY_ID)).rejects.toBeInstanceOf(InternalServerError)
    expect(db.entry.updateMany).not.toHaveBeenCalled()
  })

  it('throws ConflictError when the entry changed during the call', async () => {
    const { service } = setup({ updated: 0 })

    await expect(service.analyzeEntry(ENTRY_ID)).rejects.toBeInstanceOf(ConflictError)
  })
})

describe('default agent call', () => {
  it('uses the registered agent with the user RequestContext and structured output', async () => {
    generate.mockResolvedValue(goodResult)
    const { db } = setup()
    const service = new EntryAnalysisService(USER_ID, db as unknown as PrismaClient)

    await service.analyzeEntry(ENTRY_ID)

    expect(mastra.getAgentById).toHaveBeenCalledWith(ENTRY_ANALYSIS_AGENT_ID)
    const options = generate.mock.calls[0][1]
    expect(options.requestContext.get(USER_ID_KEY)).toBe(USER_ID)
    expect(options.structuredOutput.schema).toBeDefined()
  })
})
