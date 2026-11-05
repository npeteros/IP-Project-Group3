import { AiDisclosure, InsightCard, TraitBar } from '@/components/insights'
import { PERSONALITY } from '@/src/lib/placeholders/insights'

export default function PersonalityPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <p className="text-xs leading-normal text-neutral-400 md:text-[13px]">
        Based on {PERSONALITY.entryCount} entries · Last updated {PERSONALITY.lastUpdated}
      </p>

      <div className="grid grid-cols-1 items-start gap-4 md:gap-5 lg:grid-cols-[1.6fr_1fr]">
        <InsightCard title="The Big Five">
          <div className="flex flex-col gap-4">
            {PERSONALITY.traits.map((trait) => (
              <TraitBar key={trait.name} trait={trait} />
            ))}
          </div>
        </InsightCard>

        <InsightCard title="What this means" className="gap-2">
          <p className="text-[13px] leading-[1.6] text-neutral-600">{PERSONALITY.meaning}</p>
        </InsightCard>
      </div>

      <AiDisclosure />
    </div>
  )
}
