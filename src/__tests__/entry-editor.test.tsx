import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EntryEditor } from '@/components/EntryEditor'
import type { EntryAnalysis } from '@/src/lib/placeholders/editor'

const ANALYSIS: EntryAnalysis = {
  mood: 'Calm',
  suggestedTags: ['Morning', 'gratitude'],
  summary: ['Grateful for a quiet morning'],
  companionPrompt: 'What made this morning feel different?',
}

/** Pass `null` for a brand-new entry with no AI analysis. */
function renderEditor(analysis: EntryAnalysis | null = ANALYSIS) {
  render(
    <EntryEditor
      dateLabel="Today, Aug 25 · 8:14 AM"
      initial={{ title: 'A slower morning', body: 'Coffee, no phone.', tags: ['Gratitude'] }}
      analysis={analysis ?? undefined}
    />,
  )
}

const tagNames = () =>
  within(screen.getByRole('list', { name: 'Tags' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent)
    .filter((text) => text !== 'Add tag')

describe('EntryEditor', () => {
  it('hides suggestions that are already tags, case-insensitively', () => {
    renderEditor()
    expect(screen.getByRole('button', { name: 'Add suggested tag Morning' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add suggested tag gratitude' })).toBeNull()
  })

  it('adds a suggested tag to the entry', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Add suggested tag Morning' }))
    expect(tagNames()).toEqual(['Gratitude', 'Morning'])
    expect(screen.getByText('All suggested tags added.')).toBeTruthy()
  })

  it('adds a typed tag on Enter and ignores duplicates', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const input = screen.getByRole('textbox', { name: 'New tag' })
    fireEvent.change(input, { target: { value: '  Work ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(tagNames()).toEqual(['Gratitude', 'Work'])

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const again = screen.getByRole('textbox', { name: 'New tag' })
    fireEvent.change(again, { target: { value: 'WORK' } })
    fireEvent.keyDown(again, { key: 'Enter' })
    expect(tagNames()).toEqual(['Gratitude', 'Work'])
  })

  it('removes a tag', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag Gratitude' }))
    expect(tagNames()).toEqual([])
  })

  it('appends the companion prompt to the entry and hides the card', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Add to entry' }))
    const body = screen.getByRole('textbox', { name: 'Entry' }) as HTMLTextAreaElement
    expect(body.value).toBe('Coffee, no phone.\n\nWhat made this morning feel different?\n')
    expect(screen.queryByRole('region', { name: 'Moodiary companion' })).toBeNull()
  })

  it('dismisses the companion with "Not now"', () => {
    renderEditor()
    expect(screen.getByRole('region', { name: 'Moodiary companion' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('region', { name: 'Moodiary companion' })).toBeNull()
  })

  it('explains the empty AI panel for a new entry', () => {
    renderEditor(null)
    expect(screen.getByText(/detects the mood, suggests tags/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add to entry' })).toBeNull()
  })

  it('says saving is not connected yet', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: /Save/ }))
    expect(screen.getByText(/Saving isn.t connected yet/)).toBeTruthy()
  })
})
