"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LOGIN_PAGE } from "@/src/lib/constants";
import { Icon } from "./Icon";

const FIELD_BASE =
  "h-[52px] w-full rounded-[14px] border border-neutral-200 bg-surface px-4 text-[15px] leading-none text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus-visible:ring-2 focus-visible:ring-cloud-200";

const LABEL = "text-[13px] leading-none font-medium text-neutral-600";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  // No auth backend yet: signing in goes straight to the journal.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/journal");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={LABEL}>
          {LOGIN_PAGE.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={LOGIN_PAGE.emailPlaceholder}
          className={FIELD_BASE}
        />
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
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder={LOGIN_PAGE.passwordPlaceholder}
            className={`${FIELD_BASE} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[14px] text-neutral-400 hover:text-neutral-600 focus-visible:text-neutral-900 focus-visible:outline-none"
          >
            <Icon name={showPassword ? "eye-off" : "eye"} size={17} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="mt-1 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-neutral-900 text-[15px] leading-none font-semibold text-surface hover:bg-neutral-900/90 focus-visible:ring-2 focus-visible:ring-cloud-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {LOGIN_PAGE.submitLabel}
      </button>
    </form>
  );
}
