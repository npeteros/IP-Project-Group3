import { readJsonBody, withAuth } from '@/src/server/api/handler'
import { EntryCreateSchema, EntryListQuerySchema } from '@/src/server/entry/schemas'
import { EntryService } from '@/src/server/entry/entry.service'

export const GET = withAuth(async ({ request, user }) => {
  const input = EntryListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))

  return Response.json(await new EntryService(user.id).findManyEntries(input))
})

export const POST = withAuth(async ({ request, user }) => {
  const input = EntryCreateSchema.parse(await readJsonBody(request))
  const entry = await new EntryService(user.id).createEntry(input)

  return Response.json(entry, { status: 201 })
})
