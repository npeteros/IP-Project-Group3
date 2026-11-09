import { withAuth } from '@/src/server/api/handler'
import { TagService } from '@/src/server/tag/tag.service'

export const GET = withAuth(async ({ user }) => {
  return Response.json(await new TagService(user.id).findManyTags())
})
