import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STREAK_PLACEHOLDER, StreakBadge } from '@/components/StreakBadge'
import { api } from '@/src/lib/api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => {
  fetchMock.mockReset()
})

function renderBadge(compact = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <StreakBadge compact={compact} />
    </QueryClientProvider>,
  )
  return queryClient
}

function respond(currentStreak: number) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ currentStreak, lastEntryDate: '2026-06-10' }), { status: 200 }),
  )
}

describe('StreakBadge', () => {
  it('shows the streak from GET /api/v1/stats', async () => {
    respond(5)
    renderBadge()

    expect(await screen.findByText('5 day streak')).toBeTruthy()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/stats')
  })

  it('shows only the number when compact', async () => {
    respond(5)
    renderBadge(true)

    expect(await screen.findByText('5')).toBeTruthy()
  })

  it('shows a zero streak', async () => {
    respond(0)
    renderBadge()

    expect(await screen.findByText('0 day streak')).toBeTruthy()
  })

  it('shows a placeholder while loading', () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}))
    renderBadge(true)

    expect(screen.getByText(STREAK_PLACEHOLDER)).toBeTruthy()
  })

  it('shows a placeholder when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))
    const queryClient = renderBadge(true)

    await vi.waitFor(() =>
      expect(queryClient.getQueryState(api.stats.get.queryKey())?.status).toBe('error'),
    )
    expect(screen.getByText(STREAK_PLACEHOLDER)).toBeTruthy()
  })

  it('updates when the stats query is refreshed', async () => {
    respond(1)
    const queryClient = renderBadge()
    expect(await screen.findByText('1 day streak')).toBeTruthy()

    respond(2)
    await queryClient.invalidateQueries({ queryKey: ['stats'] })

    expect(await screen.findByText('2 day streak')).toBeTruthy()
  })
})
