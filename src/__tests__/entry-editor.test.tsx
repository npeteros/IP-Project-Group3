import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EntryEditor } from '@/components/EntryEditor'
import type { EntryFormValues } from '@/src/lib/entry-form'
import type { EntryAnalysis } from '@/src/lib/placeholders/editor'
import {
  EntryCreateSchema,
  EntryUpdateSchema,
  type EntryCreateOutput,
  type EntryUpdateOutput,
  TAG_NAME_MAX_LENGTH,
  TAGS_PER_ENTRY_MAX,
} from '@/src/server/entry/schemas'

const ANALYSIS: EntryAnalysis = {
  mood: 'Calm',
  suggestedTags: ['Morning', 'gratitude'],
  summary: ['Grateful for a quiet morning'],
  companionPrompt: 'What made this morning feel different?',
}

const INITIAL: EntryFormValues = {
  title: 'A slower morning',
  body: 'Coffee, no phone.',
  tags: ['Gratitude'],
}

type EditorOptions = {
  /** Pass `null` for a brand-new entry with no AI analysis. */
  analysis?: EntryAnalysis | null
  initial?: EntryFormValues
  schema?: typeof EntryCreateSchema | typeof EntryUpdateSchema
  onSave?: (values: EntryCreateOutput | EntryUpdateOutput) => Promise<EntryFormValues | void>
  onDelete?: () => void
  tagSuggestions?: string[]
  isSaving?: boolean
  isDeleting?: boolean
  error?: string | null
}

function renderEditor({
  analysis = ANALYSIS,
  initial = INITIAL,
  schema = EntryUpdateSchema,
  onSave = vi.fn(async () => {}),
  ...rest
}: EditorOptions = {}) {
  render(
    <EntryEditor
      schema={schema}
      dateLabel="Today, Aug 25 · 8:14 AM"
      initial={initial}
      analysis={analysis ?? undefined}
      onSave={onSave}
      {...rest}
    />,
  )
  return { onSave }
}

const tagNames = () =>
  within(screen.getByRole('list', { name: 'Tags' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent)
    .filter((text) => text !== 'Add tag')

const saveButton = () => screen.getByRole('button', { name: /Save|Done|Saving/ })
const bodyField = () => screen.getByRole('textbox', { name: 'Entry' }) as HTMLTextAreaElement
const titleField = () => screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement

function addTag(name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
  const input = screen.getByRole('textbox', { name: 'New tag' })
  fireEvent.change(input, { target: { value: name } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

function beforeUnload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

afterEach(() => {
  cleanup()
})

describe('EntryEditor tags and AI panel', () => {
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
    addTag('  Work ')
    expect(tagNames()).toEqual(['Gratitude', 'Work'])

    addTag('WORK')
    expect(tagNames()).toEqual(['Gratitude', 'Work'])
  })

  it('removes a tag', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag Gratitude' }))
    expect(tagNames()).toEqual([])
  })

  it('offers existing tag names while typing, minus the ones already on the entry', () => {
    renderEditor({ tagSuggestions: ['Gratitude', 'Work', 'Family'] })
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))

    // An input with a datalist is exposed as a combobox rather than a textbox
    const input = screen.getByRole('combobox', { name: 'New tag' })
    const list = document.getElementById(input.getAttribute('list') ?? '')
    expect(Array.from(list?.querySelectorAll('option') ?? []).map((o) => o.value)).toEqual([
      'Work',
      'Family',
    ])
  })

  it('appends the companion prompt to the entry and hides the card', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Add to entry' }))
    expect(bodyField().value).toBe('Coffee, no phone.\n\nWhat made this morning feel different?\n')
    expect(screen.queryByRole('region', { name: 'Moodiary companion' })).toBeNull()
  })

  it('dismisses the companion with "Not now"', () => {
    renderEditor()
    expect(screen.getByRole('region', { name: 'Moodiary companion' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('region', { name: 'Moodiary companion' })).toBeNull()
  })

  it('explains the empty AI panel for a new entry', () => {
    renderEditor({ analysis: null })
    expect(screen.getByText(/detects the mood, suggests tags/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add to entry' })).toBeNull()
  })
})

describe('EntryEditor saving', () => {
  it('passes the values the create schema parsed to onSave', async () => {
    const { onSave } = renderEditor({
      schema: EntryCreateSchema,
      initial: { title: '   ', body: '  Hello there  ', tags: ['Work', 'work'] },
    })

    fireEvent.click(saveButton())

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    // A blank title becomes undefined, the body is trimmed and the tags de-duplicated
    expect(onSave).toHaveBeenCalledWith({ title: undefined, body: 'Hello there', tags: ['Work'] })
  })

  it('passes a blank title as null when updating, so it can be cleared', async () => {
    const { onSave } = renderEditor({ initial: { ...INITIAL, title: '' } })

    fireEvent.click(saveButton())

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith({
      title: null,
      body: 'Coffee, no phone.',
      tags: ['Gratitude'],
    })
  })

  it('shows the schema message inline for an empty entry and does not save', async () => {
    const { onSave } = renderEditor({
      schema: EntryCreateSchema,
      initial: { ...INITIAL, body: '' },
    })

    fireEvent.click(saveButton())

    const message = await screen.findByText('Write something before saving.')
    expect(message.getAttribute('role')).toBe('alert')
    expect(bodyField().getAttribute('aria-invalid')).toBe('true')
    expect(bodyField().getAttribute('aria-describedby')).toBe(message.id)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('treats a whitespace-only entry as empty', async () => {
    const { onSave } = renderEditor({ initial: { ...INITIAL, body: '  \n ' } })

    fireEvent.click(saveButton())

    expect(await screen.findByText('Write something before saving.')).toBeTruthy()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('clears the empty-entry message once the user types', async () => {
    renderEditor({ initial: { ...INITIAL, body: '' } })
    fireEvent.click(saveButton())
    await screen.findByText('Write something before saving.')

    fireEvent.change(bodyField(), { target: { value: 'Now there is something' } })

    await waitFor(() => expect(screen.queryByText('Write something before saving.')).toBeNull())
  })

  it('does not submit when Enter is pressed in the title; it moves to the entry', async () => {
    const { onSave } = renderEditor()
    titleField().focus()

    // fireEvent returns false when the default action (the browser's implicit submit) was cancelled
    expect(fireEvent.keyDown(titleField(), { key: 'Enter' })).toBe(false)

    // react-hook-form moves focus on the next tick
    await waitFor(() => expect(document.activeElement).toBe(bodyField()))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('resets the form to the saved values and stops counting them as unsaved', async () => {
    const saved: EntryFormValues = { title: 'Saved title', body: 'Saved body', tags: [] }
    const { onSave } = renderEditor({ onSave: vi.fn(async () => saved) })
    fireEvent.change(bodyField(), { target: { value: 'Edited' } })
    await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(true))

    fireEvent.click(saveButton())

    await waitFor(() => expect(bodyField().value).toBe('Saved body'))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(titleField().value).toBe('Saved title')
    expect(tagNames()).toEqual([])
    expect(beforeUnload().defaultPrevented).toBe(false)
  })

  it('keeps the edits when saving fails', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('boom')
    })
    renderEditor({ onSave })
    fireEvent.change(bodyField(), { target: { value: 'Edited, not saved' } })

    fireEvent.click(saveButton())

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(bodyField().value).toBe('Edited, not saved')
    expect(beforeUnload().defaultPrevented).toBe(true)
  })
})

describe('EntryEditor tag limits', () => {
  it('shows the schema message inline for a tag that is too long, and does not save', async () => {
    const { onSave } = renderEditor()

    addTag('x'.repeat(TAG_NAME_MAX_LENGTH + 1))

    const message = await screen.findByText(
      `Tag names can be at most ${TAG_NAME_MAX_LENGTH} characters.`,
    )
    expect(message.getAttribute('role')).toBe('alert')
    expect(tagNames()).toContain('x'.repeat(TAG_NAME_MAX_LENGTH + 1))

    fireEvent.click(saveButton())
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('accepts a tag of exactly the maximum length', async () => {
    renderEditor()

    addTag('x'.repeat(TAG_NAME_MAX_LENGTH))

    await waitFor(() => expect(tagNames()).toHaveLength(2))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('clears the message when the long tag is removed', async () => {
    renderEditor()
    const tooLong = 'x'.repeat(TAG_NAME_MAX_LENGTH + 1)
    addTag(tooLong)
    await screen.findByText(`Tag names can be at most ${TAG_NAME_MAX_LENGTH} characters.`)

    fireEvent.click(screen.getByRole('button', { name: `Remove tag ${tooLong}` }))

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('shows the schema message inline for more than the maximum number of tags', async () => {
    const full = Array.from({ length: TAGS_PER_ENTRY_MAX }, (_, i) => `tag${i + 1}`)
    const { onSave } = renderEditor({ initial: { ...INITIAL, tags: full } })

    addTag('one-too-many')

    expect(
      await screen.findByText(`An entry can have at most ${TAGS_PER_ENTRY_MAX} tags.`),
    ).toBeTruthy()

    fireEvent.click(saveButton())
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Remove tag one-too-many' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})

describe('EntryEditor pending and error states', () => {
  it('disables Save and the fields while saving', () => {
    renderEditor({ isSaving: true })

    const save = saveButton() as HTMLButtonElement
    expect(save.disabled).toBe(true)
    expect(save.textContent).toBe('Saving…')
    expect(bodyField().readOnly).toBe(true)
    expect(titleField().readOnly).toBe(true)
    expect((screen.getByRole('button', { name: 'Add tag' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('shows a save error in an alert', () => {
    renderEditor({ error: 'Something went wrong.' })
    expect(screen.getByRole('alert').textContent).toBe('Something went wrong.')
  })

  it('shows no alert when there is no error', () => {
    renderEditor()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('EntryEditor unsaved changes', () => {
  it('does not warn for an untouched entry', () => {
    renderEditor()
    expect(beforeUnload().defaultPrevented).toBe(false)
  })

  it('warns once the user edits', async () => {
    renderEditor()
    fireEvent.change(titleField(), { target: { value: 'A different title' } })
    await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(true))
  })

  it('stops warning when the edit is undone', async () => {
    renderEditor()
    fireEvent.change(titleField(), { target: { value: 'A different title' } })
    await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(true))

    fireEvent.change(titleField(), { target: { value: INITIAL.title } })

    await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(false))
  })

  it('asks before the Cancel link leaves with unsaved changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderEditor()
    fireEvent.change(titleField(), { target: { value: 'A different title' } })
    await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(true))

    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))

    expect(confirm).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })
})

describe('EntryEditor delete', () => {
  it('has no Delete button unless a delete handler is given', () => {
    renderEditor()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('asks for confirmation before deleting', () => {
    const onDelete = vi.fn()
    renderEditor({ onDelete })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).not.toHaveBeenCalled()
    const confirmation = screen.getByRole('region', { name: 'Confirm delete' })
    expect(within(confirmation).getByText(/Delete this entry\?/)).toBeTruthy()
    // Focus starts on the safe choice
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep entry' }))
  })

  it('deletes only after the user confirms', () => {
    const onDelete = vi.fn()
    renderEditor({ onDelete })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('keeps the entry when the user backs out', () => {
    const onDelete = vi.fn()
    renderEditor({ onDelete })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    fireEvent.click(screen.getByRole('button', { name: 'Keep entry' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Confirm delete' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
  })

  it('disables the confirmation buttons while deleting', () => {
    renderEditor({ onDelete: vi.fn(), isDeleting: true })
    // Open it through a re-render is not needed: Delete is disabled, so the confirmation can't open
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(saveButton().hasAttribute('disabled')).toBe(true)
  })

  it('does not warn about unsaved changes while deleting', async () => {
    renderEditor({ onDelete: vi.fn(), isDeleting: true })
    fireEvent.change(titleField(), { target: { value: 'A different title' } })
    await waitFor(() => expect(titleField().value).toBe('A different title'))
    expect(beforeUnload().defaultPrevented).toBe(false)
  })
})
