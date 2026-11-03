import { ApiReference } from '@scalar/nextjs-api-reference'

const reference = ApiReference({ url: '/api/v1/openapi.json' })

export function GET() {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 })

  return reference()
}
