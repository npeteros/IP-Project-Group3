import { describe, expect, it } from 'vitest'
import {
  changedEntryFields,
  sameTagNames,
  toEntryFormValues,
  EMPTY_ENTRY_FORM,
} from '@/src/lib/entry-form'
import type { Entry } from '@/src/server/entry/schemas'

const entry: Entry = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  title: 'A slower morning',
  body: 'Coffee, no phone.',
  writtenAt: '2026-08-25T00:14:00.000Z',
  entryDate: '2026-08-25',
  createdAt: '2026-08-25T00:14:00.000Z',
  updatedAt: '2026-08-25T00:14:00.000Z',
  tags: [
    { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', name: 'Gratitude' },
    { id: '16fd2706-8baf-433b-82eb-8c7fada847da', name: 'Morning' },
  ],
}

describe('toEntryFormValues', () => {
  it('maps an entry to the form fields', () => {
    expect(toEntryFormValues(entry)).toEqual({
      title: 'A slower morning',
      body: 'Coffee, no phone.',
      tags: ['Gratitude', 'Morning'],
    })
  })

  it('turns a missing title into an empty field', () => {
    expect(toEntryFormValues({ ...entry, title: null }).title).toBe('')
  })

  it('starts a new entry empty', () => {
    expect(EMPTY_ENTRY_FORM).toEqual({ title: '', body: '', tags: [] })
  })
})

describe('sameTagNames', () => {
  it('ignores order and case', () => {
    expect(sameTagNames(['morning', 'GRATITUDE'], ['Gratitude', 'Morning'])).toBe(true)
  })

  it('is false when a name differs or one set is larger', () => {
    expect(sameTagNames(['Gratitude'], ['Gratitude', 'Morning'])).toBe(false)
    expect(sameTagNames(['Gratitude', 'Morning'], ['Gratitude'])).toBe(false)
    expect(sameTagNames(['Gratitude', 'Work'], ['Gratitude', 'Morning'])).toBe(false)
  })

  it('treats two empty sets as equal', () => {
    expect(sameTagNames([], [])).toBe(true)
  })
})

describe('changedEntryFields', () => {
  const unchanged = {
    title: 'A slower morning',
    body: 'Coffee, no phone.',
    tags: ['Gratitude', 'Morning'],
  }

  it('returns null when nothing changed', () => {
    expect(changedEntryFields(unchanged, entry)).toBeNull()
  })

  it('sends only the body when only the body changed', () => {
    expect(changedEntryFields({ ...unchanged, body: 'Coffee, no phone. Quiet.' }, entry)).toEqual({
      body: 'Coffee, no phone. Quiet.',
    })
  })

  it('sends only the title when only the title changed', () => {
    expect(changedEntryFields({ ...unchanged, title: 'Slow' }, entry)).toEqual({ title: 'Slow' })
  })

  it('sends title: null when the title was cleared', () => {
    expect(changedEntryFields({ ...unchanged, title: null }, entry)).toEqual({ title: null })
  })

  it('does not send a blank title for an entry that has none', () => {
    expect(changedEntryFields({ ...unchanged, title: null }, { ...entry, title: null })).toBeNull()
  })

  it('sends the full tag list when tags were added or removed', () => {
    expect(changedEntryFields({ ...unchanged, tags: ['Gratitude'] }, entry)).toEqual({
      tags: ['Gratitude'],
    })
    expect(changedEntryFields({ ...unchanged, tags: [...unchanged.tags, 'Work'] }, entry)).toEqual({
      tags: ['Gratitude', 'Morning', 'Work'],
    })
  })

  it('sends an empty list when every tag was removed', () => {
    expect(changedEntryFields({ ...unchanged, tags: [] }, entry)).toEqual({ tags: [] })
  })

  it('ignores tag re-ordering and re-casing', () => {
    expect(changedEntryFields({ ...unchanged, tags: ['morning', 'gratitude'] }, entry)).toBeNull()
  })

  it('sends every changed field together', () => {
    expect(changedEntryFields({ title: 'New', body: 'New body', tags: ['Work'] }, entry)).toEqual({
      title: 'New',
      body: 'New body',
      tags: ['Work'],
    })
  })

  it('leaves out fields the parsed values omit', () => {
    expect(changedEntryFields({ body: 'Only the body' }, entry)).toEqual({ body: 'Only the body' })
  })
})
