import { readJsonBody, withAuth } from '@/src/server/api/handler'
import { TagIdSchema, TagRenameSchema } from '@/src/server/tag/schemas'
import { TagService } from '@/src/server/tag/tag.service'

type Context = RouteContext<'/api/v1/tags/[id]'>

export const PATCH = withAuth<Context>(async ({ request, ctx, user }) => {
  const { id } = TagIdSchema.parse(await ctx.params)
  const input = TagRenameSchema.parse(await readJsonBody(request))

  return Response.json(await new TagService(user.id).renameTag(id, input))
})

export const DELETE = withAuth<Context>(async ({ ctx, user }) => {
  const { id } = TagIdSchema.parse(await ctx.params)
  await new TagService(user.id).deleteTag(id)

  return new Response(null, { status: 204 })
})
