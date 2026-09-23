import { APP_NAME, STREAK_DAYS, type JournalEntry, type Tone } from "@/lib/constants";
import { typography } from "@/lib/typography";
import { Icon } from "./Icon";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-8" : "size-[30px]";

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${box} flex flex-none items-center justify-center rounded-[9px] bg-neutral-900 text-surface`}>
        <Icon name="book" size={size === "lg" ? 16 : 15} />
      </div>
      <span className={size === "lg" ? "font-serif text-xl leading-none font-semibold" : typography.wordmark}>{APP_NAME}</span>
    </div>
  );
}

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-2 text-amber-500">
      <Icon name="flame" size={14} />
      <span className="text-[13px] leading-none font-bold text-amber-700">
        {compact ? STREAK_DAYS : `${STREAK_DAYS} day streak`}
      </span>
    </div>
  );
}

export function Tag({ label, className = "bg-neutral-100" }: { label: string; className?: string }) {
  return <span className={`${typography.tag} rounded-full px-2.5 py-1 text-neutral-600 ${className}`}>{label}</span>;
}

export function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`${typography.chip} flex-none rounded-full px-4 py-2 lg:px-[18px] lg:py-[9px] ${
        active
          ? "bg-neutral-900 font-semibold text-surface"
          : "border border-neutral-200 bg-surface font-medium text-neutral-600"
      }`}
    >
      {label}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-surface shadow-sm ${className}`}>{children}</div>
  );
}

export function EntryCard({ entry, tagClassName }: { entry: JournalEntry; tagClassName?: string }) {
  return (
    <Card className="flex flex-col gap-2 p-[18px] lg:p-5">
      <span className={typography.caption}>{entry.date}</span>
      <h3 className={typography.entryTitle}>{entry.title}</h3>
      <p className={typography.bodySmall}>{entry.excerpt}</p>
      <div className="mt-0.5 flex gap-1.5">
        {entry.tags.map((tag) => (
          <Tag key={tag} label={tag} className={tagClassName} />
        ))}
      </div>
    </Card>
  );
}

const TONE_CLASSES: Record<Tone, { pill: string; dot: string }> = {
  cloud: { pill: "border-cloud-200 bg-cloud-100 text-cloud-700", dot: "bg-cloud-700" },
  sage: { pill: "border-sage-200 bg-sage-100 text-sage-700", dot: "bg-sage-700" },
};

export function ToneBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex flex-none items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2.5 ${TONE_CLASSES[tone].pill}`}
    >
      <Icon name="check" size={14} />
      <span className="text-xs leading-none font-semibold">{label}</span>
    </span>
  );
}

export function MoodDot({ tone }: { tone: Tone }) {
  return <span className={`size-[7px] rounded-full ${TONE_CLASSES[tone].dot}`} />;
}

export function PrimaryButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-surface ${typography.label} ${className}`}
    >
      {children}
    </button>
  );
}
