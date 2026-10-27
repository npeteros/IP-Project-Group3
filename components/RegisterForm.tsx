"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ComponentProps } from "react";
import { REGISTER } from "@/src/lib/constants";
import { typography } from "@/src/lib/typography";
import { Icon } from "./Icon";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 0 = empty, 1–4 = weak → strong. */
function passwordStrength(password: string): number {
  if (!password) return 0;
  const checks = [
    password.length >= REGISTER.minPasswordLength,
    /\d/.test(password),
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /[^A-Za-z0-9]/.test(password) || password.length >= 12,
  ];
  // Short passwords never rate above "Weak", whatever else they contain.
  if (!checks[0]) return 1;
  return Math.max(1, checks.filter(Boolean).length);
}

function Field({
  label,
  error,
  trailing,
  children,
}: {
  label: string;
  error?: string;
  trailing?: React.ReactNode;
  children: (props: { id: string; className: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={typography.fieldLabel}>
        {label}
      </label>
      <div className="relative">
        {children({
          id,
          className: `h-[52px] w-full rounded-[14px] border bg-surface px-4 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 ${
            error ? "border-amber-700" : "border-neutral-200"
          } ${trailing ? "pr-12" : ""}`,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? errorId : undefined,
        })}
        {trailing}
      </div>
      {error && (
        <p id={errorId} className="text-xs leading-[1.4] font-medium text-amber-700">
          {error}
        </p>
      )}
    </div>
  );
}

function StrengthMeter({ password }: { password: string }) {
  const score = passwordStrength(password);
  const hint = `at least ${REGISTER.minPasswordLength} characters, including a number.`;

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`h-[3px] flex-1 rounded-full transition-colors ${segment <= score ? "bg-sage-500" : "bg-neutral-200"}`}
          />
        ))}
      </div>
      <p className="text-xs leading-[1.4] text-neutral-600">
        {score ? `${REGISTER.strengthLabels[score - 1]} — ${hint}` : `${hint[0].toUpperCase()}${hint.slice(1)}`}
      </p>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    email: !email ? "Enter your email address." : !EMAIL_PATTERN.test(email) ? "That email doesn't look right." : "",
    password:
      password.length < REGISTER.minPasswordLength || !/\d/.test(password)
        ? `Use at least ${REGISTER.minPasswordLength} characters, including a number.`
        : "",
    confirm: confirm !== password ? "Passwords don't match." : "",
    terms: agreed ? "" : "Please agree to the Terms and Privacy Policy.",
  };

  const show = {
    email: submitted && errors.email,
    password: submitted && errors.password,
    confirm: (submitted || (confirmTouched && confirm)) && errors.confirm,
    terms: submitted && errors.terms,
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;

    // TODO: call the sign-up API once the backend exists.
    router.push(REGISTER.postRegisterHref);
  }

  const toggle: ComponentProps<"button"> = {
    type: "button",
    onClick: () => setShowPassword((visible) => !visible),
    "aria-label": showPassword ? "Hide password" : "Show password",
    "aria-pressed": showPassword,
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Field label="Email" error={show.email || undefined}>
        {(props) => (
          <input
            {...props}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-col gap-3">
        <Field
          label="Password"
          error={show.password || undefined}
          trailing={
            <button
              {...toggle}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
            >
              <Icon name={showPassword ? "eye-off" : "eye"} size={18} strokeWidth={1.8} />
            </button>
          }
        >
          {(props) => (
            <input
              {...props}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <StrengthMeter password={password} />
      </div>

      <Field label="Confirm password" error={show.confirm || undefined}>
        {(props) => (
          <input
            {...props}
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setConfirmTouched(true)}
          />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-3 text-[13px] leading-[1.4] text-neutral-600">
          <span className="relative flex size-[18px] flex-none">
            <input
              type="checkbox"
              name="terms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="peer size-full cursor-pointer appearance-none rounded-[5px] border border-neutral-300 bg-surface checked:border-neutral-900 checked:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            />
            <Icon
              name="check"
              size={12}
              strokeWidth={3}
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-surface opacity-0 peer-checked:opacity-100"
            />
          </span>
          <span>
            I agree to the{" "}
            <Link href="#" className="font-semibold">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="font-semibold">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {show.terms && <p className="text-xs leading-[1.4] font-medium text-amber-700">{errors.terms}</p>}
      </div>

      <button
        type="submit"
        className="mt-1 h-[52px] w-full rounded-[14px] bg-neutral-900 text-[15px] leading-none font-semibold text-surface shadow-md transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
      >
        {REGISTER.submitLabel}
      </button>

      <p className="text-center text-[13px] leading-none text-neutral-400">
        {REGISTER.signInPrompt}{" "}
        <Link href={REGISTER.signInHref} className="font-semibold">
          {REGISTER.signInLabel}
        </Link>
      </p>
    </form>
  );
}
