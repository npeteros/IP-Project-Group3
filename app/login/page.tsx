import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/ui";
import { LOGIN_BRAND_NAME, LOGIN_PAGE } from "@/src/lib/constants";
import { typography } from "@/src/lib/typography";

export const metadata: Metadata = {
  title: `Sign in | ${LOGIN_BRAND_NAME}`,
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh bg-bg text-neutral-900">
      {/* Quote panel, desktop only */}
      <aside className="hidden w-[39%] flex-none flex-col justify-between bg-neutral-900 px-14 py-14 text-surface lg:flex">
        <Logo inverted name={LOGIN_BRAND_NAME} />

        <figure className="flex max-w-[460px] flex-col gap-5">
          <Icon name="quote" size={26} strokeWidth={1.6} className="text-amber-500" />
          <blockquote className="font-serif text-2xl leading-[1.6] font-normal italic">
            {`\u201c${LOGIN_PAGE.quote}\u201d`}
          </blockquote>
          <figcaption className="font-sans text-[13px] leading-none text-neutral-400">{LOGIN_PAGE.quoteAuthor}</figcaption>
        </figure>

        <p className="font-sans text-[13px] leading-none text-neutral-400">{LOGIN_PAGE.copyright}</p>
      </aside>

      {/* Sign-in form */}
      <main className="flex flex-1 items-center justify-center px-7 py-12">
        <div className="flex w-full max-w-[360px] flex-col gap-10">
          <div className="lg:hidden">
            <Logo name={LOGIN_BRAND_NAME} />
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2.5">
              <h1 className="font-serif text-[32px] leading-[1.15] font-medium">{LOGIN_PAGE.title}</h1>
              <p className={typography.body}>{LOGIN_PAGE.description}</p>
            </div>

            <LoginForm />

            <p className="text-center text-[13px] leading-none text-neutral-400">
              {LOGIN_PAGE.newHereLabel}{" "}
              <Link href="#" className="font-semibold">
                {LOGIN_PAGE.createAccountLabel}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
