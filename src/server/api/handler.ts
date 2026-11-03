import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/src/lib/auth'
import {
  AppError,
  BadRequestError,
  InternalServerError,
  UnauthorizedError,
  type ApiErrorCode,
} from '@/src/server/api/errors'

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode
    message: string
    issues?: z.core.$ZodFlattenedError<unknown>
  }
}

type AuthedHandler<Ctx> = (args: {
  request: NextRequest
  ctx: Ctx
  user: Session['user']
}) => Response | Promise<Response>

export function withAuth<Ctx = unknown>(handler: AuthedHandler<Ctx>) {
  return async (request: NextRequest, ctx: Ctx) => {
    try {
      const session = await getSession()
      if (!session) throw new UnauthorizedError()

      return await handler({ request, ctx, user: session.user })
    } catch (error) {
      return toErrorResponse(error)
    }
  }
}

/** Parses the JSON body; a missing or malformed body is a 400, not a 500. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new BadRequestError('The request body must be valid JSON.')
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return errorJson(400, {
      code: 'VALIDATION_ERROR',
      message: 'Some fields are invalid.',
      issues: z.flattenError(error),
    })
  }

  const appError =
    error instanceof AppError ? error : new InternalServerError(undefined, { cause: error })
  if (appError.status >= 500) console.error(appError.cause ?? appError)

  return errorJson(appError.status, { code: appError.code, message: appError.message })
}

function errorJson(status: number, error: ApiErrorBody['error']) {
  return Response.json({ error } satisfies ApiErrorBody, { status })
}
