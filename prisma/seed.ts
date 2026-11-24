/**
 * Seeds the built-in frameworks (`prisma/frameworks.ts`).
 *
 * Run it after migrating, in every environment including production:
 *
 *   npx prisma db seed --config prisma7.config.ts
 *
 * It uses `DATABASE_URL` and is safe to run more than once: each built-in is upserted by its fixed
 * id, so a re-run applies edited names or prompts and never creates duplicates. Only built-ins
 * (`userId: null`) are touched; users' custom frameworks are left alone.
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { BUILT_IN_FRAMEWORKS } from './frameworks'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  await prisma.$transaction(
    BUILT_IN_FRAMEWORKS.map(({ id, ...framework }) =>
      prisma.framework.upsert({
        where: { id },
        // A built-in deleted by hand comes back on the next seed
        update: { ...framework, userId: null, deletedAt: null },
        create: { id, ...framework },
      }),
    ),
  )
}

main().finally(() => prisma.$disconnect())
