import type { PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import {
  ENTRY_ANALYSIS_AGENT_ID,
  buildEntryAnalysisPrompt,
  entryAnalysisModelSchema,
  normalizeEntryAnalysis,
} from '@/src/mastra/agents/entry-analysis-agent'
import { assertNotRateLimited, type TripwireInfo } from '@/src/mastra/guardrails/AiUsageProcessor'
import { createUserRequestContext } from '@/src/mastra/guardrails/requestContext'
import { ConflictError, InternalServerError, NotFoundError } from '@/src/server/api/errors'
import type { EntryAnalysis } from '@/src/server/entry/schemas'
import { TagService } from '@/src/server/tag/tag.service'

export type AnalysisAgentResult = { object?: unknown; tripwire?: TripwireInfo }

/** Runs the analysis agent for one prompt on behalf of `userId`. Injected in tests. */
export type AnalysisAgentCall = (prompt: string, userId: string) => Promise<AnalysisAgentResult>

// Imported lazily so loading this service (e.g. in tests) doesn't build the Mastra instance.
const callEntryAnalysisAgent: AnalysisAgentCall = async (prompt, userId) => {
  const { mastra } = await import('@/src/mastra')
  const result = await mastra.getAgentById(ENTRY_ANALYSIS_AGENT_ID).generate(prompt, {
    requestContext: createUserRequestContext(userId),
    structuredOutput: { schema: entryAnalysisModelSchema },
  })
  return { object: result.object, tripwire: result.tripwire }
}

const ANALYSIS_FAILED = 'Could not analyze this entry. Try again later.'

/** AI analysis of a user's entries: mood, summary and tag suggestions. */
export class EntryAnalysisService {
  constructor(
    private readonly userId: string,
    private readonly db: PrismaClient = prisma,
    private readonly callAgent: AnalysisAgentCall = callEntryAnalysisAgent,
  ) {}

  /**
   * Analyzes one live entry, saves its `mood`, `summary` and `analyzedAt`, and returns the
   * analysis. Suggested tags are returned only, never stored. The entry is written only after
   * a usable result, so a failed or rate-limited call leaves it untouched.
   */
  async analyzeEntry(id: string): Promise<EntryAnalysis> {
    const entry = await this.db.entry.findFirst({
      where: { id, userId: this.userId, deletedAt: null },
      select: {
        title: true,
        body: true,
        updatedAt: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    })
    if (!entry) throw new NotFoundError('Entry not found.')

    const { tags } = await new TagService(this.userId, this.db).findManyTags()
    const context = {
      entryTagNames: entry.tags.map(({ tag }) => tag.name),
      userTagNames: tags.map((tag) => tag.name),
    }

    let result: AnalysisAgentResult
    try {
      result = await this.callAgent(buildEntryAnalysisPrompt(entry, context), this.userId)
    } catch (cause) {
      throw new InternalServerError(ANALYSIS_FAILED, { cause })
    }

    assertNotRateLimited(result)
    if (result.tripwire) throw new InternalServerError(ANALYSIS_FAILED, { cause: result.tripwire })

    const analysis = normalizeEntryAnalysis(result.object, context)
    if (!analysis) {
      throw new InternalServerError(ANALYSIS_FAILED, {
        cause: new Error('Entry analysis returned unusable output.'),
      })
    }

    // Matching on `updatedAt` skips the write if the entry was edited or deleted during the call,
    // so a stale analysis never lands. Setting it to the same value keeps `@updatedAt` from
    // bumping it: analysis isn't an edit.
    const { count } = await this.db.entry.updateMany({
      where: { id, userId: this.userId, deletedAt: null, updatedAt: entry.updatedAt },
      data: {
        mood: analysis.mood,
        summary: analysis.summary,
        analyzedAt: new Date(),
        updatedAt: entry.updatedAt,
      },
    })
    if (count === 0) throw new ConflictError('This entry changed while it was being analyzed.')

    return analysis
  }
}
