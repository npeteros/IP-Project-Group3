import { withAuth } from '@/src/server/api/handler'
import { EntryAnalysisService } from '@/src/server/entry/entry-analysis.service'
import { EntryIdSchema } from '@/src/server/entry/schemas'

type Context = RouteContext<'/api/v1/entries/[id]/analysis'>

export const POST = withAuth<Context>(async ({ ctx, user }) => {
  const { id } = EntryIdSchema.parse(await ctx.params)

  return Response.json(await new EntryAnalysisService(user.id).analyzeEntry(id))
})
