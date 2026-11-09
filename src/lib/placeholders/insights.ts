// Placeholder Insights data until the insights endpoints and AI analysis exist.

import type { IconName } from '@/src/lib/constants'

/** Tailwind background class for a chart mark. Kept as literals so Tailwind can see them. */
export type MarkColor = 'bg-sage-500' | 'bg-amber-500' | 'bg-cloud-500' | 'bg-rose-500'

export const INSIGHTS_TABS = [
  { label: 'Overview', href: '/insights', exact: true },
  { label: 'Deeper insights', href: '/insights/deeper' },
  { label: 'Personality', href: '/insights/personality' },
  { label: 'Growth', href: '/insights/growth' },
  { label: 'Story', href: '/insights/story' },
]

export const AI_DISCLOSURE =
  'Generated from your entries via cloud AI. Logged in your Processing Log.'

// Overview

/** Mood score per day, 0 (low) – 100 (high). */
export const MOOD_THIS_WEEK = [
  { day: 'Mon', score: 55 },
  { day: 'Tue', score: 70 },
  { day: 'Wed', score: 48 },
  { day: 'Thu', score: 75 },
  { day: 'Fri', score: 36 },
  { day: 'Sat', score: 62 },
  { day: 'Sun', score: 50 },
]

export const ENTRIES_THIS_MONTH = 18

export const MOOD_MIX: { label: string; count: number; color: MarkColor }[] = [
  { label: 'Calm', count: 8, color: 'bg-sage-500' },
  { label: 'Grateful', count: 6, color: 'bg-amber-500' },
  { label: 'Tired', count: 4, color: 'bg-cloud-500' },
  { label: 'Anxious', count: 3, color: 'bg-rose-500' },
]

export const TOP_THEMES = [
  { label: 'Work', percent: 78 },
  { label: 'Family', percent: 52 },
  { label: 'Gratitude', percent: 40 },
]

// Deeper insights

export const EMOTIONAL_TREND = {
  points: [
    { month: 'Mar', score: 30 },
    { month: 'Apr', score: 45 },
    { month: 'May', score: 38 },
    { month: 'Jun', score: 66 },
    { month: 'Jul', score: 55 },
    { month: 'Aug', score: 78 },
  ],
  caption:
    'Your overall mood has trended steadily upward since May, with a dip around the mid-June deadline crunch.',
}

export type ThemeTrend = 'rising' | 'steady' | 'falling'

export const RECURRING_THEMES: { label: string; mentions: number; trend: ThemeTrend }[] = [
  { label: 'Wanting clearer boundaries at work', mentions: 9, trend: 'rising' },
  { label: 'Gratitude for slower mornings', mentions: 14, trend: 'steady' },
  { label: 'Reconnecting with old friends', mentions: 5, trend: 'rising' },
]

// Personality

export type TraitLevel = 'High' | 'Moderate' | 'Low'

export type Trait = { name: string; level: TraitLevel; score: number }

export const PERSONALITY: {
  entryCount: number
  lastUpdated: string
  traits: Trait[]
  snapshotTraits: string[]
  snapshot: string
  meaning: string
} = {
  entryCount: 62,
  lastUpdated: 'Aug 20',
  traits: [
    { name: 'Openness', level: 'High', score: 82 },
    { name: 'Conscientiousness', level: 'Moderate', score: 58 },
    { name: 'Extraversion', level: 'Low', score: 30 },
    { name: 'Agreeableness', level: 'High', score: 76 },
    { name: 'Emotional stability', level: 'Moderate', score: 54 },
  ],
  /** Traits shown on the Deeper insights snapshot card, in order. */
  snapshotTraits: ['Openness', 'Agreeableness', 'Extraversion'],
  snapshot:
    'You write with curiosity and warmth toward others, but tend to process big feelings alone first.',
  meaning:
    'You write with curiosity and warmth toward others, but tend to process big feelings alone before sharing them — journaling seems to be doing real work here.',
}

// Growth

export const GROWTH_INTRO =
  "A few gentle suggestions based on what you've been writing about lately."

export type GrowthSuggestion = {
  id: string
  icon: IconName
  title: string
  teaser: string
  body: string
}

export const GROWTH_SUGGESTIONS: GrowthSuggestion[] = [
  {
    id: 'sunday-wind-down',
    icon: 'bell',
    title: 'Try a Sunday wind-down ritual',
    teaser: 'Your Monday entries are calmer on weeks you write on Sunday evening.',
    body: 'Your Monday entries are calmer on weeks you write on Sunday evening. A 10-minute reflection before bed might help ease into the week.',
  },
  {
    id: 'old-friend',
    icon: 'users',
    title: 'Reach out to an old friend',
    teaser: "You've mentioned missing touch with a few people this month.",
    body: "You've mentioned missing touch with a few people this month. Even a short message tends to lift your mood in the days after.",
  },
  {
    id: 'work-boundary',
    icon: 'frame',
    title: 'Name one work boundary this week',
    teaser: 'Boundary-setting keeps coming up as a wish, not yet an action.',
    body: 'Boundary-setting keeps coming up as a wish, not yet an action. Pick one small, concrete one to try before Friday.',
  },
]

// Story

export type StoryGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type StoryChapter = {
  label: string
  summary: string
  quote: string
  color: MarkColor
}

export const STORY_GRANULARITIES: { value: StoryGranularity; label: string; unit: string }[] = [
  { value: 'daily', label: 'Daily', unit: 'day' },
  { value: 'weekly', label: 'Weekly', unit: 'week' },
  { value: 'monthly', label: 'Monthly', unit: 'month' },
  { value: 'yearly', label: 'Yearly', unit: 'year' },
]

export const STORY: Record<StoryGranularity, StoryChapter[]> = {
  daily: [
    {
      label: 'Today, Aug 25',
      summary: '1 entry · calm and unhurried.',
      quote: '“Woke up before the alarm and just sat with my coffee...”',
      color: 'bg-sage-500',
    },
    {
      label: 'Mon, Aug 24',
      summary: '1 entry · tense, around a moved-up client call.',
      quote: '“I felt that familiar tightness in my chest again.”',
      color: 'bg-amber-500',
    },
    {
      label: 'Sun, Aug 23',
      summary: '1 entry · warm, after a call with family.',
      quote: '“I didn’t mind hearing it twice.”',
      color: 'bg-cloud-500',
    },
  ],
  weekly: [
    {
      label: 'Aug 18 – 24',
      summary: '6 entries · a steadier week, with a strong Sunday finish.',
      quote: '“Finally fixed the thing that’s been bugging me for two weeks.”',
      color: 'bg-sage-500',
    },
    {
      label: 'Aug 11 – 17',
      summary: '4 entries · deadline-heavy, lighter by the weekend.',
      quote: '“Long day but the kids’ laughter made all of it worth it.”',
      color: 'bg-amber-500',
    },
  ],
  monthly: [
    {
      label: 'August',
      summary: '18 entries · mostly calm, with a dip mid-month around a work deadline.',
      quote: '“Woke up before the alarm and just sat with my coffee...”',
      color: 'bg-sage-500',
    },
    {
      label: 'July',
      summary: '22 entries · a busy but proud month, capped by a short trip.',
      quote: '“Three days away and I actually didn’t check my phone once.”',
      color: 'bg-cloud-500',
    },
    {
      label: 'June',
      summary: '14 entries · a harder month, with a stretch of low energy.',
      quote: '“Not sure why today felt so heavy, but I got through it.”',
      color: 'bg-amber-500',
    },
  ],
  yearly: [
    {
      label: '2026',
      summary: '124 entries · a year of slowing down and setting boundaries.',
      quote: '“I want to remember this feeling more often.”',
      color: 'bg-sage-500',
    },
  ],
}

export const STORY_HIGHLIGHT = {
  label: 'This month, in your words',
  quote: '“Woke up before the alarm and just sat with my coffee for a while, no phone, no rush.”',
  source: 'A slower morning · Aug 25',
  href: '/journal/entry-1',
}
