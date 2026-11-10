import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errorResponses } from '@/src/server/api/openapi-shared'
import { StatsSchema } from '@/src/server/stats/schemas'

export const statsPaths: ZodOpenApiPathsObject = {
  '/stats': {
    get: {
      operationId: 'getStats',
      tags: ['Stats'],
      summary: "Get the user's journal stats",
      description:
        'The current writing streak in Manila time. A streak counts back from today, or from yesterday if there is no entry today yet. Soft-deleted entries are ignored.',
      responses: {
        200: {
          description: "The user's journal stats.",
          content: { 'application/json': { schema: StatsSchema } },
        },
        401: errorResponses[401],
      },
    },
  },
}
