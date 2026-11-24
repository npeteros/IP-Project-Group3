import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ManageTags } from '@/components/ManageTags'
import { api } from '@/src/lib/api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const WORK = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const FAMILY = '16fd2706-8baf-433b-82eb-8c7fada847da'
const IDEAS = '0f8fad5b-d9cb-469f-a165-70867728950e'

const TAGS = [
  { id: WORK, name: 'Work', entryCount: 3 },
  { id: FAMILY, name: 'Family', entryCount: 1 },
  { id: IDEAS, name: 'Ideas', entryCount: 0 },
]

type Handler = (init?: RequestInit) => Response | Promise<Response>
const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })
const apiError = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } })

function mockApi(routes: Record<string, Handler> = {}) {
  const all: Record<string, Handler> = {
    'GET /api/v1/tags': () => json(200, { tags: TAGS }),
    ...routes,
  }
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

function renderTags(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const onRenamed = vi.fn()
  const onDeleted = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <ManageTags onRenamed={onRenamed} onDeleted={onDeleted} />
    </QueryClientProvider>,
  )
  return { onRenamed, onDeleted, queryClient }
}

const toggle = () => screen.getByRole('button', { name: 'Manage tags' })
async function open() {
  fireEvent.click(toggle())
  await screen.findByRole('list', { name: 'All tags' })
}
const rows = () => within(screen.getByRole('list', { name: 'All tags' })).getAllByRole('listitem')

beforeEach(() => mockApi())

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
})

describe('ManageTags: the list', () => {
  it('stays closed, and loads nothing, until asked', () => {
    renderTags()

    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('region', { name: 'Your tags' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lists every tag with how many entries use it', async () => {
    renderTags()
    await open()

    expect(toggle().getAttribute('aria-expanded')).toBe('true')
    expect(rows().map((row) => row.textContent)).toEqual([
      'Work3 entriesRenameDelete',
      'Family1 entryRenameDelete',
      'Ideas0 entriesRenameDelete',
    ])
  })

  it('closes again', async () => {
    renderTags()
    await open()

    fireEvent.click(toggle())

    expect(screen.queryByRole('region', { name: 'Your tags' })).toBeNull()
  })

  it('shows a loading state while the tags load', () => {
    mockApi({ 'GET /api/v1/tags': () => new Promise<Response>(() => {}) })
    renderTags()

    fireEvent.click(toggle())

    expect(screen.getByRole('status').textContent).toBe('Loading tags…')
  })

  it('explains an empty list', async () => {
    mockApi({ 'GET /api/v1/tags': () => json(200, { tags: [] }) })
    renderTags()

    fireEvent.click(toggle())

    expect(await screen.findByText(/You don’t have any tags yet/)).toBeTruthy()
  })

  it('shows a failed load with a retry', async () => {
    mockApi({ 'GET /api/v1/tags': () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.') })
    renderTags()
    fireEvent.click(toggle())
    expect((await screen.findByRole('alert')).textContent).toBe('Couldn’t load your tags.')

    mockApi()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await screen.findByRole('list', { name: 'All tags' })
    expect(rows()).toHaveLength(3)
  })
})

describe('ManageTags: renaming', () => {
  const startRename = async (name = 'Work') => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: `Rename tag ${name}` }))
    return screen.getByRole('textbox', { name: `New name for ${name}` }) as HTMLInputElement
  }
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  it('opens an input holding the current name', async () => {
    renderTags()
    const input = await startRename()

    expect(input.value).toBe('Work')
    expect(document.activeElement).toBe(input)
  })

  it('renames the tag, tells the editor, and goes back to the list', async () => {
    mockApi({ [`PATCH /api/v1/tags/${WORK}`]: () => json(200, { id: WORK, name: 'Office' }) })
    const { onRenamed } = renderTags()
    const input = await startRename()

    fireEvent.change(input, { target: { value: '  Office ' } })
    save()

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Work', 'Office'))
    expect(JSON.parse(String(requests(`PATCH /api/v1/tags/${WORK}`)[0][1]?.body))).toEqual({
      name: 'Office',
    })
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
    expect(screen.getByRole('button', { name: 'Rename tag Work' })).toBeTruthy()
  })

  it('refreshes the tag list and the entries after renaming', async () => {
    mockApi({ [`PATCH /api/v1/tags/${WORK}`]: () => json(200, { id: WORK, name: 'Office' }) })
    const { queryClient } = renderTags()
    const entriesKey = api.entry.findManyEntries.queryKey({})
    queryClient.setQueryData(entriesKey, { entries: [], total: 0 })
    const input = await startRename()

    fireEvent.change(input, { target: { value: 'Office' } })
    save()

    await waitFor(() => expect(requests('GET /api/v1/tags')).toHaveLength(2))
    // Entry cards show tag names, so the journal has to refetch them
    expect(queryClient.getQueryState(entriesKey)?.isInvalidated).toBe(true)
  })

  it('shows a name that is already taken (409) as a field error and keeps editing', async () => {
    mockApi({
      [`PATCH /api/v1/tags/${WORK}`]: () =>
        apiError(409, 'CONFLICT', 'A tag with this name already exists.'),
    })
    const { onRenamed } = renderTags()
    const input = await startRename()

    fireEvent.change(input, { target: { value: 'Family' } })
    save()

    const message = await screen.findByText('A tag with this name already exists.')
    expect(message.getAttribute('role')).toBe('alert')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(message.id)
    expect(onRenamed).not.toHaveBeenCalled()
    // Still editing, with what the user typed
    expect(input.value).toBe('Family')
  })

  it('lets the user fix a conflict and save again', async () => {
    mockApi({
      [`PATCH /api/v1/tags/${WORK}`]: () =>
        apiError(409, 'CONFLICT', 'A tag with this name already exists.'),
    })
    const { onRenamed } = renderTags()
    const input = await startRename()
    fireEvent.change(input, { target: { value: 'Family' } })
    save()
    await screen.findByText('A tag with this name already exists.')

    mockApi({ [`PATCH /api/v1/tags/${WORK}`]: () => json(200, { id: WORK, name: 'Office' }) })
    fireEvent.change(input, { target: { value: 'Office' } })
    save()

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Work', 'Office'))
  })

  it('shows any other failure as a field error too', async () => {
    mockApi({
      [`PATCH /api/v1/tags/${WORK}`]: () =>
        apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
    })
    renderTags()
    const input = await startRename()

    fireEvent.change(input, { target: { value: 'Office' } })
    save()

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Couldn’t rename this tag. Please try again.',
    )
  })

  it.each([
    ['an empty name', '', 'Tag names cannot be empty.'],
    ['a blank name', '   ', 'Tag names cannot be empty.'],
    ['a name over the limit', 'x'.repeat(33), 'Tag names can be at most 32 characters.'],
  ])(
    'rejects %s with the schema message, without calling the API',
    async (_label, value, message) => {
      renderTags()
      const input = await startRename()

      fireEvent.change(input, { target: { value } })
      save()

      expect((await screen.findByRole('alert')).textContent).toBe(message)
      expect(requests(`PATCH /api/v1/tags/${WORK}`)).toHaveLength(0)
    },
  )

  it('closes without a request when the name is unchanged', async () => {
    const { onRenamed } = renderTags()
    await startRename()

    save()

    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
    expect(requests(`PATCH /api/v1/tags/${WORK}`)).toHaveLength(0)
    expect(onRenamed).not.toHaveBeenCalled()
  })

  it('treats a change of case as a rename', async () => {
    mockApi({ [`PATCH /api/v1/tags/${WORK}`]: () => json(200, { id: WORK, name: 'WORK' }) })
    const { onRenamed } = renderTags()
    const input = await startRename()

    fireEvent.change(input, { target: { value: 'WORK' } })
    save()

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Work', 'WORK'))
  })

  it('cancels with the Cancel button and with Escape', async () => {
    renderTags()
    const input = await startRename()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('textbox')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Rename tag Work' }))
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(input.isConnected).toBe(false)
  })

  it('locks the field and the buttons while saving', async () => {
    let release: (response: Response) => void = () => {}
    mockApi({
      [`PATCH /api/v1/tags/${WORK}`]: () => new Promise<Response>((resolve) => (release = resolve)),
    })
    renderTags()
    const input = await startRename()
    fireEvent.change(input, { target: { value: 'Office' } })

    save()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Saving…' })).toBeTruthy())
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(input.readOnly).toBe(true)

    release(json(200, { id: WORK, name: 'Office' }))
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
  })

  it('does not submit anything outside its own form when Enter is pressed', async () => {
    mockApi({ [`PATCH /api/v1/tags/${WORK}`]: () => json(200, { id: WORK, name: 'Office' }) })
    const { onRenamed } = renderTags()
    const input = await startRename()
    fireEvent.change(input, { target: { value: 'Office' } })

    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(onRenamed).toHaveBeenCalledTimes(1))
  })
})

describe('ManageTags: deleting', () => {
  const startDelete = async (name = 'Work') => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: `Delete tag ${name}` }))
    return screen.getByRole('group', { name: `Confirm deleting ${name}` })
  }

  it('asks first, and says the tag is removed from every entry', async () => {
    renderTags()
    const confirmation = await startDelete()

    expect(confirmation.textContent).toContain('Delete “Work”?')
    expect(confirmation.textContent).toContain('removed from every entry')
    expect(confirmation.textContent).toContain('(3 entries)')
    expect(requests(`DELETE /api/v1/tags/${WORK}`)).toHaveLength(0)
  })

  it('uses the singular for one entry, and leaves the count out for none', async () => {
    renderTags()
    expect((await startDelete('Family')).textContent).toContain('(1 entry)')

    fireEvent.click(screen.getByRole('button', { name: 'Keep tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag Ideas' }))
    const text = screen.getByRole('group', { name: 'Confirm deleting Ideas' }).textContent
    expect(text).toContain('removed from every entry that uses it.')
    expect(text).not.toContain('(0')
  })

  it('keeps the tag when the user backs out', async () => {
    const { onDeleted } = renderTags()
    await startDelete()

    fireEvent.click(screen.getByRole('button', { name: 'Keep tag' }))

    expect(screen.queryByRole('group')).toBeNull()
    expect(requests(`DELETE /api/v1/tags/${WORK}`)).toHaveLength(0)
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('deletes the tag after confirmation and tells the editor', async () => {
    mockApi({ [`DELETE /api/v1/tags/${WORK}`]: () => json(204) })
    const { onDeleted } = renderTags()
    await startDelete()

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('Work'))
    expect(requests(`DELETE /api/v1/tags/${WORK}`)).toHaveLength(1)
    await waitFor(() => expect(screen.queryByRole('group')).toBeNull())
  })

  it('still tells the editor when the refreshed list drops the tag before the delete settles', async () => {
    // In the editor the entry query is open too. The delete waits for it to refetch, and the tag
    // list can refresh first, unmounting the confirmation. A callback tied to the component would
    // then be skipped, leaving the tag in the editor for the next Save to create again.
    const ENTRY_ID = '9b2f3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
    let deleted = false
    let releaseEntry: (response: Response) => void = () => {}
    mockApi({
      'GET /api/v1/tags': () =>
        json(200, { tags: deleted ? TAGS.filter((tag) => tag.id !== WORK) : TAGS }),
      [`GET /api/v1/entries/${ENTRY_ID}`]: () =>
        deleted
          ? new Promise<Response>((resolve) => (releaseEntry = resolve))
          : json(200, { id: ENTRY_ID }),
      [`DELETE /api/v1/tags/${WORK}`]: () => {
        deleted = true
        return json(204)
      },
    })
    function OpenEntry() {
      api.entry.findOneEntry.useQuery({ id: ENTRY_ID })
      return null
    }
    const onDeleted = vi.fn()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <OpenEntry />
        <ManageTags onRenamed={vi.fn()} onDeleted={onDeleted} />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(requests(`GET /api/v1/entries/${ENTRY_ID}`)).toHaveLength(1))
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag Work' }))

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() => expect(screen.queryByText('Work')).toBeNull())
    releaseEntry(json(200, { id: ENTRY_ID }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('Work'))
  })

  it('refreshes the tag list and the entries after deleting', async () => {
    mockApi({ [`DELETE /api/v1/tags/${WORK}`]: () => json(204) })
    const { queryClient } = renderTags()
    const entriesKey = api.entry.findManyEntries.queryKey({})
    queryClient.setQueryData(entriesKey, { entries: [], total: 0 })
    await startDelete()

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() => expect(requests('GET /api/v1/tags')).toHaveLength(2))
    expect(queryClient.getQueryState(entriesKey)?.isInvalidated).toBe(true)
  })

  it('shows a failure and keeps the confirmation open to retry', async () => {
    mockApi({
      [`DELETE /api/v1/tags/${WORK}`]: () =>
        apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
    })
    const { onDeleted } = renderTags()
    await startDelete()

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Couldn’t delete this tag. Please try again.',
    )
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByRole('group', { name: 'Confirm deleting Work' })).toBeTruthy()
  })

  it('locks the buttons while deleting', async () => {
    let release: (response: Response) => void = () => {}
    mockApi({
      [`DELETE /api/v1/tags/${WORK}`]: () =>
        new Promise<Response>((resolve) => (release = resolve)),
    })
    renderTags()
    await startDelete()

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Deleting…' })).toBeTruthy())
    expect((screen.getByRole('button', { name: 'Keep tag' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    release(json(204))
    await waitFor(() => expect(screen.queryByRole('group')).toBeNull())
  })

  it('works on one tag at a time', async () => {
    renderTags()
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Rename tag Work' }))
    expect(screen.getByRole('textbox', { name: 'New name for Work' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Delete tag Family' }))

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('group', { name: 'Confirm deleting Family' })).toBeTruthy()
  })
})
