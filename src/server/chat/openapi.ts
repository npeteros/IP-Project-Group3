import { z } from 'zod'
import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errorResponses } from '@/src/server/api/openapi-shared'
import { ChatRequestSchema } from '@/src/server/chat/schemas'

export const chatPaths: ZodOpenApiPathsObject = {
  '/chat': {
    post: {
      operationId: 'streamChat',
      tags: ['Chat'],
      summary: 'Stream a journal reflection response',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ChatRequestSchema } },
      },
      responses: {
        200: {
          description: 'AI SDK UI stream.',
          content: {
            'text/event-stream': {
              schema: z.string().meta({ description: 'AI SDK UI stream events.' }),
            },
          },
        },
        400: errorResponses[400],
        401: errorResponses[401],
        429: errorResponses[429],
        500: errorResponses[500],
      },
    },
  },
}
