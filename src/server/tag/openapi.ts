import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errorResponses } from '@/src/server/api/openapi-shared'
import {
  TagIdSchema,
  TagListSchema,
  TagRenameResponseSchema,
  TagRenameSchema,
} from '@/src/server/tag/schemas'

export const tagPaths: ZodOpenApiPathsObject = {
  '/tags': {
    get: {
      operationId: 'listTags',
      tags: ['Tags'],
      summary: "List the user's tags",
      description: 'Ordered by name (case-insensitive). `entryCount` counts live entries only.',
      responses: {
        200: {
          description: "The user's tags.",
          content: { 'application/json': { schema: TagListSchema } },
        },
        401: errorResponses[401],
      },
    },
  },
  '/tags/{id}': {
    patch: {
      operationId: 'renameTag',
      tags: ['Tags'],
      summary: 'Rename a tag',
      description:
        "Names are unique per user, ignoring case. Changing only the case of a tag's own name is allowed.",
      requestParams: { path: TagIdSchema },
      requestBody: {
        required: true,
        content: { 'application/json': { schema: TagRenameSchema } },
      },
      responses: {
        200: {
          description: 'The renamed tag.',
          content: { 'application/json': { schema: TagRenameResponseSchema } },
        },
        400: errorResponses[400],
        401: errorResponses[401],
        404: errorResponses[404],
        409: errorResponses[409],
      },
    },
    delete: {
      operationId: 'deleteTag',
      tags: ['Tags'],
      summary: 'Delete a tag',
      description:
        'Hard delete: the tag is removed from all of the user’s entries, and re-using the name later creates a new tag.',
      requestParams: { path: TagIdSchema },
      responses: {
        204: { description: 'Deleted.' },
        400: errorResponses[400],
        401: errorResponses[401],
        404: errorResponses[404],
      },
    },
  },
}
