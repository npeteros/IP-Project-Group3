import { EntryCreateSchema } from '@/src/lib/schemas'
import { readJsonBody, withAuth } from '@/src/server/api/handler'
import { EntryService } from '@/src/server/entry/entry.service'

export const POST = withAuth(async ({ request, user }) => {
  const input = EntryCreateSchema.parse(await readJsonBody(request))
  const entry = await new EntryService(user.id).createEntry(input)

  return Response.json(entry, { status: 201 })
})
