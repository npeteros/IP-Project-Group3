import { createDocument, type ZodOpenApiPathsObject } from 'zod-openapi'
import { APP_NAME } from '@/src/lib/constants'
import { errorResponses } from '@/src/server/api/openapi-shared'
import { chatPaths } from '@/src/server/chat/openapi'
import { statsPaths } from '@/src/server/stats/openapi'
import { tagPaths } from '@/src/server/tag/openapi'

export { ApiErrorSchema, errorResponses } from '@/src/server/api/openapi-shared'

// Each domain adds its paths here, relative to the `/api/v1` server, e.g. `...entryPaths`
const paths: ZodOpenApiPathsObject = {
  ...chatPaths,
  ...tagPaths,
  ...statsPaths,
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
