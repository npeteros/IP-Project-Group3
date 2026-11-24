import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errorResponses } from '@/src/server/api/openapi-shared'
import {
  FrameworkCreateSchema,
  FrameworkIdSchema,
  FrameworkListSchema,
  FrameworkSchema,
} from '@/src/server/framework/schemas'

export const frameworkPaths: ZodOpenApiPathsObject = {
  '/frameworks': {
    get: {
      operationId: 'listFrameworks',
      tags: ['Frameworks'],
      summary: 'List frameworks',
      description:
        "Built-in frameworks (`userId: null`) first, then the user's own, oldest first. Deleted frameworks are left out.",
      responses: {
        200: {
          description: 'The frameworks the user can use.',
          content: { 'application/json': { schema: FrameworkListSchema } },
        },
        401: errorResponses[401],
      },
    },
    post: {
      operationId: 'createFramework',
      tags: ['Frameworks'],
      summary: 'Create a custom framework',
      description: 'The new framework belongs to the user and is only visible to them.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: FrameworkCreateSchema } },
      },
      responses: {
        201: {
          description: 'The created framework.',
          content: { 'application/json': { schema: FrameworkSchema } },
        },
        400: errorResponses[400],
        401: errorResponses[401],
      },
    },
  },
  '/frameworks/{id}': {
    get: {
      operationId: 'getFramework',
      tags: ['Frameworks'],
      summary: 'Get a framework',
      requestParams: { path: FrameworkIdSchema },
      responses: {
        200: {
          description: 'The framework.',
          content: { 'application/json': { schema: FrameworkSchema } },
        },
        400: errorResponses[400],
        401: errorResponses[401],
        404: errorResponses[404],
      },
    },
    delete: {
      operationId: 'deleteFramework',
      tags: ['Frameworks'],
      summary: 'Delete a custom framework',
      description:
        'Soft delete: entries written with the framework keep their `frameworkId`. Built-in frameworks answer `403`.',
      requestParams: { path: FrameworkIdSchema },
      responses: {
        204: { description: 'Deleted.' },
        400: errorResponses[400],
        401: errorResponses[401],
        403: errorResponses[403],
        404: errorResponses[404],
      },
    },
  },
}
