import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errorResponses } from '@/src/server/api/openapi-shared'
import { EntryAnalysisSchema, EntryIdSchema } from '@/src/server/entry/schemas'

export const entryPaths: ZodOpenApiPathsObject = {
  '/entries/{id}/analysis': {
    post: {
      operationId: 'analyzeEntry',
      tags: ['Entries'],
      summary: 'Analyze an entry with AI',
      description:
        "Saves the entry's `mood`, `summary` and `analyzedAt`, and returns them with tag suggestions (not stored). Counts toward the user's AI rate limit. A failed analysis (`500`) or rate limit (`429`) leaves the entry unchanged; `409` means the entry was edited or deleted during the analysis.",
      requestParams: { path: EntryIdSchema },
      responses: {
        200: {
          description: 'The analysis.',
          content: { 'application/json': { schema: EntryAnalysisSchema } },
        },
        400: errorResponses[400],
        401: errorResponses[401],
        404: errorResponses[404],
        409: errorResponses[409],
        429: errorResponses[429],
        500: errorResponses[500],
      },
    },
  },
}
