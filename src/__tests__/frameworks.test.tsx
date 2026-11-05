import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FrameworkBuilder, FrameworkEntry } from '@/components/frameworks'
import { getFramework } from '@/src/lib/placeholders/frameworks'

function addPrompt(text: string) {
  const input = screen.getByRole('textbox', { name: 'New prompt' })
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

const promptTexts = () =>
  within(screen.getByRole('list', { name: 'Prompts' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent)
    .filter(Boolean)

const saveButton = () => screen.getByRole('button', { name: /^Save/ })

describe('FrameworkBuilder', () => {
  it('needs a name and at least one prompt before saving', () => {
    render(<FrameworkBuilder />)
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: 'Framework name' }), {
      target: { value: 'Sunday Reset' },
    })
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    addPrompt('What am I proud of this week?')
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(saveButton())
    expect(screen.getByText(/Saving isn.t connected yet/)).toBeTruthy()
  })

  it('adds prompts from the input and the button, ignoring blanks', () => {
    render(<FrameworkBuilder />)
    addPrompt('First')
    addPrompt('   ')
    fireEvent.change(screen.getByRole('textbox', { name: 'New prompt' }), {
      target: { value: 'Second' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add prompt' }))
    expect(promptTexts()).toEqual(['First', 'Second'])
  })

  it('reorders and removes prompts', () => {
    render(<FrameworkBuilder />)
    addPrompt('A')
    addPrompt('B')
    addPrompt('C')
    expect(
      (screen.getByRole('button', { name: 'Move “A” up' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Move “C” up' }))
    expect(promptTexts()).toEqual(['A', 'C', 'B'])
    fireEvent.click(screen.getByRole('button', { name: 'Move “A” down' }))
    expect(promptTexts()).toEqual(['C', 'A', 'B'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove “A”' }))
    expect(promptTexts()).toEqual(['C', 'B'])
  })
})

describe('FrameworkEntry', () => {
  it('numbers each prompt with an answer field', () => {
    const framework = getFramework('daily-review')
    if (!framework) throw new Error('daily-review placeholder missing')
    render(<FrameworkEntry framework={framework} />)
    expect(screen.getByRole('heading', { name: 'Daily Review' })).toBeTruthy()
    for (const prompt of framework.prompts) {
      expect(screen.getByRole('textbox', { name: new RegExp(prompt) })).toBeTruthy()
    }
  })
})
