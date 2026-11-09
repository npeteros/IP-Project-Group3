import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { AiDisclosure, InsightCard } from '@/components/insights'
import { NEW_ENTRY_HREF } from '@/src/lib/constants'
import { GROWTH_INTRO, GROWTH_SUGGESTIONS } from '@/src/lib/placeholders/insights'
import { typography } from '@/src/lib/typography'

export default function GrowthPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <p className={`${typography.bodySmall} max-w-[560px] md:text-sm`}>{GROWTH_INTRO}</p>

      <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {GROWTH_SUGGESTIONS.map((suggestion) => (
          <li key={suggestion.id}>
            <InsightCard className="h-full gap-2.5">
              <Icon
                name={suggestion.icon}
                size={20}
                strokeWidth={1.75}
                className="text-cloud-700"
              />
              <h2 className="text-[15px] leading-[1.3] font-semibold">{suggestion.title}</h2>
              <p className="flex-1 text-[13px] leading-normal text-neutral-600">
                {suggestion.body}
              </p>
              <Link href={NEW_ENTRY_HREF} className="mt-1 text-[13px] leading-none font-bold">
                Try this →
              </Link>
            </InsightCard>
          </li>
        ))}
      </ul>

      <AiDisclosure />
    </div>
  )
}
