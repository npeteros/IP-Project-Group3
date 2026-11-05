// Placeholder framework data until frameworks are backed by the API.

import type { IconName } from '@/src/lib/constants'

export type Framework = {
  id: string
  name: string
  description: string
  duration: string
  icon: IconName
}

export const FRAMEWORKS: Framework[] = [
  {
    id: 'first-principles',
    name: 'First Principles',
    description: 'Break a problem down to its basics',
    duration: '5 min',
    icon: 'layers',
  },
  {
    id: 'ikigai',
    name: 'Ikigai',
    description: 'Find where purpose and passion meet',
    duration: '8 min',
    icon: 'globe',
  },
  {
    id: 'daily-review',
    name: 'Daily Review',
    description: 'Three quick prompts to close the day',
    duration: '3 min',
    icon: 'check',
  },
  {
    id: 'regret-minimization',
    name: 'Regret Minimization',
    description: 'Decide by looking back from age 80',
    duration: '6 min',
    icon: 'cross',
  },
  {
    id: 'gratitude-map',
    name: 'Gratitude Map',
    description: 'Trace one good thing to its roots',
    duration: '4 min',
    icon: 'heart',
  },
]
