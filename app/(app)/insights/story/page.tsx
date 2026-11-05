import Link from 'next/link'
import { AiDisclosure } from '@/components/insights'
import { StoryTimeline } from '@/components/StoryTimeline'
import { Card, SectionLabel } from '@/components/ui'
import { STORY_HIGHLIGHT } from '@/src/lib/placeholders/insights'

export default function StoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
        <StoryTimeline />

        <Card className="flex flex-col gap-3.5 p-6 lg:mt-[54px] lg:p-7">
          <SectionLabel>{STORY_HIGHLIGHT.label}</SectionLabel>
          <blockquote className="font-serif text-[19px] leading-normal font-medium italic lg:text-[21px]">
            {STORY_HIGHLIGHT.quote}
          </blockquote>
          <Link
            href={STORY_HIGHLIGHT.href}
            className="text-[13px] leading-none font-semibold text-neutral-400 hover:text-neutral-600"
          >
            {STORY_HIGHLIGHT.source}
          </Link>
        </Card>
      </div>

      <AiDisclosure />
    </div>
  )
}
