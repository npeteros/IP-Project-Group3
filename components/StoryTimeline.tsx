'use client'

import { useState } from 'react'
import {
  STORY,
  STORY_GRANULARITIES,
  type StoryChapter,
  type StoryGranularity,
} from '@/src/lib/placeholders/insights'
import { SegmentedControl } from './controls'

function Chapter({ chapter }: { chapter: StoryChapter }) {
  return (
    <li className="flex gap-4 md:gap-5">
      <div className="flex w-10 flex-none justify-center pt-1">
        <span
          aria-hidden="true"
          className={`z-10 size-3.5 rounded-full border-[3px] border-bg ${chapter.color}`}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-neutral-200 bg-surface p-[18px] shadow-sm md:p-5">
        <h2 className="text-base leading-none font-semibold">{chapter.label}</h2>
        <p className="text-[13px] leading-[1.55] text-neutral-600">{chapter.summary}</p>
        <blockquote className="mt-0.5 font-serif text-sm leading-[1.55] italic">
          {chapter.quote}
        </blockquote>
      </div>
    </li>
  )
}

/** Story timeline with a Daily / Weekly / Monthly / Yearly switch over placeholder chapters. */
export function StoryTimeline({
  defaultGranularity = 'monthly',
}: {
  defaultGranularity?: StoryGranularity
}) {
  const [granularity, setGranularity] = useState(defaultGranularity)
  const unit = STORY_GRANULARITIES.find((g) => g.value === granularity)?.unit ?? 'month'
  const chapters = STORY[granularity]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
        <p className="text-[15px] leading-none font-medium text-neutral-600">
          Your story, told a {unit} at a time
        </p>
        <SegmentedControl
          label="Story granularity"
          size="md"
          options={STORY_GRANULARITIES}
          value={granularity}
          onChange={setGranularity}
          className="w-full md:w-[340px]"
        />
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute top-1.5 bottom-1.5 left-[19px] w-0.5 bg-neutral-200"
        />
        <ol className="relative flex flex-col gap-5 md:gap-6">
          {chapters.map((chapter) => (
            <Chapter key={chapter.label} chapter={chapter} />
          ))}
        </ol>
      </div>
    </div>
  )
}
