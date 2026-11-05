import { z } from 'zod'
import { createDocument, type ZodOpenApiPathsObject } from 'zod-openapi'
import { APP_NAME } from '@/src/lib/constants'
import { API_ERROR_CODES } from '@/src/server/api/errors'
import { ChatRequestSchema } from '@/src/server/chat/schemas'

/** The shared error body every route returns, matching `ApiErrorBody` in `handler.ts`. */
export const ApiErrorSchema = z
  .object({
    error: z.object({
      code: z.enum(API_ERROR_CODES),
      message: z.string(),
      issues: z
        .object({
          formErrors: z.array(z.string()),
          fieldErrors: z.record(z.string(), z.array(z.string())),
        })
        .optional()
        .meta({ description: 'Only on `VALIDATION_ERROR`: zod issues flattened per field.' }),
    }),
  })
  .meta({ id: 'ApiError' })

function errorResponse(id: string, description: string) {
  return { id, description, content: { 'application/json': { schema: ApiErrorSchema } } }
}

export const errorResponses = {
  400: errorResponse('BadRequest', 'Invalid input (`BAD_REQUEST` or `VALIDATION_ERROR`).'),
  401: errorResponse('Unauthorized', 'No session.'),
  403: errorResponse('Forbidden', 'Signed in but not allowed.'),
  404: errorResponse('NotFound', "Missing, soft-deleted or another user's record."),
  409: errorResponse('Conflict', 'Clashes with an existing record.'),
  429: errorResponse('TooManyRequests', 'The signed-in user has exceeded the AI call rate limit.'),
  500: errorResponse('InternalError', 'Unexpected server error.'),
}

// Each domain adds its paths here, relative to the `/api/v1` server, e.g. `...entryPaths`
const paths: ZodOpenApiPathsObject = {
  '/chat': {
    post: {
      operationId: 'streamChat',
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

const document = createDocument({
  openapi: '3.2.0',
  info: { title: `${APP_NAME} API`, version: '1.0.0' },
  servers: [{ url: '/api/v1' }],
  security: [{ sessionCookie: [] }],
  paths,
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
        description: 'Set by signing in through better-auth.',
      },
    },
    responses: Object.fromEntries(Object.values(errorResponses).map((res) => [res.id, res])),
  },
})

export const openApiDocument = { ...document, openapi: '3.2.1' }
