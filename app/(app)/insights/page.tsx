import { Icon } from '@/components/Icon'
import { InsightCard, LineChart } from '@/components/insights'
import { ProgressBar, StatCard } from '@/components/ui'
import {
  ENTRIES_THIS_MONTH,
  MOOD_MIX,
  MOOD_THIS_WEEK,
  TOP_THEMES,
} from '@/src/lib/placeholders/insights'
import { STREAK_DAYS } from '@/src/lib/placeholders/journal'

export default function InsightsOverviewPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[2fr_1fr]">
        <InsightCard title="Mood, this week" className="md:p-6">
          <LineChart
            id="mood-week"
            label={`Mood this week: ${MOOD_THIS_WEEK.map((d) => `${d.day} ${d.score}`).join(', ')}`}
            points={MOOD_THIS_WEEK.map((d) => ({ label: d.day, score: d.score }))}
            color="sage"
            height={180}
            dots
          />
        </InsightCard>

        <div className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-1">
          <StatCard value={ENTRIES_THIS_MONTH} label="entries this month" className="flex-1" />
          <StatCard
            value={STREAK_DAYS}
            label="day streak"
            className="flex-1"
            icon={<Icon name="flame" size={22} className="self-center text-amber-500" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <InsightCard title="Mood mix">
          <ul className="flex flex-wrap gap-2.5">
            {MOOD_MIX.map((mood) => (
              <li
                key={mood.label}
                className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-[7px]"
              >
                <span aria-hidden="true" className={`size-2 rounded-full ${mood.color}`} />
                <span className="text-[13px] leading-none font-semibold text-neutral-600">
                  {mood.label} · {mood.count}
                </span>
              </li>
            ))}
          </ul>
        </InsightCard>

        <InsightCard title="Top themes this week">
          <ul className="flex flex-col gap-2.5">
            {TOP_THEMES.map((theme) => (
              <li key={theme.label} className="flex items-center gap-2.5">
                <span className="w-[70px] flex-none text-[13px] leading-none font-medium text-neutral-600">
                  {theme.label}
                </span>
                <ProgressBar value={theme.percent} label={theme.label} />
              </li>
            ))}
          </ul>
        </InsightCard>
      </div>
    </div>
  )
}
