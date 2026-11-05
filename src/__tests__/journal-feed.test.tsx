import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { JournalFeed } from '@/components/JournalFeed'
import type { JournalEntry } from '@/src/lib/placeholders/journal'

const ENTRIES: JournalEntry[] = [
  { id: 'a', date: 'Mon', title: 'Deadline stress', excerpt: 'Client call', tags: ['Work'] },
  { id: 'b', date: 'Sun', title: 'Call with mom', excerpt: 'Garden story', tags: ['Family'] },
  { id: 'c', date: 'Sat', title: 'Quiet walk', excerpt: 'Long way home', tags: ['Gratitude'] },
]

function renderFeed() {
  render(<JournalFeed entries={ENTRIES} filters={['All', 'Work', 'Family', 'Gratitude']} />)
}

const titles = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('JournalFeed', () => {
  it('shows every entry by default, each linking to its editor', () => {
    renderFeed()
    expect(titles()).toEqual(['Deadline stress', 'Call with mom', 'Quiet walk'])
    expect(screen.getByRole('link', { name: /Quiet walk/ }).getAttribute('href')).toBe('/journal/c')
  })

  it('filters by tag', () => {
    renderFeed()
    fireEvent.click(screen.getByRole('button', { name: 'Family' }))
    expect(titles()).toEqual(['Call with mom'])
    expect(screen.getByRole('button', { name: 'Family' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('searches title, excerpt and tags case-insensitively', () => {
    renderFeed()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'GARDEN' } })
    expect(titles()).toEqual(['Call with mom'])
  })

  it('says so when nothing matches', () => {
    renderFeed()
    fireEvent.click(screen.getByRole('button', { name: 'Work' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'garden' } })
    expect(titles()).toEqual([])
    expect(screen.getByText('No entries match.')).toBeTruthy()
  })
})
