import { openApiDocument } from '@/src/server/api/openapi'

export function GET() {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 })

  return Response.json(openApiDocument)
}
