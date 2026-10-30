import { withAuth } from '@/src/server/api/handler'
import { EntryIdSchema } from '@/src/server/entry/entry.schemas'
import { EntryService } from '@/src/server/entry/entry.service'

export const GET = withAuth<RouteContext<'/api/v1/entries/[id]'>>(async ({ ctx, user }) => {
  const { id } = EntryIdSchema.parse(await ctx.params)

  return Response.json(await new EntryService(user.id).findOneEntry(id))
})
