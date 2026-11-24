import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditEntryEditor } from '@/components/EditEntryEditor'
import { NewEntryEditor } from '@/components/NewEntryEditor'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { api } from '@/src/lib/api'
import { queueEntryAnalysis, takeQueuedEntryAnalysis } from '@/src/lib/entry-analysis'
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
  // The queue is module state, so a test that creates an entry must not leak into the next
  takeQueuedEntryAnalysis(ID)
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

    it('has no companion conversation until the user starts one', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()

      await loaded()
      expect(screen.queryByRole('log', { name: 'Conversation' })).toBeNull()
      expect(requests('POST /api/v1/chat')).toHaveLength(0)
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

describe('AI panel in the editor', () => {
  const GET = `GET /api/v1/entries/${ID}`
  const PATCH = `PATCH /api/v1/entries/${ID}`
  const ANALYZE = `POST /api/v1/entries/${ID}/analysis`
  const ANALYSIS = {
    mood: 'CALM',
    summary: 'A quiet morning with no rush.',
    suggestedTags: ['Gratitude', 'Morning', 'Rest'],
  }

  const renderEdit = (queryClient?: QueryClient) =>
    renderWithClient(<EditEntryEditor id={ID} />, queryClient)
  const loaded = () => screen.findByRole('textbox', { name: 'Entry' })
  const panel = () => within(screen.getByRole('complementary', { name: 'For this entry' }))
  const chipNames = () =>
    within(screen.getByRole('list', { name: 'Suggested tags' }))
      .getAllByRole('listitem')
      .map((chip) => chip.textContent)
  const analyzeCalls = () => requests(ANALYZE).length

  /** Loads the entry, edits the body and saves, which starts an analysis. */
  async function saveEditedBody(routes: Record<string, Handler> = {}) {
    mockApi({
      [GET]: () => json(200, ENTRY),
      [PATCH]: () => json(200, { ...ENTRY, body: 'Edited' }),
      ...routes,
    })
    renderEdit()
    await loaded()
    fireEvent.change(bodyField(), { target: { value: 'Edited' } })
    fireEvent.click(saveButton())
    await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
  }

  describe('mood and summary', () => {
    it('shows the mood and summary stored on the entry', async () => {
      mockApi({
        [GET]: () =>
          json(200, { ...ENTRY, mood: 'GRATEFUL', summary: 'Thankful for a slow start.' }),
      })
      renderEdit()
      await loaded()

      expect(panel().getByText('Grateful mood detected')).toBeTruthy()
      expect(panel().getByText('Thankful for a slow start.')).toBeTruthy()
      expect(analyzeCalls()).toBe(0)
    })

    it('shows an empty state for an entry that was never analyzed, and does not analyze it by itself', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()
      await loaded()

      expect(panel().getByText('This entry hasn’t been analyzed yet.')).toBeTruthy()
      expect(analyzeCalls()).toBe(0)
    })

    it('analyzes on request, showing a loading state until it finishes', async () => {
      let respond: (response: Response) => void = () => {}
      mockApi({
        [GET]: () => json(200, ENTRY),
        [ANALYZE]: () => new Promise<Response>((resolve) => (respond = resolve)),
      })
      renderEdit()
      await loaded()

      fireEvent.click(panel().getByRole('button', { name: 'Analyze entry' }))

      expect((await panel().findByRole('status')).textContent).toBe('Analyzing your entry…')
      respond(json(200, ANALYSIS))
      expect(await panel().findByText('Calm mood detected')).toBeTruthy()
      expect(panel().getByText('A quiet morning with no rush.')).toBeTruthy()
      expect(panel().queryByText('Analyzing your entry…')).toBeNull()
    })

    it('refreshes the entry and the stats once the analysis is stored', async () => {
      mockApi({ [GET]: () => json(200, ENTRY), [ANALYZE]: () => json(200, ANALYSIS) })
      const queryClient = makeClient()
      const feedKey = api.entry.findManyEntries.queryKey({})
      const statsKey = ['stats', 'summary']
      queryClient.setQueryData(feedKey, { entries: [ENTRY], total: 1 })
      queryClient.setQueryData(statsKey, {})
      renderEdit(queryClient)
      await loaded()

      fireEvent.click(panel().getByRole('button', { name: 'Analyze entry' }))

      await panel().findByText('Calm mood detected')
      await waitFor(() => expect(queryClient.getQueryState(feedKey)?.isInvalidated).toBe(true))
      expect(queryClient.getQueryState(statsKey)?.isInvalidated).toBe(true)
    })
  })

  describe('when the analysis runs', () => {
    it('runs after a save that changed the body', async () => {
      await saveEditedBody({ [ANALYZE]: () => json(200, ANALYSIS) })

      await waitFor(() => expect(analyzeCalls()).toBe(1))
      expect(await panel().findByText('Calm mood detected')).toBeTruthy()
    })

    it('runs after a save that changed only the title', async () => {
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () => json(200, { ...ENTRY, title: 'New title' }),
        [ANALYZE]: () => json(200, ANALYSIS),
      })
      renderEdit()
      await loaded()

      fireEvent.change(titleField(), { target: { value: 'New title' } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(analyzeCalls()).toBe(1))
    })

    it('does not run after a save that only changed the tags', async () => {
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () =>
          json(200, {
            ...ENTRY,
            tags: [...ENTRY.tags, { id: '16fd2706-8baf-433b-82eb-8c7fada847da', name: 'Work' }],
          }),
        [ANALYZE]: () => json(200, ANALYSIS),
      })
      renderEdit()
      await loaded()

      addTag('Work')
      fireEvent.click(saveButton())

      await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
      await waitFor(() => expect(saveButton().disabled).toBe(false))
      expect(analyzeCalls()).toBe(0)
    })

    it('does not run when there was nothing to save', async () => {
      mockApi({ [GET]: () => json(200, ENTRY) })
      renderEdit()
      await loaded()

      fireEvent.click(saveButton())

      await waitFor(() => expect(saveButton().disabled).toBe(false))
      expect(analyzeCalls()).toBe(0)
    })

    it('does not run when the save fails', async () => {
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
        [ANALYZE]: () => json(200, ANALYSIS),
      })
      renderEdit()
      await loaded()

      fireEvent.change(bodyField(), { target: { value: 'Edited' } })
      fireEvent.click(saveButton())

      await screen.findByRole('alert')
      expect(analyzeCalls()).toBe(0)
    })

    it('shows the loading state while it runs, without blocking the editor', async () => {
      let respond: (response: Response) => void = () => {}
      await saveEditedBody({
        [ANALYZE]: () => new Promise<Response>((resolve) => (respond = resolve)),
      })

      expect((await panel().findByRole('status')).textContent).toBe('Analyzing your entry…')
      // The user can keep writing and save again while the analysis is still running
      expect(saveButton().disabled).toBe(false)
      expect(bodyField().readOnly).toBe(false)

      respond(json(200, ANALYSIS))
      await panel().findByText('Calm mood detected')
    })

    it('starts the first analysis of an entry that was just created', async () => {
      mockApi({ [GET]: () => json(200, ENTRY), [ANALYZE]: () => json(200, ANALYSIS) })
      queueEntryAnalysis(ID)

      renderEdit()
      await loaded()

      expect(await panel().findByText('Calm mood detected')).toBeTruthy()
      expect(analyzeCalls()).toBe(1)
    })

    it('does not start an analysis for an entry that was not just created', async () => {
      mockApi({ [GET]: () => json(200, ENTRY), [ANALYZE]: () => json(200, ANALYSIS) })
      queueEntryAnalysis('11111111-1111-4111-8111-111111111111')

      renderEdit()
      await loaded()

      expect(analyzeCalls()).toBe(0)
      takeQueuedEntryAnalysis('11111111-1111-4111-8111-111111111111')
    })
  })

  describe('rate limits and failures never block writing or saving', () => {
    it('shows a quiet message on a 429, and the user can still edit and save', async () => {
      await saveEditedBody({
        [ANALYZE]: () => apiError(429, 'TOO_MANY_REQUESTS', 'AI rate limit exceeded.'),
      })

      expect((await panel().findByRole('status')).textContent).toBe(
        'You’ve reached the AI limit for now. Try again in a little while.',
      )
      expect(screen.queryByRole('alert')).toBeNull()

      mockApi({
        [GET]: () => json(200, { ...ENTRY, body: 'Edited' }),
        [PATCH]: () => json(200, { ...ENTRY, body: 'Edited again' }),
        [ANALYZE]: () => apiError(429, 'TOO_MANY_REQUESTS', 'AI rate limit exceeded.'),
      })
      fireEvent.change(bodyField(), { target: { value: 'Edited again' } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(requests(PATCH)).toHaveLength(2))
      expect(bodyField().value).toBe('Edited again')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('shows a quiet message when the analysis fails, and the entry stays saved', async () => {
      await saveEditedBody({
        [ANALYZE]: () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
      })

      expect((await panel().findByRole('status')).textContent).toBe(
        'Analysis isn’t available right now. You can keep writing.',
      )
      expect(screen.queryByRole('alert')).toBeNull()
      expect(bodyField().value).toBe('Edited')
      expect(beforeUnload().defaultPrevented).toBe(false)
    })

    it('treats a missing analysis route (404) like any other failure', async () => {
      await saveEditedBody({ [ANALYZE]: () => apiError(404, 'NOT_FOUND', 'Not found.') })

      expect((await panel().findByRole('status')).textContent).toBe(
        'Analysis isn’t available right now. You can keep writing.',
      )
      // It's not the entry that's missing, so the editor stays
      expect(screen.queryByRole('heading', { name: 'Entry not found' })).toBeNull()
      expect(bodyField()).toBeTruthy()
    })

    it('tries again on request', async () => {
      await saveEditedBody({ [ANALYZE]: () => apiError(429, 'TOO_MANY_REQUESTS', 'Slow down.') })
      await panel().findByRole('status')
      mockApi({ [GET]: () => json(200, ENTRY), [ANALYZE]: () => json(200, ANALYSIS) })

      fireEvent.click(panel().getByRole('button', { name: 'Try again' }))

      expect(await panel().findByText('Calm mood detected')).toBeTruthy()
      expect(panel().queryByText(/AI limit/)).toBeNull()
    })
  })

  describe('suggested tags', () => {
    /** Saves an edit and waits for the analysis, whose suggestions include "Gratitude", already a tag. */
    async function withSuggestions(routes: Record<string, Handler> = {}) {
      await saveEditedBody({ [ANALYZE]: () => json(200, ANALYSIS), ...routes })
      await panel().findByRole('list', { name: 'Suggested tags' })
    }

    // The body save is itself a PATCH, so an accepted tag is the second one
    const patchCount = () => requests(PATCH).length
    const lastPatch = () => bodyOf(requests(PATCH).at(-1)?.[1])

    it('shows the suggestions that are not already tags', async () => {
      await withSuggestions()
      expect(chipNames()).toEqual(['Morning', 'Rest'])
    })

    it('accepts a suggestion by saving it as an AI_SUGGESTED tag right away', async () => {
      const accepted = {
        ...ENTRY,
        body: 'Edited',
        tags: [...ENTRY.tags, { id: '16fd2706-8baf-433b-82eb-8c7fada847da', name: 'Morning' }],
      }
      await withSuggestions()
      mockApi({
        [GET]: () => json(200, accepted),
        [PATCH]: () => json(200, accepted),
        [ANALYZE]: () => json(200, ANALYSIS),
      })

      fireEvent.click(panel().getByRole('button', { name: 'Add suggested tag Morning' }))

      await waitFor(() => expect(patchCount()).toBe(2))
      expect(lastPatch()).toEqual({
        tags: ['Gratitude', 'Morning'],
        aiSuggestedTags: ['Morning'],
      })
      // It joins the entry's tags, leaves the suggestions, and doesn't count as an edit
      await waitFor(() => expect(chipNames()).toEqual(['Rest']))
      expect(
        within(screen.getByRole('list', { name: 'Tags' }))
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Gratitude', 'Morning', 'Add tag'])
      expect(beforeUnload().defaultPrevented).toBe(false)
    })

    it('does not analyze again when a suggestion is accepted', async () => {
      const accepted = {
        ...ENTRY,
        body: 'Edited',
        tags: [...ENTRY.tags, { id: '16fd2706-8baf-433b-82eb-8c7fada847da', name: 'Morning' }],
      }
      await withSuggestions()
      await waitFor(() => expect(analyzeCalls()).toBe(1))
      mockApi({
        [GET]: () => json(200, accepted),
        [PATCH]: () => json(200, accepted),
        [ANALYZE]: () => json(200, ANALYSIS),
      })

      fireEvent.click(panel().getByRole('button', { name: 'Add suggested tag Morning' }))

      await waitFor(() => expect(patchCount()).toBe(2))
      await waitFor(() => expect(chipNames()).toEqual(['Rest']))
      // Accepting a tag doesn't change what the entry says, so there's nothing new to analyze
      expect(analyzeCalls()).toBe(1)
    })

    it('saves only the tags: other unsaved edits stay unsaved', async () => {
      const accepted = {
        ...ENTRY,
        body: 'Edited',
        tags: [...ENTRY.tags, { id: '16fd2706-8baf-433b-82eb-8c7fada847da', name: 'Rest' }],
      }
      await withSuggestions()
      fireEvent.change(titleField(), { target: { value: 'Unsaved title' } })
      mockApi({ [GET]: () => json(200, accepted), [PATCH]: () => json(200, accepted) })

      fireEvent.click(panel().getByRole('button', { name: 'Add suggested tag Rest' }))

      await waitFor(() => expect(patchCount()).toBe(2))
      expect(lastPatch()).toEqual({
        tags: ['Gratitude', 'Rest'],
        aiSuggestedTags: ['Rest'],
      })
      await waitFor(() => expect(chipNames()).toEqual(['Morning']))
      expect(titleField().value).toBe('Unsaved title')
      expect(beforeUnload().defaultPrevented).toBe(true)
    })

    it('sends the tags as the form shows them, including ones typed but not yet saved', async () => {
      await withSuggestions()
      addTag('Work')
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () => json(200, { ...ENTRY, tags: ENTRY.tags }),
      })

      fireEvent.click(panel().getByRole('button', { name: 'Add suggested tag Morning' }))

      await waitFor(() => expect(patchCount()).toBe(2))
      expect(lastPatch()).toEqual({
        tags: ['Gratitude', 'Work', 'Morning'],
        aiSuggestedTags: ['Morning'],
      })
    })

    it('shows a failed accept in the editor alert and keeps the suggestion', async () => {
      await withSuggestions()
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () => apiError(400, 'VALIDATION_ERROR', 'An entry can have at most 20 tags.'),
      })

      fireEvent.click(panel().getByRole('button', { name: 'Add suggested tag Morning' }))

      expect((await screen.findByRole('alert')).textContent).toBe(
        'An entry can have at most 20 tags.',
      )
      expect(chipNames()).toEqual(['Morning', 'Rest'])
    })

    it('shows which suggestion is being saved and locks the rest until it is done', async () => {
      await withSuggestions()
      let respond: (response: Response) => void = () => {}
      mockApi({
        [GET]: () => json(200, ENTRY),
        [PATCH]: () => new Promise<Response>((resolve) => (respond = resolve)),
      })

      fireEvent.click(panel().getByRole('button', { name: 'Add suggested tag Morning' }))

      expect(await panel().findByText('Adding…')).toBeTruthy()
      expect(
        (panel().getByRole('button', { name: 'Add suggested tag Rest' }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
      expect(saveButton().disabled).toBe(true)
      respond(json(200, ENTRY))
      await waitFor(() => expect(saveButton().disabled).toBe(false))
    })

    it('hides a dismissed suggestion without saving anything', async () => {
      await withSuggestions()
      mockApi({ [GET]: () => json(200, ENTRY) })

      fireEvent.click(panel().getByRole('button', { name: 'Dismiss suggested tag Morning' }))

      expect(chipNames()).toEqual(['Rest'])
      // Only the earlier save of the body: dismissing sends nothing
      expect(patchCount()).toBe(1)
    })

    it('brings dismissed suggestions back when a new analysis runs', async () => {
      await withSuggestions()
      fireEvent.click(panel().getByRole('button', { name: 'Dismiss suggested tag Morning' }))
      expect(chipNames()).toEqual(['Rest'])
      mockApi({
        [GET]: () => json(200, { ...ENTRY, body: 'Edited' }),
        [PATCH]: () => json(200, { ...ENTRY, body: 'Edited more' }),
        [ANALYZE]: () => json(200, ANALYSIS),
      })

      fireEvent.change(bodyField(), { target: { value: 'Edited more' } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(chipNames()).toEqual(['Morning', 'Rest']))
    })

    it('stops offering a suggestion once the user adds the same tag by hand', async () => {
      await withSuggestions()

      addTag('morning')

      await waitFor(() => expect(chipNames()).toEqual(['Rest']))
    })
  })
})

describe('Companion in the editor', () => {
  const GET = `GET /api/v1/entries/${ID}`
  const CHAT = 'POST /api/v1/chat'

  const reply = (...deltas: string[]) =>
    createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: 'text-start', id: 't' })
          for (const delta of deltas) writer.write({ type: 'text-delta', id: 't', delta })
          writer.write({ type: 'text-end', id: 't' })
        },
      }),
    })
  const companion = () => within(screen.getByRole('region', { name: 'Moodiary companion' }))
  const ask = (text: string) => {
    fireEvent.change(companion().getByRole('textbox', { name: 'Ask the companion' }), {
      target: { value: text },
    })
    fireEvent.click(companion().getByRole('button', { name: 'Send' }))
  }

  it('answers about the entry being written, sending the title and body as they are now', async () => {
    mockApi({ [GET]: () => json(200, ENTRY), [CHAT]: () => reply('It reads ', 'calm.') })
    renderWithClient(<EditEntryEditor id={ID} />)
    await screen.findByRole('textbox', { name: 'Entry' })

    // Unsaved edits count: the Companion talks about what's on the page
    fireEvent.change(bodyField(), { target: { value: 'Coffee, no phone. Then a long walk.' } })
    await waitFor(() => expect(bodyField().value).toBe('Coffee, no phone. Then a long walk.'))
    ask('How does this read?')

    expect(await companion().findByText('It reads calm.')).toBeTruthy()
    expect(bodyOf(requests(CHAT)[0][1])).toEqual({
      messages: [{ role: 'user', content: 'How does this read?' }],
      entryDraft: { title: 'A slower morning', body: 'Coffee, no phone. Then a long walk.' },
    })
  })

  it('does not touch the entry: asking a question is not a save', async () => {
    mockApi({ [GET]: () => json(200, ENTRY), [CHAT]: () => reply('Ok.') })
    renderWithClient(<EditEntryEditor id={ID} />)
    await screen.findByRole('textbox', { name: 'Entry' })

    ask('Hello')

    await companion().findByText('Ok.')
    expect(requests(`PATCH /api/v1/entries/${ID}`)).toHaveLength(0)
    expect(bodyField().value).toBe('Coffee, no phone.')
  })

  it('shows a quiet message on a 429, and the user can still write and save', async () => {
    const PATCH = `PATCH /api/v1/entries/${ID}`
    mockApi({
      [GET]: () => json(200, ENTRY),
      [CHAT]: () => apiError(429, 'TOO_MANY_REQUESTS', 'AI rate limit exceeded.'),
      [PATCH]: () => json(200, { ...ENTRY, body: 'Edited' }),
    })
    renderWithClient(<EditEntryEditor id={ID} />)
    await screen.findByRole('textbox', { name: 'Entry' })

    ask('Hello')

    expect(
      await companion().findByText("You've reached the AI limit for now, try again later."),
    ).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(bodyField(), { target: { value: 'Edited' } })
    fireEvent.click(saveButton())
    await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
  })

  it('shows a quiet message on any other error, and retries on request', async () => {
    mockApi({
      [GET]: () => json(200, ENTRY),
      [CHAT]: () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
    })
    renderWithClient(<EditEntryEditor id={ID} />)
    await screen.findByRole('textbox', { name: 'Entry' })
    ask('Hello')
    await companion().findByText('Something went wrong.')
    mockApi({ [GET]: () => json(200, ENTRY), [CHAT]: () => reply('Here you go.') })

    fireEvent.click(companion().getByRole('button', { name: 'Try again' }))

    expect(await companion().findByText('Here you go.')).toBeTruthy()
  })

  it('is session-only: the conversation is gone after leaving the entry', async () => {
    mockApi({ [GET]: () => json(200, ENTRY), [CHAT]: () => reply('An answer.') })
    const first = renderWithClient(<EditEntryEditor id={ID} />)
    await screen.findByRole('textbox', { name: 'Entry' })
    ask('Question')
    await companion().findByText('An answer.')
    cleanup()

    renderWithClient(<EditEntryEditor id={ID} />, first)
    await screen.findByRole('textbox', { name: 'Entry' })

    expect(screen.queryByRole('log', { name: 'Conversation' })).toBeNull()
    expect(screen.queryByText('An answer.')).toBeNull()
  })

  it('also answers about a draft that has not been saved yet, on /journal/new', async () => {
    mockApi({ [CHAT]: () => reply('Start with how it felt.') })
    renderWithClient(<NewEntryEditor dateLabel="Today, Aug 25 · 8:14 AM" />)
    fireEvent.change(bodyField(), { target: { value: 'I am not sure how to start.' } })
    await waitFor(() => expect(bodyField().value).toBe('I am not sure how to start.'))

    ask('Where do I begin?')

    expect(await companion().findByText('Start with how it felt.')).toBeTruthy()
    expect(bodyOf(requests(CHAT)[0][1]).entryDraft).toEqual({ body: 'I am not sure how to start.' })
    expect(requests('POST /api/v1/entries')).toHaveLength(0)
  })
})

describe('New entries and analysis', () => {
  it('queues the first analysis for the entry page once the entry is created', async () => {
    const created: Entry = { ...ENTRY, title: null, body: 'Quiet start' }
    mockApi({ 'POST /api/v1/entries': () => json(201, created) })
    renderWithClient(<NewEntryEditor dateLabel="Today, Aug 25 · 8:14 AM" />)

    fireEvent.change(bodyField(), { target: { value: 'Quiet start' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/journal/${ID}`))
    expect(takeQueuedEntryAnalysis(ID)).toBe(true)
  })

  it('does not queue an analysis when the entry could not be created', async () => {
    mockApi({
      'POST /api/v1/entries': () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
    })
    renderWithClient(<NewEntryEditor dateLabel="Today, Aug 25 · 8:14 AM" />)

    fireEvent.change(bodyField(), { target: { value: 'Quiet start' } })
    fireEvent.click(saveButton())

    await screen.findByRole('alert')
    expect(takeQueuedEntryAnalysis(ID)).toBe(false)
  })

  it('explains the AI panel before there is anything to analyze', () => {
    renderWithClient(<NewEntryEditor dateLabel="Today, Aug 25 · 8:14 AM" />)

    expect(screen.getByText(/detects the mood, suggests tags/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Analyze entry' })).toBeNull()
  })
})

describe('Manage tags in the editor', () => {
  const GET = `GET /api/v1/entries/${ID}`
  const PATCH = `PATCH /api/v1/entries/${ID}`
  const GRATITUDE = ENTRY.tags[0].id
  const tagRoutes = {
    [TAGS]: () => json(200, { tags: [{ id: GRATITUDE, name: 'Gratitude', entryCount: 4 }] }),
  }
  const tagPills = () =>
    within(screen.getByRole('list', { name: 'Tags' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
      .filter((text) => text !== 'Add tag')

  async function openManager() {
    renderWithClient(<EditEntryEditor id={ID} />)
    await screen.findByRole('textbox', { name: 'Entry' })
    fireEvent.click(screen.getByRole('button', { name: 'Manage tags' }))
    await screen.findByRole('list', { name: 'All tags' })
  }

  it('lists the tags with their entry counts', async () => {
    mockApi({ [GET]: () => json(200, ENTRY), ...tagRoutes })
    await openManager()

    expect(
      within(screen.getByRole('list', { name: 'All tags' })).getAllByRole('listitem')[0]
        .textContent,
    ).toContain('4 entries')
  })

  it('shows a renamed tag on the entry without counting it as an edit', async () => {
    mockApi({
      [GET]: () => json(200, ENTRY),
      ...tagRoutes,
      [`PATCH /api/v1/tags/${GRATITUDE}`]: () => json(200, { id: GRATITUDE, name: 'Thankful' }),
    })
    await openManager()

    fireEvent.click(screen.getByRole('button', { name: 'Rename tag Gratitude' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'New name for Gratitude' }), {
      target: { value: 'Thankful' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(tagPills()).toEqual(['Thankful']))
    expect(beforeUnload().defaultPrevented).toBe(false)
  })

  it('saves the new name, not the old one, when the entry is saved afterwards', async () => {
    const renamed = { ...ENTRY, tags: [{ id: GRATITUDE, name: 'Thankful' }] }
    // The server's copy of the entry changes when the tag is renamed
    let stored = ENTRY
    mockApi({
      [GET]: () => json(200, stored),
      ...tagRoutes,
      [`PATCH /api/v1/tags/${GRATITUDE}`]: () => {
        stored = renamed
        return json(200, { id: GRATITUDE, name: 'Thankful' })
      },
      [PATCH]: () => json(200, { ...renamed, body: 'Edited' }),
    })
    await openManager()
    fireEvent.click(screen.getByRole('button', { name: 'Rename tag Gratitude' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'New name for Gratitude' }), {
      target: { value: 'Thankful' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(tagPills()).toEqual(['Thankful']))

    fireEvent.change(bodyField(), { target: { value: 'Edited' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(requests(PATCH)).toHaveLength(1))
    // Only the body changed: the renamed tag must not be re-sent as a brand-new "Gratitude"
    expect(bodyOf(requests(PATCH)[0][1])).toEqual({ body: 'Edited' })
  })

  it('removes a deleted tag from the entry without counting it as an edit', async () => {
    mockApi({
      [GET]: () => json(200, ENTRY),
      ...tagRoutes,
      [`DELETE /api/v1/tags/${GRATITUDE}`]: () => json(204),
    })
    await openManager()

    fireEvent.click(screen.getByRole('button', { name: 'Delete tag Gratitude' }))
    expect(screen.getByRole('group', { name: 'Confirm deleting Gratitude' }).textContent).toContain(
      'removed from every entry',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() => expect(tagPills()).toEqual([]))
    expect(beforeUnload().defaultPrevented).toBe(false)
  })

  it('shows a name conflict as a field error without changing the entry', async () => {
    mockApi({
      [GET]: () => json(200, ENTRY),
      ...tagRoutes,
      [`PATCH /api/v1/tags/${GRATITUDE}`]: () =>
        apiError(409, 'CONFLICT', 'A tag with this name already exists.'),
    })
    await openManager()

    fireEvent.click(screen.getByRole('button', { name: 'Rename tag Gratitude' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'New name for Gratitude' }), {
      target: { value: 'Work' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('A tag with this name already exists.')).toBeTruthy()
    expect(tagPills()).toEqual(['Gratitude'])
  })

  it('is available on a new entry too', () => {
    mockApi({})
    renderWithClient(<NewEntryEditor dateLabel="Today, Aug 25 · 8:14 AM" />)
    expect(screen.getByRole('button', { name: 'Manage tags' })).toBeTruthy()
  })
})
