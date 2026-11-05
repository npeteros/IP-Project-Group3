// Placeholder journal data until the pages are wired to the entries API.

export const STREAK_DAYS = 12

export const JOURNAL_FILTERS = ['All', 'Gratitude', 'Work', 'Family']

export type JournalEntry = {
  id: string
  date: string
  title: string
  excerpt: string
  tags: string[]
}

export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'entry-1',
    date: 'Today, Aug 25',
    title: 'A slower morning',
    excerpt: 'Woke up before the alarm and just sat with my coffee for a while, no phone, no rush.',
    tags: ['Gratitude'],
  },
  {
    id: 'entry-2',
    date: 'Mon, Aug 24',
    title: 'Deadline stress',
    excerpt: 'The client call moved up a day and I felt that familiar tightness in my chest again.',
    tags: ['Work'],
  },
  {
    id: 'entry-3',
    date: 'Sun, Aug 23',
    title: 'Sunday call with mom',
    excerpt: "She told the story about the garden again and I didn't mind hearing it twice.",
    tags: ['Family'],
  },
  {
    id: 'entry-4',
    date: 'Fri, Aug 22',
    title: 'Small wins',
    excerpt: "Finally fixed the thing that's been bugging me on the project for two weeks.",
    tags: ['Work'],
  },
  {
    id: 'entry-5',
    date: 'Thu, Aug 21',
    title: 'Grateful, tired',
    excerpt: "Long day but the kids' laughter at dinner made all of it worth it.",
    tags: ['Family'],
  },
  {
    id: 'entry-6',
    date: 'Wed, Aug 20',
    title: 'A quiet walk',
    excerpt: 'Took the long way home just to be outside a little longer before it got dark.',
    tags: ['Gratitude'],
  },
]
