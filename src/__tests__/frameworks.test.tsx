import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FrameworkBuilder, FrameworkGallery, GuidedFrameworkEntry } from '@/components/frameworks'
import type { Framework } from '@/src/lib/api'
import { composeFrameworkBody } from '@/src/lib/framework-entry'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const DAILY = '00000000-0000-4000-8000-000000000003'
const CUSTOM = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const ENTRY = '16fd2706-8baf-433b-82eb-8c7fada847da'
const timestamp = '2026-11-01T00:00:00.000Z'

const DAILY_REVIEW: Framework = {
  id: DAILY,
  userId: null,
  name: 'Daily Review',
  description: 'Three quick prompts to close the day',
  icon: 'check',
  durationMinutes: 3,
  prompts: ['What went well today?', 'What could have gone better?', 'One thing to carry'],
  createdAt: timestamp,
  updatedAt: timestamp,
}
const SUNDAY_RESET: Framework = {
  ...DAILY_REVIEW,
  id: CUSTOM,
  userId: 'u1',
  name: 'Sunday Reset',
  description: 'Close out the week',
  icon: 'sun',
  durationMinutes: 2,
  prompts: ['What am I proud of?'],
}

type Handler = (init?: RequestInit) => Response | Promise<Response>
const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })
const apiError = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } })

function mockApi(routes: Record<string, Handler> = {}) {
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`
    const handler = routes[key]
    if (!handler) throw new Error(`Unexpected request: ${key}`)
    return handler(init)
  })
}

const requests = (key: string) =>
  fetchMock.mock.calls.filter(
    ([input, init]) => `${init?.method ?? 'GET'} ${String(input)}` === key,
  )
const bodyOf = (key: string) => JSON.parse(String(requests(key)[0][1]?.body))

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

beforeEach(() => push.mockReset())

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
})

describe('composeFrameworkBody', () => {
  it('puts each answer under its prompt and skips unanswered prompts', () => {
    expect(composeFrameworkBody(['A?', 'B?', 'C?'], [' one ', '   ', 'three'])).toBe(
      'A?\none\n\nC?\nthree',
    )
  })

  it('is empty when nothing is answered', () => {
    expect(composeFrameworkBody(['A?'], [''])).toBe('')
  })
})

describe('FrameworkGallery', () => {
  it('lists built-in and custom frameworks with their duration', async () => {
    mockApi({
      'GET /api/v1/frameworks': () => json(200, { frameworks: [DAILY_REVIEW, SUNDAY_RESET] }),
    })
    renderWithClient(<FrameworkGallery />)

    const daily = await screen.findByRole('link', { name: /Daily Review/ })
    expect(daily.getAttribute('href')).toBe(`/frameworks/${DAILY}`)
    expect(within(daily).getByText('3 min')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Sunday Reset/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Build your own framework' })).toBeTruthy()
  })

  it('shows loading, then an empty state', async () => {
    mockApi({ 'GET /api/v1/frameworks': () => json(200, { frameworks: [] }) })
    renderWithClient(<FrameworkGallery />)

    expect(screen.getByText('Loading frameworks…')).toBeTruthy()
    expect(await screen.findByText('No frameworks yet.')).toBeTruthy()
  })

  it('offers a retry when the list fails to load', async () => {
    mockApi({
      'GET /api/v1/frameworks': () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
    })
    renderWithClient(<FrameworkGallery />)

    expect((await screen.findByRole('alert')).textContent).toMatch(/Couldn.t load frameworks/)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('deletes only custom frameworks, after a confirmation', async () => {
    let frameworks = [DAILY_REVIEW, SUNDAY_RESET]
    mockApi({
      'GET /api/v1/frameworks': () => json(200, { frameworks }),
      [`DELETE /api/v1/frameworks/${CUSTOM}`]: () => {
        frameworks = [DAILY_REVIEW]
        return json(204)
      },
    })
    renderWithClient(<FrameworkGallery />)
    await screen.findByRole('link', { name: /Sunday Reset/ })

    expect(screen.queryByRole('button', { name: 'Delete Daily Review' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Sunday Reset' }))
    expect(requests(`DELETE /api/v1/frameworks/${CUSTOM}`)).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() => expect(screen.queryByRole('link', { name: /Sunday Reset/ })).toBeNull())
    expect(requests(`DELETE /api/v1/frameworks/${CUSTOM}`)).toHaveLength(1)
  })
})

describe('GuidedFrameworkEntry', () => {
  it('shows not found for an id that is not a UUID, without a request', () => {
    mockApi()
    renderWithClient(<GuidedFrameworkEntry id="daily-review" />)

    expect(screen.getByRole('heading', { name: 'Framework not found' })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows not found for a missing or deleted framework', async () => {
    mockApi({
      [`GET /api/v1/frameworks/${DAILY}`]: () => apiError(404, 'NOT_FOUND', 'Framework not found.'),
    })
    renderWithClient(<GuidedFrameworkEntry id={DAILY} />)

    expect(await screen.findByRole('heading', { name: 'Framework not found' })).toBeTruthy()
  })

  it('numbers each prompt with an answer field', async () => {
    mockApi({ [`GET /api/v1/frameworks/${DAILY}`]: () => json(200, DAILY_REVIEW) })
    renderWithClient(<GuidedFrameworkEntry id={DAILY} />)

    expect(await screen.findByRole('heading', { name: 'Daily Review' })).toBeTruthy()
    for (const prompt of DAILY_REVIEW.prompts) {
      expect(screen.getByRole('textbox', { name: new RegExp(prompt) })).toBeTruthy()
    }
  })

  it('saves the answered prompts as one entry linked to the framework, then opens it', async () => {
    mockApi({
      [`GET /api/v1/frameworks/${DAILY}`]: () => json(200, DAILY_REVIEW),
      'POST /api/v1/entries': () => json(201, { id: ENTRY }),
    })
    renderWithClient(<GuidedFrameworkEntry id={DAILY} />)
    await screen.findByRole('heading', { name: 'Daily Review' })

    const save = screen.getByRole('button', { name: /Save$/ }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: /What went well today/ }), {
      target: { value: 'Shipped the frameworks page' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /One thing to carry/ }), {
      target: { value: 'Rest' },
    })
    expect(save.disabled).toBe(false)
    fireEvent.click(save)

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/journal/${ENTRY}`))
    expect(bodyOf('POST /api/v1/entries')).toEqual({
      title: 'Daily Review',
      body: 'What went well today?\nShipped the frameworks page\n\nOne thing to carry\nRest',
      frameworkId: DAILY,
    })
  })

  it('shows a failed save and keeps the answers', async () => {
    mockApi({
      [`GET /api/v1/frameworks/${DAILY}`]: () => json(200, DAILY_REVIEW),
      'POST /api/v1/entries': () => apiError(404, 'NOT_FOUND', 'Framework not found.'),
    })
    renderWithClient(<GuidedFrameworkEntry id={DAILY} />)
    const answer = await screen.findByRole('textbox', { name: /What went well today/ })
    fireEvent.change(answer, { target: { value: 'A lot' } })
    fireEvent.click(screen.getByRole('button', { name: /Save$/ }))

    expect((await screen.findByRole('alert')).textContent).toBe('Framework not found.')
    expect((answer as HTMLTextAreaElement).value).toBe('A lot')
    expect(push).not.toHaveBeenCalled()
  })
})

describe('FrameworkBuilder', () => {
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

  const saveButton = () => screen.getByRole('button', { name: /^Save/ }) as HTMLButtonElement

  function fillIn(name: string, description: string) {
    fireEvent.change(screen.getByRole('textbox', { name: 'Framework name' }), {
      target: { value: name },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: { value: description },
    })
  }

  it('needs a name, a description and at least one prompt before saving', () => {
    mockApi()
    renderWithClient(<FrameworkBuilder />)
    expect(saveButton().disabled).toBe(true)
    fillIn('Sunday Reset', '')
    addPrompt('What am I proud of this week?')
    expect(saveButton().disabled).toBe(true)
    fillIn('Sunday Reset', 'Close out the week')
    expect(saveButton().disabled).toBe(false)
  })

  it('adds prompts from the input and the button, ignoring blanks', () => {
    mockApi()
    renderWithClient(<FrameworkBuilder />)
    addPrompt('First')
    addPrompt('   ')
    fireEvent.change(screen.getByRole('textbox', { name: 'New prompt' }), {
      target: { value: 'Second' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add prompt' }))
    expect(promptTexts()).toEqual(['First', 'Second'])
  })

  it('reorders and removes prompts', () => {
    mockApi()
    renderWithClient(<FrameworkBuilder />)
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

  it('creates the framework, then returns to the gallery', async () => {
    mockApi({ 'POST /api/v1/frameworks': () => json(201, SUNDAY_RESET) })
    renderWithClient(<FrameworkBuilder />)
    fillIn(' Sunday Reset ', 'Close out the week')
    fireEvent.click(screen.getByRole('radio', { name: 'sun' }))
    addPrompt('What am I proud of?')
    addPrompt('What do I want next week?')
    fireEvent.click(saveButton())

    await waitFor(() => expect(push).toHaveBeenCalledWith('/frameworks'))
    expect(bodyOf('POST /api/v1/frameworks')).toEqual({
      name: 'Sunday Reset',
      description: 'Close out the week',
      icon: 'sun',
      prompts: ['What am I proud of?', 'What do I want next week?'],
    })
  })

  it('saves a prompt that was typed but not added yet', async () => {
    mockApi({ 'POST /api/v1/frameworks': () => json(201, SUNDAY_RESET) })
    renderWithClient(<FrameworkBuilder />)
    fillIn('Sunday Reset', 'Close out the week')
    addPrompt('What am I proud of?')
    fireEvent.change(screen.getByRole('textbox', { name: 'New prompt' }), {
      target: { value: ' What do I want next week? ' },
    })
    fireEvent.click(saveButton())

    await waitFor(() => expect(push).toHaveBeenCalledWith('/frameworks'))
    expect(bodyOf('POST /api/v1/frameworks').prompts).toEqual([
      'What am I proud of?',
      'What do I want next week?',
    ])
  })

  it('can save with only a typed prompt', () => {
    mockApi()
    renderWithClient(<FrameworkBuilder />)
    fillIn('Sunday Reset', 'Close out the week')
    expect(saveButton().disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: 'New prompt' }), {
      target: { value: 'What am I proud of?' },
    })
    expect(saveButton().disabled).toBe(false)
  })

  it('shows a failed save', async () => {
    mockApi({
      'POST /api/v1/frameworks': () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
    })
    renderWithClient(<FrameworkBuilder />)
    fillIn('Sunday Reset', 'Close out the week')
    addPrompt('What am I proud of?')
    fireEvent.click(saveButton())

    expect((await screen.findByRole('alert')).textContent).toBe('Something went wrong.')
    expect(push).not.toHaveBeenCalled()
  })
})
