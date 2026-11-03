import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api, ApiError, defineMutation, defineQuery, request } from '@/src/lib/api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
}

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

afterEach(() => {
  fetchMock.mockReset()
})

describe('request', () => {
  it('builds the query string, skipping empty values', async () => {
    respond(200, [])

    await request('/api/v1/entries', { query: { take: 20, searchText: '', tagId: undefined } })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/entries?take=20')
  })

  it('sends a JSON body and returns the parsed response', async () => {
    respond(201, { id: 'abc' })

    const data = await request('/api/v1/entries', { method: 'POST', body: { body: 'Hi' } })

    const init = fetchMock.mock.calls[0][1]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"body":"Hi"}')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(data).toEqual({ id: 'abc' })
  })

  it('returns undefined for a 204', async () => {
    respond(204)

    await expect(request('/api/v1/entries/abc', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('throws an ApiError built from the error body', async () => {
    const issues = { formErrors: [], fieldErrors: { id: ['Invalid UUID'] } }
    respond(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid.', issues },
    })

    const error = await request('/api/v1/entries/nope').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', issues })
  })

  it('falls back to a generic ApiError when the body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }))

    const error = await request('/api/v1/entries').catch((e) => e)

    expect(error).toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    })
  })
})

describe('defineQuery', () => {
  const findOne = defineQuery(['entry', 'findOneEntry'], ({ id }: { id: string }, signal) =>
    request<{ id: string }>(`/api/v1/entries/${id}`, { signal }),
  )

  it('keys queries as [domain, procedure, input]', () => {
    expect(findOne.queryKey({ id: 'abc' })).toEqual(['entry', 'findOneEntry', { id: 'abc' }])
  })

  it('fetches and caches through useQuery', async () => {
    const queryClient = new QueryClient()
    respond(200, { id: 'abc' })

    const { result } = renderHook(() => findOne.useQuery({ id: 'abc' }), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: 'abc' })
    expect(queryClient.getQueryData(findOne.queryKey({ id: 'abc' }))).toEqual({ id: 'abc' })
  })
})

describe('defineMutation', () => {
  const create = defineMutation(
    (input: { body: string }) =>
      request<{ id: string }>('/api/v1/entries', { method: 'POST', body: input }),
    { invalidates: [['entry']] },
  )

  it('invalidates its keys before calling the caller onSuccess', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['entry', 'findManyEntries', {}], [])
    queryClient.setQueryData(['other'], 'untouched')
    const onSuccess = vi.fn(() => {
      expect(queryClient.getQueryState(['entry', 'findManyEntries', {}])?.isInvalidated).toBe(true)
    })
    respond(201, { id: 'abc' })

    const { result } = renderHook(() => create.useMutation({ onSuccess }), {
      wrapper: wrapper(queryClient),
    })
    await act(() => result.current.mutateAsync({ body: 'Hi' }))

    expect(onSuccess).toHaveBeenCalledOnce()
    expect(onSuccess.mock.calls[0]).toContainEqual({ id: 'abc' })
    expect(queryClient.getQueryState(['other'])?.isInvalidated).toBe(false)
  })
})

describe('api.entry', () => {
  const entryId = '0b7c2c1e-5f1a-4a39-9d43-3c2f4f6c8e11'

  it.each([
    [
      'findManyEntries',
      () => api.entry.findManyEntries.fetch({ take: 20 }),
      'GET',
      '/api/v1/entries?take=20',
    ],
    [
      'findOneEntry',
      () => api.entry.findOneEntry.fetch({ id: entryId }),
      'GET',
      `/api/v1/entries/${entryId}`,
    ],
    ['create', () => api.entry.create.mutate({ body: 'Hi' }), 'POST', '/api/v1/entries'],
    [
      'update',
      () => api.entry.update.mutate({ id: entryId, title: 'New' }),
      'PATCH',
      `/api/v1/entries/${entryId}`,
    ],
    [
      'delete',
      () => api.entry.delete.mutate({ id: entryId }),
      'DELETE',
      `/api/v1/entries/${entryId}`,
    ],
  ])('%s calls %s %s', async (_name, call, method, url) => {
    respond(200, {})

    await call()

    expect(fetchMock.mock.calls[0][0]).toBe(url)
    expect(fetchMock.mock.calls[0][1]?.method).toBe(method)
  })

  it('update sends the fields without the id', async () => {
    respond(200, {})

    await api.entry.update.mutate({ id: entryId, title: 'New' })

    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"title":"New"}')
  })
})
