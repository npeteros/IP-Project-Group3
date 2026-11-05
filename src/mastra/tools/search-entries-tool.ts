import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { USER_ID_KEY } from '../guardrails/requestContext'
import { EntryService } from '@/src/server/entry/entry.service'
import {
  EntryListDateRangeSchema,
  EntryListSchema,
  TAG_NAME_MAX_LENGTH,
  type EntryListQueryOutput,
} from '@/src/server/entry/schemas'

export const SearchEntriesInputSchema = EntryListDateRangeSchema.safeExtend({
  text: z.string().trim().min(1).max(500).optional(),
  tag: z.string().trim().min(1).max(TAG_NAME_MAX_LENGTH).optional(),
  limit: z.number().int().min(1).max(20).default(10),
})

export const searchEntriesTool = createTool({
  id: 'search-entries',
  description:
    "Search the signed-in user's journal entries by text, tag name, or Manila calendar-date range. Use this before referring to past entries; results contain only entries owned by the signed-in user.",
  inputSchema: SearchEntriesInputSchema,
  outputSchema: EntryListSchema,
  execute: async ({ text, tag, entryStartDate, entryEndDate, limit }, { requestContext }) => {
    const userId = requestContext.get(USER_ID_KEY)
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new Error('Authenticated user context is required to search journal entries.')
    }

    const query: EntryListQueryOutput = {
      skip: 0,
      take: limit,
      searchText: text,
      tagName: tag,
      entryStartDate,
      entryEndDate,
    }

    return new EntryService(userId).findManyEntries(query)
  },
})
