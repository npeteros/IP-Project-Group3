import { afterEach, describe, expect, it, vi } from 'vitest'
import { queueEntryAnalysis, takeQueuedEntryAnalysis } from '@/src/lib/entry-analysis'

const A = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const B = '16fd2706-8baf-433b-82eb-8c7fada847da'

afterEach(() => {
  takeQueuedEntryAnalysis(A)
  vi.useRealTimers()
})

describe('queued entry analysis', () => {
  it('is taken once for the queued entry', () => {
    queueEntryAnalysis(A)
    expect(takeQueuedEntryAnalysis(A)).toBe(true)
    expect(takeQueuedEntryAnalysis(A)).toBe(false)
  })

  it('keeps only the latest entry', () => {
    queueEntryAnalysis(A)
    queueEntryAnalysis(B)
    expect(takeQueuedEntryAnalysis(A)).toBe(false)
  })

  it('is dropped once another entry is opened', () => {
    queueEntryAnalysis(A)
    expect(takeQueuedEntryAnalysis(B)).toBe(false)
    expect(takeQueuedEntryAnalysis(A)).toBe(false)
  })

  it('expires after 30 seconds, so an entry opened much later does not spend AI quota', () => {
    vi.useFakeTimers()
    queueEntryAnalysis(A)
    vi.advanceTimersByTime(30_001)
    expect(takeQueuedEntryAnalysis(A)).toBe(false)
  })

  it('is still taken just inside 30 seconds', () => {
    vi.useFakeTimers()
    queueEntryAnalysis(A)
    vi.advanceTimersByTime(30_000)
    expect(takeQueuedEntryAnalysis(A)).toBe(true)
  })
})
