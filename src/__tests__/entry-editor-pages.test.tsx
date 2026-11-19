import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditEntryEditor } from '@/components/EditEntryEditor'
import { NewEntryEditor } from '@/components/NewEntryEditor'
import { api } from '@/src/lib/api'
import type { Entry } from '@/src/server/entry/schemas'

const push = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'
const ENTRY: Entry = {
  id: ID,
  title: 'A slower morning',
  body: 'Coffee, no phone.',
  mood: null,
  summary: null,
  frameworkId: null,
  // Far enough back that the header never says "Today"
  writtenAt: '2020-01-15T00:14:00.000Z',
  entryDate: '2020-01-15',
  createdAt: '2020-01-15T00:14:00.000Z',
  updatedAt: '2020-01-15T00:14:00.000Z',
  tags: [{ id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', name: 'Gratitude' }],
}

type Handler = (init?: RequestInit) => Response | Promise<Response>

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

const apiError = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } })

const TAGS = 'GET /api/v1/tags'
const tagList = (...names: string[]) => ({
  tags: names.map((name, i) => ({ id: `tag-${i}`, name, entryCount: 1 })),
})

/** Answers `METHOD /path` requests from `routes` (an empty tag list unless given); anything else fails the test. */
function mockApi(routes: Record<string, Handler>) {
  const all: Record<string, Handler> = { [TAGS]: () => json(200, tagList()), ...routes }
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`
    const handler = all[key]
    if (!handler) throw new Error(`Unexpected request: ${key}`)
    return handler(init)
  })
}

const requests = (key: string) =>
  fetchMock.mock.calls.filter(
    ([input, init]) => `${init?.method ?? 'GET'} ${String(input)}` === key,
  )

const bodyOf = (init?: RequestInit) => JSON.parse(String(init?.body))

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } })
}

function renderWithClient(ui: ReactNode, queryClient = makeClient()) {
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
  return queryClient
}

const bodyField = () => screen.getByRole('textbox', { name: 'Entry' }) as HTMLTextAreaElement
const titleField = () => screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement
const saveButton = () =>
  screen.getByRole('button', { name: /Save|Done|Saving/ }) as HTMLButtonElement

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

beforeEach(() => {
  push.mockReset()
  mockApi({})
})

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
})

describe('NewEntryEditor', () => {
  const created: Entry = { ...ENTRY, title: null, body: 'Quiet start', tags: ENTRY.tags }

  function renderNew(queryClient?: QueryClient) {
    return renderWithClient(<NewEntryEditor dateLabel="Today, Aug 25 · 8:14 AM" />, queryClient)
  }

  it('shows the date label it was given', () => {
    renderNew()
    expect(screen.getAllByText('Today, Aug 25 · 8:14 AM').length).toBeGreaterThan(0)
  })

  it('creates the entry, then opens it at /journal/[id]', async () => {
    mockApi({ 'POST /api/v1/entries': () => json(201, created) })
    renderNew()

    fireEvent.change(bodyField(), { target: { value: '  Quiet start  ' } })
    addTag('Gratitude')
    fireEvent.click(saveButton())

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/journal/${ID}`))
    const [[, init]] = requests('POST /api/v1/entries')
    // Trimmed by EntryCreateSchema; the blank title is left out so the server can name it
    expect(bodyOf(init)).toEqual({ body: 'Quiet start', tags: ['Gratitude'] })
    expect(requests('POST /api/v1/entries')).toHaveLength(1)
  })

  it('seeds the entry query so the new page opens without a loading state', async () => {
    mockApi({ 'POST /api/v1/entries': () => json(201, created) })
    const queryClient = renderNew()

    fireEvent.change(bodyField(), { target: { value: 'Quiet start' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(queryClient.getQueryData(api.entry.findOneEntry.queryKey({ id: ID }))).toEqual(created)
  })

  it('invalidates the entry queries so /journal refreshes without a reload', async () => {
    mockApi({ 'POST /api/v1/entries': () => json(201, created) })
    const queryClient = makeClient()
    const feedKey = api.entry.findManyEntries.queryKey({})
    queryClient.setQueryData(feedKey, { entries: [], total: 0 })
    renderNew(queryClient)

    fireEvent.change(bodyField(), { target: { value: 'Quiet start' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(queryClient.getQueryState(feedKey)?.isInvalidated).toBe(true)
  })

  it('does not call the API for an empty entry and shows the schema message', async () => {
    renderNew()

    fireEvent.click(saveButton())

    expect(await screen.findByText('Write something before saving.')).toBeTruthy()
    expect(requests('POST /api/v1/entries')).toHaveLength(0)
    expect(push).not.toHaveBeenCalled()
  })

  it('shows the API error and lets the user try again', async () => {
    mockApi({
      'POST /api/v1/entries': () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
    })
    renderNew()
    fireEvent.change(bodyField(), { target: { value: 'Quiet start' } })

    fireEvent.click(saveButton())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Something went wrong.')
    expect(push).not.toHaveBeenCalled()
    // The edits and the Save button are still there
    expect(bodyField().value).toBe('Quiet start')
    expect(saveButton().disabled).toBe(false)
  })

  it('disables Save while the request is in flight, so it cannot be submitted twice', async () => {
    let respond: (response: Response) => void = () => {}
    mockApi({
      'POST /api/v1/entries': () => new Promise<Response>((resolve) => (respond = resolve)),
    })
    renderNew()
    fireEvent.change(bodyField(), { target: { value: 'Quiet start' } })

    fireEvent.click(saveButton())

    await waitFor(() => expect(saveButton().disabled).toBe(true))
    expect(saveButton().textContent).toBe('Saving…')
    fireEvent.click(saveButton())
    expect(requests('POST /api/v1/entries')).toHaveLength(1)

    respond(json(201, created))
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/journal/${ID}`))
  })

  it('offers the user’s existing tags as suggestions while typing a tag', async () => {
    mockApi({ [TAGS]: () => json(200, tagList('Gratitude', 'Work', 'Family')) })
    renderNew()
    await waitFor(() => expect(requests(TAGS)).toHaveLength(1))
    // Wait for the list to arrive and reach the form
    fireEvent.click(await screen.findByRole('button', { name: 'Add tag' }))
    const input = await screen.findByRole('combobox', { name: 'New tag' })

    const list = document.getElementById(input.getAttribute('list') ?? '')
    await waitFor(() =>
      expect(Array.from(list?.querySelectorAll('option') ?? []).map((o) => o.value)).toEqual([
        'Gratitude',
        'Work',
        'Family',
      ]),
    )
  })

  it('still lets the user type free-text tags when the tag list fails to load', async () => {
    mockApi({ [TAGS]: () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.') })
    renderNew()
    await waitFor(() => expect(requests(TAGS)).toHaveLength(1))

    addTag('Brand new')

    expect(
      within(screen.getByRole('list', { name: 'Tags' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toContain('Brand new')
    // A failed suggestion list is not an editor error
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('refetches the tag list after saving, since saving can create tags', async () => {
    mockApi({ 'POST /api/v1/entries': () => json(201, created) })
    renderNew()
    await waitFor(() => expect(requests(TAGS)).toHaveLength(1))

    fireEvent.change(bodyField(), { target: { value: 'Quiet start' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(push).toHaveBeenCalled())
    // The list is on screen, so invalidating it refetches it straight away
    expect(requests(TAGS)).toHaveLength(2)
  })

  it('warns before leaving with unsaved changes, but not once the entry is created', async () => {
    mockApi({ 'POST /api/v1/entries': () => json(201, created) })
    renderNew()
    expect(beforeUnload().defaultPrevented).toBe(false)

    fireEvent.change(bodyField(), { target: { value: 'Quiet start' } })
    await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(true))

    fireEvent.click(saveButton())
    await waitFor(() => expect(push).toHaveBeenCalled())
    await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(false))
  })
})

describe('EditEntryEditor', () => {
  const GET = `GET /api/v1/entries/${ID}`
  const PATCH = `PATCH /api/v1/entries/${ID}`
  const DELETE = `DELETE /api/v1/entries/${ID}`

  const renderEdit = (id = ID, queryClient?: QueryClient) =>
    renderWithClient(<EditEntryEditor id={id} />, queryClient)

  /** The editor once the entry has loaded. */
  const loaded = () => screen.findByRole('textbox', { name: 'Entry' })

  describe('loading', () => {
    it('shows a loading state, then the entry', async () => {
      let respond: (response: Response) => void = () => {}
      mockApi({ [GET]: () => new Promise<Response>((resolve) => (respond = resolve)) })
      renderEdit()

      expect(screen.getByRole('status').textContent).toBe('Loading entry…')
      expect(screen.queryByRole('textbox', { name: 'Entry' })).toBeNull()

      respond(json(200, ENTRY))
      await loaded()
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('fills the form from the entry', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()

      await loaded()
      expect(titleField().value).toBe('A slower morning')
      expect(bodyField().value).toBe('Coffee, no phone.')
      expect(
        within(screen.getByRole('list', { name: 'Tags' }))
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Gratitude', 'Add tag'])
    })

    it('leaves the title empty for an entry without one', async () => {
      mockApi({ [GET]: () => json(200, { ...ENTRY, title: null }) })
      renderEdit()

      await loaded()
      expect(titleField().value).toBe('')
    })

    it('shows the header date from writtenAt in Manila time', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()

      await loaded()
      // 00:14 UTC on Jan 15 is 8:14 AM in Manila
      expect(screen.getAllByText('Wed, Jan 15, 2020 · 8:14 AM').length).toBeGreaterThan(0)
    })

    it('says "Today" for an entry written today', async () => {
      mockApi({ [GET]: () => json(200, { ...ENTRY, writtenAt: new Date().toISOString() }) })
      renderEdit()

      await loaded()
      expect(screen.getAllByText(/^Today, /).length).toBeGreaterThan(0)
    })

    it('suggests the user’s other tags, leaving out the ones already on the entry', async () => {
      mockApi({
        [GET]: () => json(200, ENTRY),
        [TAGS]: () => json(200, tagList('Gratitude', 'Work', 'Family')),
      })
      renderEdit()
      await loaded()
      await waitFor(() => expect(requests(TAGS)).toHaveLength(1))

      // The entry already has "Gratitude"; wait for the list, then open the input
      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
        const input = await screen.findByRole('combobox', { name: 'New tag' })
        const list = document.getElementById(input.getAttribute('list') ?? '')
        expect(Array.from(list?.querySelectorAll('option') ?? []).map((o) => o.value)).toEqual([
          'Work',
          'Family',
        ])
      })
    })

    it('does not show the AI panel placeholder content for a real entry', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()

      await loaded()
      expect(screen.getByText(/detects the mood, suggests tags/)).toBeTruthy()
      expect(screen.queryByRole('region', { name: 'Moodiary companion' })).toBeNull()
    })
  })

  describe('not found', () => {
    it('shows the not-found state when the API answers 404', async () => {
      mockApi({ [GET]: () => apiError(404, 'NOT_FOUND', 'Entry not found.') })
      renderEdit()

      expect(await screen.findByRole('heading', { name: 'Entry not found' })).toBeTruthy()
      expect(screen.queryByRole('textbox', { name: 'Entry' })).toBeNull()
      expect(screen.getByRole('link', { name: 'Back to journal' }).getAttribute('href')).toBe(
        '/journal',
      )
    })

    it('shows the same state for an id that is not a UUID, without calling the API', () => {
      renderEdit('entry-1')

      expect(screen.getByRole('heading', { name: 'Entry not found' })).toBeTruthy()
      expect(requests(GET)).toHaveLength(0)
    })

    it('shows the not-found state when the entry is deleted elsewhere and refetched', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      const queryClient = renderEdit()
      await loaded()

      mockApi({ [GET]: () => apiError(404, 'NOT_FOUND', 'Entry not found.') })
      await queryClient.invalidateQueries({ queryKey: ['entry'] })

      expect(await screen.findByRole('heading', { name: 'Entry not found' })).toBeTruthy()
    })
  })

  describe('load errors', () => {
    it('shows the error with a retry for a server failure, not the not-found state', async () => {
      mockApi({ [GET]: () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.') })
      renderEdit()

      const alert = await screen.findByRole('alert')
      expect(within(alert).getByRole('heading').textContent).toBe('Couldn’t load this entry')
      expect(alert.textContent).toContain('Something went wrong.')
      expect(screen.queryByRole('heading', { name: 'Entry not found' })).toBeNull()

      mockApi({ [GET]: () => json(200, ENTRY) })
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
      await loaded()
      expect(bodyField().value).toBe('Coffee, no phone.')
    })
  })

  describe('saving', () => {
    it('sends only the fields that changed', async () => {
      const updated = { ...ENTRY, body: 'Coffee, no phone, and quiet.' }
      mockApi({ [GET]: () => json(200, ENTRY), [PATCH]: () => json(200, updated) })
      renderEdit()
      await loaded()

      fireEvent.change(bodyField(), { target: { value: 'Coffee, no phone, and quiet.' } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
      expect(bodyOf(requests(PATCH)[0][1])).toEqual({ body: 'Coffee, no phone, and quiet.' })
    })

    it('sends the full tag list when only the tags changed', async () => {
      const updated = {
        ...ENTRY,
        tags: [...ENTRY.tags, { id: '16fd2706-8baf-433b-82eb-8c7fada847da', name: 'Morning' }],
      }
      mockApi({ [GET]: () => json(200, ENTRY), [PATCH]: () => json(200, updated) })
      renderEdit()
      await loaded()

      addTag('Morning')
      fireEvent.click(saveButton())

      await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
      expect(bodyOf(requests(PATCH)[0][1])).toEqual({ tags: ['Gratitude', 'Morning'] })
    })

    it('sends title: null when the title is cleared', async () => {
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () => json(200, { ...ENTRY, title: null }),
      })
      renderEdit()
      await loaded()

      fireEvent.change(titleField(), { target: { value: '   ' } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
      expect(bodyOf(requests(PATCH)[0][1])).toEqual({ title: null })
    })

    it('does not call the API when nothing changed', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()
      await loaded()

      fireEvent.click(saveButton())

      await waitFor(() => expect(saveButton().disabled).toBe(false))
      expect(requests(PATCH)).toHaveLength(0)
    })

    it('does not call the API when an edit leaves only whitespace or tag case different', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()
      await loaded()

      fireEvent.change(bodyField(), { target: { value: '  Coffee, no phone.  ' } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(saveButton().disabled).toBe(false))
      expect(requests(PATCH)).toHaveLength(0)
    })

    it('shows the schema message and does not call the API when the entry is emptied', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()
      await loaded()

      fireEvent.change(bodyField(), { target: { value: '' } })
      fireEvent.click(saveButton())

      expect(await screen.findByText('Write something before saving.')).toBeTruthy()
      expect(requests(PATCH)).toHaveLength(0)
    })

    it('treats the saved entry as the new baseline: saved edits are no longer unsaved', async () => {
      const updated = { ...ENTRY, body: 'Edited' }
      mockApi({ [GET]: () => json(200, ENTRY), [PATCH]: () => json(200, updated) })
      renderEdit()
      await loaded()

      fireEvent.change(bodyField(), { target: { value: 'Edited' } })
      await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(true))
      mockApi({ [GET]: () => json(200, updated), [PATCH]: () => json(200, updated) })
      fireEvent.click(saveButton())

      await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
      await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(false))
      expect(bodyField().value).toBe('Edited')
    })

    it('invalidates the entry queries so /journal refreshes without a reload', async () => {
      const updated = { ...ENTRY, body: 'Edited' }
      mockApi({ [GET]: () => json(200, ENTRY), [PATCH]: () => json(200, updated) })
      const queryClient = makeClient()
      const feedKey = api.entry.findManyEntries.queryKey({})
      queryClient.setQueryData(feedKey, { entries: [ENTRY], total: 1 })
      renderEdit(ID, queryClient)
      await loaded()
      mockApi({ [GET]: () => json(200, updated), [PATCH]: () => json(200, updated) })

      fireEvent.change(bodyField(), { target: { value: 'Edited' } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
      await waitFor(() => expect(queryClient.getQueryState(feedKey)?.isInvalidated).toBe(true))
    })

    it('shows the API error and keeps the edits', async () => {
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
      })
      renderEdit()
      await loaded()
      fireEvent.change(bodyField(), { target: { value: 'Edited' } })

      fireEvent.click(saveButton())

      expect((await screen.findByRole('alert')).textContent).toBe('Something went wrong.')
      expect(bodyField().value).toBe('Edited')
      expect(saveButton().disabled).toBe(false)
      expect(beforeUnload().defaultPrevented).toBe(true)
    })

    it('disables Save while the request is in flight', async () => {
      let respond: (response: Response) => void = () => {}
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () => new Promise<Response>((resolve) => (respond = resolve)),
      })
      renderEdit()
      await loaded()
      fireEvent.change(bodyField(), { target: { value: 'Edited' } })

      fireEvent.click(saveButton())

      await waitFor(() => expect(saveButton().disabled).toBe(true))
      expect(bodyField().readOnly).toBe(true)
      fireEvent.click(saveButton())
      expect(requests(PATCH)).toHaveLength(1)

      respond(json(200, { ...ENTRY, body: 'Edited' }))
      await waitFor(() => expect(saveButton().disabled).toBe(false))
    })
  })

  describe('deleting', () => {
    const openConfirmation = async () => {
      await loaded()
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    }

    it('asks for confirmation and does not delete until the user confirms', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()

      await openConfirmation()

      expect(screen.getByRole('region', { name: 'Confirm delete' })).toBeTruthy()
      expect(requests(DELETE)).toHaveLength(0)
    })

    it('keeps the entry when the user backs out', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()
      await openConfirmation()

      fireEvent.click(screen.getByRole('button', { name: 'Keep entry' }))

      expect(screen.queryByRole('region', { name: 'Confirm delete' })).toBeNull()
      expect(requests(DELETE)).toHaveLength(0)
      expect(push).not.toHaveBeenCalled()
    })

    it('deletes the entry, then goes to /journal without flashing the not-found state', async () => {
      mockApi({ [GET]: () => json(200, ENTRY), [DELETE]: () => json(204) })
      renderEdit()
      await openConfirmation()
      // Once deleted, the entry's own query refetches and gets a 404
      mockApi({
        [GET]: () => apiError(404, 'NOT_FOUND', 'Entry not found.'),
        [DELETE]: () => json(204),
      })

      fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

      await waitFor(() => expect(push).toHaveBeenCalledWith('/journal'))
      expect(requests(DELETE)).toHaveLength(1)
      expect(screen.queryByRole('heading', { name: 'Entry not found' })).toBeNull()
      expect(push).toHaveBeenCalledTimes(1)
    })

    it('invalidates the entry queries so /journal refreshes without a reload', async () => {
      mockApi({ [GET]: () => json(200, ENTRY), [DELETE]: () => json(204) })
      const queryClient = makeClient()
      const feedKey = api.entry.findManyEntries.queryKey({})
      queryClient.setQueryData(feedKey, { entries: [ENTRY], total: 1 })
      renderEdit(ID, queryClient)
      await openConfirmation()
      mockApi({
        [GET]: () => apiError(404, 'NOT_FOUND', 'Entry not found.'),
        [DELETE]: () => json(204),
      })

      fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

      await waitFor(() => expect(push).toHaveBeenCalledWith('/journal'))
      expect(queryClient.getQueryState(feedKey)?.isInvalidated).toBe(true)
    })

    it('shows the API error and stays on the entry when deleting fails', async () => {
      mockApi({
        [GET]: () => json(200, ENTRY),
        [DELETE]: () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
      })
      renderEdit()
      await openConfirmation()

      fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

      expect((await screen.findByRole('alert')).textContent).toBe('Something went wrong.')
      expect(push).not.toHaveBeenCalled()
      expect(bodyField().value).toBe('Coffee, no phone.')
      // The confirmation stays open so the user can retry
      expect(screen.getByRole('region', { name: 'Confirm delete' })).toBeTruthy()
    })

    it('disables the controls while the delete is in flight', async () => {
      let respond: (response: Response) => void = () => {}
      mockApi({
        [GET]: () => json(200, ENTRY),
        [DELETE]: () => new Promise<Response>((resolve) => (respond = resolve)),
      })
      renderEdit()
      await openConfirmation()

      fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

      await waitFor(() =>
        expect(
          (screen.getByRole('button', { name: 'Deleting…' }) as HTMLButtonElement).disabled,
        ).toBe(true),
      )
      expect(saveButton().disabled).toBe(true)

      mockApi({ [GET]: () => apiError(404, 'NOT_FOUND', 'Entry not found.') })
      respond(json(204))
      await waitFor(() => expect(push).toHaveBeenCalledWith('/journal'))
    })
  })

  it('warns before leaving with unsaved changes', async () => {
    mockApi({ [GET]: () => json(200, ENTRY) })
    renderEdit()
    await loaded()
    expect(beforeUnload().defaultPrevented).toBe(false)

    fireEvent.change(titleField(), { target: { value: 'A different title' } })

    await waitFor(() => expect(beforeUnload().defaultPrevented).toBe(true))
  })
})
