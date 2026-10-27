import { describe, expect, it } from 'vitest'
import { REGISTER } from '@/src/lib/constants'
import { loginSchema, registerSchema } from '@/src/lib/schemas'

/** First error message per field, e.g. `{ email: "..." }`. */
function errorsOf(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  const errors: Record<string, string> = {}
  for (const issue of result.error?.issues ?? []) {
    const field = String(issue.path[0])
    errors[field] ??= issue.message
  }
  return errors
}

describe('loginSchema', () => {
  const valid = { email: 'jane@example.com', password: 'secret' }

  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse(valid).success).toBe(true)
  })

  it('trims whitespace around the email', () => {
    const result = loginSchema.safeParse({ ...valid, email: '  jane@example.com  ' })
    expect(result.data?.email).toBe('jane@example.com')
  })

  it('asks for an email when it is empty', () => {
    expect(errorsOf(loginSchema.safeParse({ ...valid, email: '' }))).toEqual({
      email: 'Enter your email address.',
    })
  })

  it('treats a whitespace-only email as empty', () => {
    expect(errorsOf(loginSchema.safeParse({ ...valid, email: '   ' })).email).toBe(
      'Enter your email address.',
    )
  })

  it.each(['jane', 'jane@', 'jane@example', '@example.com'])(
    'rejects malformed email %j',
    (email) => {
      expect(errorsOf(loginSchema.safeParse({ ...valid, email })).email).toBe(
        "That email doesn't look right.",
      )
    },
  )

  it('asks for a password when it is empty', () => {
    expect(errorsOf(loginSchema.safeParse({ ...valid, password: '' }))).toEqual({
      password: 'Enter your password.',
    })
  })
})

describe('registerSchema', () => {
  const password = `${'a'.repeat(REGISTER.minPasswordLength - 1)}1`
  const valid = { email: 'jane@example.com', password, confirmPassword: password, terms: true }

  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('reports every invalid field on an empty form', () => {
    expect(
      errorsOf(
        registerSchema.safeParse({ email: '', password: '', confirmPassword: '', terms: false }),
      ),
    ).toEqual({
      email: 'Enter your email address.',
      password: REGISTER.passwordError,
      terms: 'Please agree to the Terms and Privacy Policy.',
    })
  })

  it('rejects a password one character short of the minimum', () => {
    const short = password.slice(1)
    const result = registerSchema.safeParse({ ...valid, password: short, confirmPassword: short })
    expect(errorsOf(result).password).toBe(REGISTER.passwordError)
  })

  it('rejects a long password without a number', () => {
    const noDigit = 'a'.repeat(REGISTER.minPasswordLength + 4)
    const result = registerSchema.safeParse({
      ...valid,
      password: noDigit,
      confirmPassword: noDigit,
    })
    expect(errorsOf(result).password).toBe(REGISTER.passwordError)
  })

  it('reports a mismatched confirmation on confirmPassword', () => {
    expect(
      errorsOf(registerSchema.safeParse({ ...valid, confirmPassword: `${password}x` })),
    ).toEqual({
      confirmPassword: "Passwords don't match.",
    })
  })

  it('requires the terms to be accepted', () => {
    expect(errorsOf(registerSchema.safeParse({ ...valid, terms: false }))).toEqual({
      terms: 'Please agree to the Terms and Privacy Policy.',
    })
  })
})
