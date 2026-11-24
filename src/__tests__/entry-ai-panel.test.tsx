import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EntryAiPanel, type EntryAnalysisView } from '@/components/EntryAiPanel'
import { AI_MESSAGES, AI_PANEL } from '@/src/lib/constants'
import type { Mood } from '@/src/server/entry/schemas'

// The Companion has its own tests; here it only needs to show it received the draft
vi.mock('@/components/CompanionChat', () => ({
  CompanionChat: ({ draft }: { draft: { title: string; body: string } }) => (
    <section aria-label="Companion stub">{`${draft.title} | ${draft.body}`}</section>
  ),
}))

const DRAFT = { title: 'A slower morning', body: 'Coffee, no phone.' }

function analysis(overrides: Partial<EntryAnalysisView> = {}): EntryAnalysisView {
  return {
    mood: null,
    summary: null,
    status: 'idle',
    onAnalyze: vi.fn(),
    suggestions: [],
    acceptingTag: null,
    suggestionsLocked: false,
    onAcceptTag: vi.fn(),
    onDismissTag: vi.fn(),
    ...overrides,
  }
}

const renderPanel = (view?: EntryAnalysisView) =>
  render(<EntryAiPanel draft={DRAFT} analysis={view} />)

afterEach(cleanup)

describe('EntryAiPanel: a new entry', () => {
  it('explains what will appear once there is something to analyze', () => {
    renderPanel()
    expect(screen.getByText(AI_PANEL.notAnalyzed)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Analyze entry' })).toBeNull()
    expect(screen.queryByText('Suggested tags')).toBeNull()
  })

  it('still has the Companion, which talks about the draft', () => {
    renderPanel()
    expect(screen.getByRole('region', { name: 'Companion stub' }).textContent).toBe(
      'A slower morning | Coffee, no phone.',
    )
  })
})

describe('EntryAiPanel: mood and summary', () => {
  it('shows an empty state with an Analyze button for a saved entry that was never analyzed', () => {
    const view = analysis()
    renderPanel(view)

    expect(screen.getByText(AI_PANEL.savedNotAnalyzed)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Analyze entry' }))
    expect(view.onAnalyze).toHaveBeenCalledTimes(1)
  })

  it.each<[Mood, string]>([
    ['CALM', 'Calm mood detected'],
    ['GRATEFUL', 'Grateful mood detected'],
    ['ANXIOUS', 'Anxious mood detected'],
    ['FRUSTRATED', 'Frustrated mood detected'],
  ])('shows the %s mood as "%s"', (mood, label) => {
    renderPanel(analysis({ mood, summary: 'A short summary.' }))
    expect(screen.getByText(label)).toBeTruthy()
  })

  it('shows the summary under a heading', () => {
    renderPanel(analysis({ mood: 'CALM', summary: 'A quiet morning with no rush.' }))

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeTruthy()
    expect(screen.getByText('A quiet morning with no rush.')).toBeTruthy()
  })

  it('has no empty state and no Analyze button once analyzed', () => {
    renderPanel(analysis({ mood: 'CALM', summary: 'A quiet morning.' }))

    expect(screen.queryByText(AI_PANEL.savedNotAnalyzed)).toBeNull()
    expect(screen.queryByText(AI_PANEL.notAnalyzed)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Analyze entry' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })

  it('shows a loading state while the analysis runs, with no way to start another', () => {
    renderPanel(analysis({ status: 'loading' }))

    expect(screen.getByRole('status').textContent).toBe(AI_PANEL.analyzing)
    expect(screen.queryByRole('button', { name: /Analyze entry|Try again/ })).toBeNull()
    // The "not analyzed" empty state would be wrong while it's running
    expect(screen.queryByText(AI_PANEL.savedNotAnalyzed)).toBeNull()
  })

  it('keeps showing the earlier mood and summary while analyzing again', () => {
    renderPanel(analysis({ status: 'loading', mood: 'HAPPY', summary: 'Earlier summary.' }))

    expect(screen.getByText('Happy mood detected')).toBeTruthy()
    expect(screen.getByText('Earlier summary.')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(AI_PANEL.analyzing)
  })
})

describe('EntryAiPanel: failures stay quiet', () => {
  it('says so quietly when rate limited, and offers to try again', () => {
    const view = analysis({ status: 'rate-limited' })
    renderPanel(view)

    expect(screen.getByRole('status').textContent).toBe(AI_MESSAGES.rateLimited)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(view.onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('says so quietly when the analysis fails, and offers to try again', () => {
    const view = analysis({ status: 'failed' })
    renderPanel(view)

    expect(screen.getByRole('status').textContent).toBe(AI_MESSAGES.analysisFailed)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(view.onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('never uses an alert, which would interrupt the user', () => {
    renderPanel(analysis({ status: 'failed' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps the earlier analysis visible next to the message', () => {
    renderPanel(analysis({ status: 'rate-limited', mood: 'CALM', summary: 'Still here.' }))

    expect(screen.getByText('Calm mood detected')).toBeTruthy()
    expect(screen.getByText('Still here.')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(AI_MESSAGES.rateLimited)
  })

  it('does not hide the Companion when the analysis fails', () => {
    renderPanel(analysis({ status: 'failed' }))
    expect(screen.getByRole('region', { name: 'Companion stub' })).toBeTruthy()
  })
})

describe('EntryAiPanel: suggested tags', () => {
  const chips = () =>
    within(screen.getByRole('list', { name: 'Suggested tags' })).getAllByRole('listitem')

  it('shows each suggestion as a chip', () => {
    renderPanel(analysis({ mood: 'CALM', summary: 's', suggestions: ['Morning', 'Rest'] }))

    expect(screen.getByRole('heading', { name: 'Suggested tags' })).toBeTruthy()
    expect(chips().map((chip) => chip.textContent)).toEqual(['Morning', 'Rest'])
  })

  it('shows no section when there is nothing to suggest', () => {
    renderPanel(analysis({ mood: 'CALM', summary: 's', suggestions: [] }))
    expect(screen.queryByRole('heading', { name: 'Suggested tags' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Suggested tags' })).toBeNull()
  })

  it('accepts a chip', () => {
    const view = analysis({ suggestions: ['Morning', 'Rest'] })
    renderPanel(view)

    fireEvent.click(screen.getByRole('button', { name: 'Add suggested tag Rest' }))

    expect(view.onAcceptTag).toHaveBeenCalledWith('Rest')
    expect(view.onDismissTag).not.toHaveBeenCalled()
  })

  it('dismisses a chip', () => {
    const view = analysis({ suggestions: ['Morning', 'Rest'] })
    renderPanel(view)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss suggested tag Morning' }))

    expect(view.onDismissTag).toHaveBeenCalledWith('Morning')
    expect(view.onAcceptTag).not.toHaveBeenCalled()
  })

  it('shows the chip being saved and disables the others until it finishes', () => {
    renderPanel(
      analysis({
        suggestions: ['Morning', 'Rest'],
        acceptingTag: 'Morning',
        suggestionsLocked: true,
      }),
    )

    expect(screen.getByText('Adding…')).toBeTruthy()
    for (const button of screen.getAllByRole('button', { name: /suggested tag/ })) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('disables the chips while the entry is being saved, with none shown as adding', () => {
    renderPanel(analysis({ suggestions: ['Morning', 'Rest'], suggestionsLocked: true }))

    expect(screen.queryByText('Adding…')).toBeNull()
    for (const button of screen.getAllByRole('button', { name: /suggested tag/ })) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })
})
