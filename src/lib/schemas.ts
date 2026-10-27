import { z } from 'zod'
import { REGISTER } from '@/src/lib/constants'

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .pipe(z.email("That email doesn't look right."))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
})

export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    email,
    password: z
      .string()
      .min(REGISTER.minPasswordLength, REGISTER.passwordError)
      .regex(/\d/, REGISTER.passwordError),
    confirmPassword: z.string(),
    terms: z.boolean().refine(Boolean, 'Please agree to the Terms and Privacy Policy.'),
  })
  .refine((values) => values.confirmPassword === values.password, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

export type RegisterValues = z.infer<typeof registerSchema>
