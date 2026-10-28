import { describe, expect, it } from 'vitest'
import { makeQueryClient } from '@/components/providers/Providers'
import { ApiError } from '@/src/lib/api'

const { queries } = makeQueryClient().getDefaultOptions()
const retry = queries?.retry as (failureCount: number, error: Error) => boolean

describe('makeQueryClient', () => {
  it('keeps data fresh for a minute', () => {
    expect(queries?.staleTime).toBe(60_000)
  })

  it.each([400, 401, 404, 409])('does not retry a %i', (status) => {
    expect(retry(0, new ApiError(status, 'NOT_FOUND', 'Not found.'))).toBe(false)
  })

  it('retries a 5xx up to three times', () => {
    const error = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong.')

    expect(retry(0, error)).toBe(true)
    expect(retry(2, error)).toBe(true)
    expect(retry(3, error)).toBe(false)
  })

  it('retries network failures', () => {
    expect(retry(0, new TypeError('Failed to fetch'))).toBe(true)
  })
})
