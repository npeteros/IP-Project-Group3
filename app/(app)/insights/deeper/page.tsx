import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { AiDisclosure, InsightCard, LineChart, TraitBar, TrendBadge } from '@/components/insights'
import {
  EMOTIONAL_TREND,
  GROWTH_SUGGESTIONS,
  PERSONALITY,
  RECURRING_THEMES,
} from '@/src/lib/placeholders/insights'
import { typography } from '@/src/lib/typography'

export default function DeeperInsightsPage() {
  const snapshotTraits = PERSONALITY.snapshotTraits.flatMap(
    (name) => PERSONALITY.traits.find((trait) => trait.name === name) ?? [],
  )
  const [topSuggestion] = GROWTH_SUGGESTIONS

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4 md:gap-5">
          <InsightCard title="Emotional trend, last 6 months">
            <LineChart
              id="emotional-trend"
              label={`Emotional trend: ${EMOTIONAL_TREND.points.map((p) => `${p.month} ${p.score}`).join(', ')}`}
              points={EMOTIONAL_TREND.points.map((p) => ({ label: p.month, score: p.score }))}
              color="cloud"
            />
            <p className={typography.bodySmall}>{EMOTIONAL_TREND.caption}</p>
          </InsightCard>

          <InsightCard title="Recurring themes">
            <ul className="flex flex-col gap-3.5">
              {RECURRING_THEMES.map((theme) => (
                <li key={theme.label} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm leading-[1.3] font-semibold">{theme.label}</span>
                    <span className="text-xs leading-[1.4] text-neutral-400">
                      Mentioned in {theme.mentions} entries
                    </span>
                  </div>
                  <TrendBadge trend={theme.trend} />
                </li>
              ))}
            </ul>
          </InsightCard>
        </div>

        <div className="flex flex-col gap-4 md:gap-5">
          <InsightCard
            title="Personality snapshot"
            aside={
              <span className="text-xs leading-none font-medium text-neutral-400">
                {PERSONALITY.entryCount} entries
              </span>
            }
          >
            <div className="flex flex-col gap-3.5">
              {snapshotTraits.map((trait) => (
                <TraitBar key={trait.name} trait={trait} />
              ))}
            </div>
            <p className="text-xs leading-[1.55] text-neutral-600">{PERSONALITY.snapshot}</p>
            <Link href="/insights/personality" className="text-[13px] leading-none font-bold">
              Full profile →
            </Link>
          </InsightCard>

          <InsightCard title="For you" className="gap-2.5">
            <Icon
              name={topSuggestion.icon}
              size={20}
              strokeWidth={1.75}
              className="text-cloud-700"
            />
            <h3 className="text-sm leading-[1.3] font-semibold">{topSuggestion.title}</h3>
            <p className="text-xs leading-[1.55] text-neutral-600">{topSuggestion.teaser}</p>
            <Link href="/insights/growth" className="mt-0.5 text-[13px] leading-none font-bold">
              View all suggestions →
            </Link>
          </InsightCard>
        </div>
      </div>

      <AiDisclosure />
    </div>
  )
}
