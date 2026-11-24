import { z } from 'zod'
import type { Prisma, PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import { ForbiddenError, NotFoundError } from '@/src/server/api/errors'
import type {
  Framework,
  FrameworkCreateOutput,
  FrameworkList,
} from '@/src/server/framework/schemas'

type FrameworkRow = Prisma.FrameworkGetPayload<object>

/** Custom frameworks are estimated at this many minutes per prompt. */
export const MINUTES_PER_PROMPT = 2

// `prompts` is a `Json` column, so check its shape rather than trusting the cast
const PromptsSchema = z.array(z.string())

function toFramework(row: FrameworkRow): Framework {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    icon: row.icon,
    durationMinutes: row.durationMinutes,
    prompts: PromptsSchema.parse(row.prompts),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Built-in frameworks (`userId: null`) are shared by everyone; custom ones belong to one user.
 * Custom frameworks are soft-deleted, so entries written with one keep their `frameworkId`.
 */
export class FrameworkService {
  constructor(
    private readonly userId: string,
    private readonly db: PrismaClient = prisma,
  ) {}

  /** Live frameworks this user can see: the built-ins plus their own. */
  private visible(): Prisma.FrameworkWhereInput {
    return { deletedAt: null, OR: [{ userId: null }, { userId: this.userId }] }
  }

  async findManyFrameworks(): Promise<FrameworkList> {
    const rows = await this.db.framework.findMany({
      where: this.visible(),
      // Built-ins first, then custom frameworks oldest first. Seeded built-ins share a
      // `createdAt`, so `id` breaks the tie for a stable order.
      orderBy: [{ userId: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }, { id: 'asc' }],
    })

    return { frameworks: rows.map(toFramework) }
  }

  async findOneFramework(id: string): Promise<Framework> {
    const row = await this.db.framework.findFirst({ where: { id, ...this.visible() } })
    if (!row) throw new NotFoundError('Framework not found.')

    return toFramework(row)
  }

  async createFramework(input: FrameworkCreateOutput): Promise<Framework> {
    const row = await this.db.framework.create({
      data: {
        userId: this.userId,
        name: input.name,
        description: input.description,
        icon: input.icon,
        durationMinutes: input.prompts.length * MINUTES_PER_PROMPT,
        prompts: input.prompts,
      },
    })

    return toFramework(row)
  }

  /** Soft delete. Built-ins can't be deleted; another user's framework is a 404. */
  async deleteFramework(id: string): Promise<void> {
    const framework = await this.db.framework.findFirst({
      where: { id, ...this.visible() },
      select: { userId: true },
    })
    if (!framework) throw new NotFoundError('Framework not found.')
    if (framework.userId === null) throw new ForbiddenError("Built-in frameworks can't be deleted.")

    // Ownership and liveness are checked again in the write, so a concurrent delete is a 404
    const { count } = await this.db.framework.updateMany({
      where: { id, userId: this.userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    if (count === 0) throw new NotFoundError('Framework not found.')
  }
}
