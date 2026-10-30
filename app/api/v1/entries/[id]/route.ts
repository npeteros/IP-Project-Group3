import { readJsonBody, withAuth } from '@/src/server/api/handler'
import { EntryIdSchema, EntryUpdateSchema } from '@/src/server/entry/schemas'
import { EntryService } from '@/src/server/entry/entry.service'

type Context = RouteContext<'/api/v1/entries/[id]'>

export const GET = withAuth<Context>(async ({ ctx, user }) => {
  const { id } = EntryIdSchema.parse(await ctx.params)

  return Response.json(await new EntryService(user.id).findOneEntry(id))
})

export const PATCH = withAuth<Context>(async ({ request, ctx, user }) => {
  const { id } = EntryIdSchema.parse(await ctx.params)
  const input = EntryUpdateSchema.parse(await readJsonBody(request))

  return Response.json(await new EntryService(user.id).updateEntry(id, input))
})

export const DELETE = withAuth<Context>(async ({ ctx, user }) => {
  const { id } = EntryIdSchema.parse(await ctx.params)
  await new EntryService(user.id).deleteEntry(id)

  return new Response(null, { status: 204 })
})
