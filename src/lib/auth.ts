import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { headers } from 'next/headers'
import { REGISTER } from '@/src/lib/constants'
import prisma from '@/src/lib/prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: REGISTER.minPasswordLength,
  },
})

/** The current request's session, or null when signed out. Server-only. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}
