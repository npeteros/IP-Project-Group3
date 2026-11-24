import type { FrameworkIcon } from '../src/lib/constants'

/**
 * The built-in frameworks every user sees. Ids are fixed so re-running the seed updates these rows
 * in place, and entries written with a built-in keep pointing at it.
 */
export const BUILT_IN_FRAMEWORKS: {
  id: string
  name: string
  description: string
  icon: FrameworkIcon
  durationMinutes: number
  prompts: string[]
}[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'First Principles',
    description: 'Break a problem down to its basics',
    icon: 'layers',
    durationMinutes: 5,
    prompts: [
      'What problem am I actually trying to solve?',
      'What do I know is true about it, for certain?',
      'What would I build from only those truths?',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Ikigai',
    description: 'Find where purpose and passion meet',
    icon: 'globe',
    durationMinutes: 8,
    prompts: [
      'What do I love doing?',
      'What am I good at?',
      'What does the world need from me?',
      'What could I be paid for?',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Daily Review',
    description: 'Three quick prompts to close the day',
    icon: 'check',
    durationMinutes: 3,
    prompts: [
      'What went well today?',
      'What could have gone better?',
      'One thing to carry into tomorrow',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Regret Minimization',
    description: 'Decide by looking back from age 80',
    icon: 'cross',
    durationMinutes: 6,
    prompts: [
      'What decision am I facing?',
      'Looking back at 80, which choice would I regret not making?',
      "What's the smallest step toward that choice?",
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'Gratitude Map',
    description: 'Trace one good thing to its roots',
    icon: 'heart',
    durationMinutes: 4,
    prompts: [
      "What's one good thing from today?",
      'What made it possible?',
      'Who or what can I thank for it?',
    ],
  },
]
