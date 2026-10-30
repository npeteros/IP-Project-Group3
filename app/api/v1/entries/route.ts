import { withAuth } from '@/src/server/api/handler'
import { EntryListQuerySchema } from '@/src/server/entry/entry.schemas'
import { EntryService } from '@/src/server/entry/entry.service'

export const GET = withAuth(async ({ request, user }) => {
  const input = EntryListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))

  return Response.json(await new EntryService(user.id).findManyEntries(input))
})
