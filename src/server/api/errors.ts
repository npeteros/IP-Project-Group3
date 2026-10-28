export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

/** Base for errors services throw; the route helper maps them to a response. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = new.target.name
  }
}

/** Input that passes zod but breaks a business rule. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request.') {
    super(400, 'BAD_REQUEST', message)
  }
}

/** No session. */
export class UnauthorizedError extends AppError {
  constructor(message = 'You need to sign in.') {
    super(401, 'UNAUTHORIZED', message)
  }
}

/** Signed in but not allowed. Not for records owned by someone else; use NotFoundError. */
export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this.") {
    super(403, 'FORBIDDEN', message)
  }
}

/** Missing, soft-deleted or another user's record. Returning 404 (not 403) keeps ids from leaking. */
export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(404, 'NOT_FOUND', message)
  }
}

/** Unique constraint clashes. */
export class ConflictError extends AppError {
  constructor(message = 'This already exists.') {
    super(409, 'CONFLICT', message)
  }
}

/** Failures the client can't fix (e.g. an upstream call failed). `cause` is logged, never returned. */
export class InternalServerError extends AppError {
  constructor(message = 'Something went wrong.', options?: ErrorOptions) {
    super(500, 'INTERNAL_ERROR', message, options)
  }
}
