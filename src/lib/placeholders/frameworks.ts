// Placeholder framework data until frameworks are backed by the API.

import type { IconName } from '@/src/lib/constants'

export type Framework = {
  id: string
  name: string
  description: string
  duration: string
  icon: IconName
  /** Prompts answered in order when using the framework. */
  prompts: string[]
}

export const FRAMEWORKS: Framework[] = [
  {
    id: 'first-principles',
    name: 'First Principles',
    description: 'Break a problem down to its basics',
    duration: '5 min',
    icon: 'layers',
    prompts: [
      'What problem am I actually trying to solve?',
      'What do I know is true about it, for certain?',
      'What would I build from only those truths?',
    ],
  },
  {
    id: 'ikigai',
    name: 'Ikigai',
    description: 'Find where purpose and passion meet',
    duration: '8 min',
    icon: 'globe',
    prompts: [
      'What do I love doing?',
      'What am I good at?',
      'What does the world need from me?',
      'What could I be paid for?',
    ],
  },
  {
    id: 'daily-review',
    name: 'Daily Review',
    description: 'Three quick prompts to close the day',
    duration: '3 min',
    icon: 'check',
    prompts: [
      'What went well today?',
      'What could have gone better?',
      'One thing to carry into tomorrow',
    ],
  },
  {
    id: 'regret-minimization',
    name: 'Regret Minimization',
    description: 'Decide by looking back from age 80',
    duration: '6 min',
    icon: 'cross',
    prompts: [
      'What decision am I facing?',
      'Looking back at 80, which choice would I regret not making?',
      "What's the smallest step toward that choice?",
    ],
  },
  {
    id: 'gratitude-map',
    name: 'Gratitude Map',
    description: 'Trace one good thing to its roots',
    duration: '4 min',
    icon: 'heart',
    prompts: [
      "What's one good thing from today?",
      'What made it possible?',
      'Who or what can I thank for it?',
    ],
  },
]

export function getFramework(id: string): Framework | undefined {
  return FRAMEWORKS.find((framework) => framework.id === id)
}

export const FRAMEWORK_BUILDER = {
  title: 'New framework',
  namePlaceholder: 'Name it, e.g. Sunday Reset',
  promptPlaceholder: 'Add a prompt…',
  maxPrompts: 10,
}
