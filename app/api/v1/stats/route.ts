import { withAuth } from '@/src/server/api/handler'
import { StatsService } from '@/src/server/stats/stats.service'

export const GET = withAuth(async ({ user }) => {
  return Response.json(await new StatsService(user.id).getStats())
})
