import { createTool } from '@mastra/core/tools'
import { USER_ID_KEY } from '../guardrails/requestContext'
import { EntryService } from '@/src/server/entry/entry.service'
import { EntryIdSchema, EntrySchema } from '@/src/server/entry/schemas'

export const getEntryTool = createTool({
  id: 'get-entry',
  description:
    "Retrieve one journal entry by its ID from the signed-in user's entries. Use only IDs returned by searchEntries or explicitly supplied by the user.",
  inputSchema: EntryIdSchema,
  outputSchema: EntrySchema,
  execute: async ({ id }, { requestContext }) => {
    const userId = requestContext.get(USER_ID_KEY)
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new Error('Authenticated user context is required to retrieve a journal entry.')
    }

    return new EntryService(userId).findOneEntry(id)
  },
})
