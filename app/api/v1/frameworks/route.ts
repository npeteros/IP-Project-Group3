import { readJsonBody, withAuth } from '@/src/server/api/handler'
import { FrameworkService } from '@/src/server/framework/framework.service'
import { FrameworkCreateSchema } from '@/src/server/framework/schemas'

export const GET = withAuth(async ({ user }) => {
  return Response.json(await new FrameworkService(user.id).findManyFrameworks())
})

export const POST = withAuth(async ({ request, user }) => {
  const input = FrameworkCreateSchema.parse(await readJsonBody(request))

  return Response.json(await new FrameworkService(user.id).createFramework(input), { status: 201 })
})
