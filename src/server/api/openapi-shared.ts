import { z } from 'zod'
import { API_ERROR_CODES } from '@/src/server/api/errors'

// Building blocks shared by `openapi.ts` and each domain's `<domain>/openapi.ts`.
// Kept separate so domain files don't import `openapi.ts`, which imports them.

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
