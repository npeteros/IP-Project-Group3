'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LOGIN_PAGE } from '@/src/lib/constants'
import { signIn } from '@/src/lib/auth-client'
import { loginSchema, type LoginValues } from '@/src/lib/schemas'
import { Icon } from './Icon'

const FIELD_BASE =
  'h-[52px] w-full rounded-[14px] border border-neutral-200 bg-surface px-4 text-[15px] leading-none text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus-visible:ring-2 focus-visible:ring-cloud-200'

const LABEL = 'text-[13px] leading-none font-medium text-neutral-600'

const ERROR = 'text-xs leading-[1.4] font-medium text-amber-700'

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit({ email, password }: LoginValues) {
    const { error } = await signIn.email({ email, password })
    if (error) {
      setError('root.server', { message: error.message ?? LOGIN_PAGE.fallbackError })
      return
    }
    router.push(LOGIN_PAGE.postLoginHref)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={LABEL}>
          {LOGIN_PAGE.emailLabel}
        </label>
        <input
          id="email"
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder={LOGIN_PAGE.emailPlaceholder}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={FIELD_BASE}
        />
        {errors.email && (
          <p id="email-error" className={ERROR}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className={LABEL}>
            {LOGIN_PAGE.passwordLabel}
          </label>
          <Link href="#" className="text-[13px] leading-none font-semibold">
            {LOGIN_PAGE.forgotPasswordLabel}
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            placeholder={LOGIN_PAGE.passwordPlaceholder}
            className={`${FIELD_BASE} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[14px] text-neutral-400 hover:text-neutral-600 focus-visible:text-neutral-900 focus-visible:outline-none"
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} strokeWidth={1.8} />
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className={ERROR}>
            {errors.password.message}
          </p>
        )}
      </div>

      {errors.root?.server && (
        <p role="alert" className={ERROR}>
          {errors.root.server.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-neutral-900 text-[15px] leading-none font-semibold text-surface hover:bg-neutral-900/90 focus-visible:ring-2 focus-visible:ring-cloud-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {LOGIN_PAGE.submitLabel}
      </button>
    </form>
  )
}
