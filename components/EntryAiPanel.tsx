'use client'

import { MOOD_LABELS, type AnalysisStatus } from '@/src/lib/entry-analysis'
import { AI_MESSAGES, AI_PANEL } from '@/src/lib/constants'
import { typography } from '@/src/lib/typography'
import type { Mood } from '@/src/server/entry/schemas'
import { CompanionChat } from './CompanionChat'
import { Icon } from './Icon'

/** The entry's analysis and the tag suggestions that came with it. */
export type EntryAnalysisView = {
  mood: Mood | null
  summary: string | null
  status: AnalysisStatus
  /** Runs the analysis again, or for the first time on an entry that has none. */
  onAnalyze: () => void
  /** Suggested tags still on offer: not dismissed and not already on the entry. */
  suggestions: string[]
  /** The suggestion being saved right now, if any. */
  acceptingTag: string | null
  onAcceptTag: (name: string) => void
  onDismissTag: (name: string) => void
}

const QUIET_TEXT = 'text-[13px] leading-[1.5] text-neutral-600'

function MoodChip({ mood }: { mood: Mood }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-sage-100 px-2.5 py-[5px] text-[11px] leading-none font-semibold text-sage-700">
      {MOOD_LABELS[mood]} mood detected
    </span>
  )
}

function AnalysisCard({ analysis }: { analysis?: EntryAnalysisView }) {
  const { mood, summary, status } = analysis ?? { mood: null, summary: null, status: 'idle' }
  const analyzed = Boolean(mood || summary)

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-neutral-200 bg-surface p-4">
      {mood && <MoodChip mood={mood} />}

      {summary && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] leading-none font-semibold">Summary</h3>
          <p className="text-[13px] leading-normal text-neutral-600">{summary}</p>
        </div>
      )}

      {/* Nothing here ever blocks writing or saving: these are quiet notes, not errors */}
      {status === 'loading' && (
        <output className={`${QUIET_TEXT} block animate-pulse`}>{AI_PANEL.analyzing}</output>
      )}

      {!analyzed && status === 'idle' && (
        <p className={typography.bodySmall}>
          {analysis ? AI_PANEL.savedNotAnalyzed : AI_PANEL.notAnalyzed}
        </p>
      )}

      {(status === 'rate-limited' || status === 'failed') && (
        <output className={`${QUIET_TEXT} block`}>
          {status === 'rate-limited' ? AI_MESSAGES.rateLimited : AI_MESSAGES.analysisFailed}
        </output>
      )}

      {analysis && status !== 'loading' && (!analyzed || status !== 'idle') && (
        <button
          type="button"
          onClick={analysis.onAnalyze}
          className="w-fit rounded-full border border-neutral-200 px-3.5 py-[7px] text-xs leading-none font-medium text-neutral-600 hover:text-neutral-900"
        >
          {status === 'idle' ? 'Analyze entry' : 'Try again'}
        </button>
      )}
    </div>
  )
}

function SuggestedTags({ analysis }: { analysis: EntryAnalysisView }) {
  if (analysis.suggestions.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-neutral-200 bg-surface p-4">
      <h3 className="text-xs leading-none font-semibold tracking-[0.04em] text-neutral-400 uppercase">
        Suggested tags
      </h3>
      <ul aria-label="Suggested tags" className="flex flex-wrap gap-2">
        {analysis.suggestions.map((tag) => {
          const accepting = analysis.acceptingTag === tag
          return (
            <li
              key={tag}
              className="flex items-center rounded-full border-[1.5px] border-dashed border-sage-200 text-xs leading-none font-semibold text-sage-700 hover:border-sage-500"
            >
              <button
                type="button"
                disabled={analysis.acceptingTag !== null}
                onClick={() => analysis.onAcceptTag(tag)}
                aria-label={`Add suggested tag ${tag}`}
                className="flex items-center gap-[5px] py-1.5 pr-1 pl-[11px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="plus" size={11} strokeWidth={2.5} />
                {accepting ? 'Adding…' : tag}
              </button>
              <button
                type="button"
                disabled={analysis.acceptingTag !== null}
                onClick={() => analysis.onDismissTag(tag)}
                aria-label={`Dismiss suggested tag ${tag}`}
                className="rounded-full p-1.5 pr-2 text-sage-700/70 hover:text-sage-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="close" size={10} strokeWidth={2.5} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * The "For this entry" panel: mood and summary, suggested tags and the Companion. `analysis` is
 * left out for an entry that hasn't been saved yet, which has nothing to analyze, but the
 * Companion still answers about the draft.
 */
export function EntryAiPanel({
  draft,
  analysis,
}: {
  draft: { title: string; body: string }
  analysis?: EntryAnalysisView
}) {
  return (
    <>
      <AnalysisCard analysis={analysis} />
      {analysis && <SuggestedTags analysis={analysis} />}
      <CompanionChat draft={draft} />
    </>
  )
}
