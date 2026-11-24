import { withAuth } from '@/src/server/api/handler'
import { FrameworkService } from '@/src/server/framework/framework.service'
import { FrameworkIdSchema } from '@/src/server/framework/schemas'

type Context = RouteContext<'/api/v1/frameworks/[id]'>

export const GET = withAuth<Context>(async ({ ctx, user }) => {
  const { id } = FrameworkIdSchema.parse(await ctx.params)

  return Response.json(await new FrameworkService(user.id).findOneFramework(id))
})

export const DELETE = withAuth<Context>(async ({ ctx, user }) => {
  const { id } = FrameworkIdSchema.parse(await ctx.params)
  await new FrameworkService(user.id).deleteFramework(id)

  return new Response(null, { status: 204 })
})
