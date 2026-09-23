import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Card, Logo, MoodDot, Tag, ToneBadge } from "@/components/ui";
import { ONBOARDING } from "@/lib/constants";
import { typography } from "@/lib/typography";
 
function StepDots() {
  return (
    <div className="flex justify-center gap-2 lg:hidden">
      {Array.from({ length: ONBOARDING.totalSteps }, (_, step) => (
        <span
          key={step}
          className={
            step === ONBOARDING.currentStep ? "h-1.5 w-5 rounded-[3px] bg-neutral-900" : "size-1.5 rounded-full bg-neutral-200"
          }
        />
      ))}
    </div>
  );
}
 
function PreviewCards() {
  const { entry, moodMix, insight } = ONBOARDING.preview;
 
  return (
    <div className="relative mx-auto flex h-full max-w-[520px] flex-col justify-center gap-6 px-10 py-16">
      <Card className="flex w-[340px] max-w-full flex-col gap-2 p-5 shadow-md">
        <span className={typography.caption}>{entry.date}</span>
        <h3 className={typography.entryTitle}>{entry.title}</h3>
        <p className={typography.bodySmall}>{entry.excerpt}</p>
        <div className="mt-0.5 flex">
          <Tag label={entry.tag} className="bg-bg" />
        </div>
      </Card>
 
      <Card className="flex w-[300px] max-w-full flex-col gap-2.5 self-end p-5 shadow-md">
        <span className="text-[13px] leading-none font-semibold">{moodMix.title}</span>
        <div className="flex flex-wrap gap-2">
          {moodMix.moods.map((mood) => (
            <span key={mood.label} className="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5">
              <MoodDot tone={mood.tone} />
              <span className="text-xs leading-none font-semibold text-neutral-600">{mood.label}</span>
            </span>
          ))}
        </div>
      </Card>
 
      <Card className="ml-14 flex w-[220px] max-w-full items-center gap-3 p-4 shadow-md">
        <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-neutral-900 text-surface">
          <Icon name="cloud" size={15} strokeWidth={2.2} />
        </span>
        <span className="text-[13px] leading-[1.4] font-medium">{insight}</span>
      </Card>
    </div>
  );
}
 
export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-neutral-900 lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Illustration — top hero on mobile, right-hand panel on desktop */}
      <div className="relative h-[300px] flex-none overflow-hidden rounded-b-[32px] bg-linear-160 from-sage-100 to-cloud-100 sm:h-[340px] lg:order-2 lg:h-auto lg:w-[45%] lg:max-w-[600px] lg:rounded-none">
        <div className="absolute -top-15 -left-12 size-[220px] rounded-full bg-sage-200 opacity-55 lg:-top-25 lg:-left-22 lg:size-[340px]" />
        <div className="absolute -right-10 -bottom-12 size-[180px] rounded-full bg-cloud-200 opacity-60 lg:-right-18 lg:-bottom-20 lg:size-[300px]" />
        <div className="absolute inset-0 flex items-center justify-center text-neutral-900 opacity-75 lg:hidden">
          <Icon name="book" size={88} strokeWidth={1.4} />
        </div>
        <div className="hidden h-full lg:block">
          <PreviewCards />
        </div>
      </div>
 
      {/* Copy & actions */}
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 px-7 pt-8 pb-7 lg:mx-0 lg:max-w-[640px] lg:justify-center lg:gap-8 lg:px-20 lg:py-14 xl:ml-auto">
        <div className="hidden lg:block">
          <Logo size="lg" />
        </div>
 
        <div className="flex flex-col gap-2.5 lg:gap-4">
          <h1 className={typography.display}>{ONBOARDING.headline}</h1>
          <p className={`${typography.lead} lg:max-w-[480px]`}>{ONBOARDING.description}</p>
        </div>
 
        <ul className="mt-1 flex flex-col gap-3 lg:gap-3.5">
          {ONBOARDING.badges.map((badge) => (
            <li key={badge.label} className="flex items-start gap-3 lg:gap-3.5">
              <ToneBadge label={badge.label} tone={badge.tone} />
              <span className="pt-1 text-[13px] leading-[1.5] text-neutral-600 lg:pt-[5px] lg:text-sm">
                {badge.description}
              </span>
            </li>
          ))}
        </ul>
 
        <div className="flex-1 lg:hidden" />
 
        <StepDots />
 
        <div className="flex flex-col gap-5 lg:mt-3 lg:flex-row lg:items-center">
          <Link
            href="/journal"
            className="flex h-[52px] items-center justify-center rounded-[14px] bg-neutral-900 px-[30px] text-[15px] leading-none font-semibold text-surface shadow-md hover:text-surface"
          >
            <span className="lg:hidden">{ONBOARDING.primaryCta}</span>
            <span className="hidden lg:inline">{ONBOARDING.primaryCtaDesktop}</span>
          </Link>
          <Link href="/journal" className="text-center text-[13px] leading-none font-semibold text-neutral-400 lg:hidden">
            {ONBOARDING.skipLabel}
          </Link>
          <Link href="#" className="hidden text-sm leading-none font-semibold lg:inline">
            {ONBOARDING.signInLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}