import { EntryIdSchema, EntryUpdateSchema } from '@/src/lib/schemas'
import { readJsonBody, withAuth } from '@/src/server/api/handler'
import { EntryService } from '@/src/server/entry/entry.service'

type Context = RouteContext<'/api/v1/entries/[id]'>

export const PATCH = withAuth<Context>(async ({ request, ctx, user }) => {
  const id = EntryIdSchema.parse((await ctx.params).id)
  const input = EntryUpdateSchema.parse(await readJsonBody(request))
  const entry = await new EntryService(user.id).updateEntry(id, input)

  return Response.json(entry)
})

export const DELETE = withAuth<Context>(async ({ ctx, user }) => {
  const id = EntryIdSchema.parse((await ctx.params).id)
  await new EntryService(user.id).deleteEntry(id)

  return new Response(null, { status: 204 })
})
