import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { FRAMEWORKS } from '../src/lib/placeholders/frameworks'

const frameworkIds: Record<string, string> = {
  'first-principles': '00000000-0000-4000-8000-000000000001',
  ikigai: '00000000-0000-4000-8000-000000000002',
  'daily-review': '00000000-0000-4000-8000-000000000003',
  'regret-minimization': '00000000-0000-4000-8000-000000000004',
  'gratitude-map': '00000000-0000-4000-8000-000000000005',
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  await prisma.framework.createMany({
    data: FRAMEWORKS.map((framework) => ({
      id: frameworkIds[framework.id],
      name: framework.name,
      description: framework.description,
      icon: framework.icon,
      durationMinutes: Number.parseInt(framework.duration, 10),
      prompts: framework.prompts,
    })),
    skipDuplicates: true,
  })
}

main().finally(() => prisma.$disconnect())
