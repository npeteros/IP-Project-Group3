// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestContext } from '@mastra/core/request-context'
import { createUserRequestContext } from '@/src/mastra/guardrails/requestContext'

const service = vi.hoisted(() => ({
  constructor: vi.fn(),
  findManyEntries: vi.fn(),
  findOneEntry: vi.fn(),
}))

vi.mock('@/src/server/entry/entry.service', () => ({
  EntryService: vi.fn(function (userId: string) {
    service.constructor(userId)
    return {
      findManyEntries: service.findManyEntries,
      findOneEntry: service.findOneEntry,
    }
  }),
}))

import { getEntryTool } from '@/src/mastra/tools/get-entry-tool'
import { SearchEntriesInputSchema, searchEntriesTool } from '@/src/mastra/tools/search-entries-tool'

const USER_ID = '3f2b1c4e-8a9d-4e7f-9b1a-2c3d4e5f6a7b'
const ENTRY_ID = '0d1e2f3a-4b5c-4d6e-9f7a-8b9c0d1e2f3a'

beforeEach(() => {
  vi.clearAllMocks()
  service.findManyEntries.mockResolvedValue({ entries: [], total: 0 })
  service.findOneEntry.mockResolvedValue({ id: ENTRY_ID })
})

describe('searchEntriesTool', () => {
  it('reuses the entry-list date range validation', () => {
    expect(
      SearchEntriesInputSchema.safeParse({
        entryStartDate: '2026-10-31',
        entryEndDate: '2026-10-01',
      }).success,
    ).toBe(false)
  })

  it('uses the request-context user and maps text, tag, and date filters to EntryService', async () => {
    if (!searchEntriesTool.execute) throw new Error('searchEntriesTool has no execute function.')

    await searchEntriesTool.execute(
      {
        text: 'work',
        tag: 'project',
        entryStartDate: '2026-10-01',
        entryEndDate: '2026-10-31',
        limit: 5,
      },
      { requestContext: createUserRequestContext(USER_ID) },
    )

    expect(service.constructor).toHaveBeenCalledWith(USER_ID)
    expect(service.findManyEntries).toHaveBeenCalledWith({
      skip: 0,
      take: 5,
      searchText: 'work',
      tagName: 'project',
      entryStartDate: '2026-10-01',
      entryEndDate: '2026-10-31',
    })
  })

  it('fails without a user in request context', async () => {
    if (!searchEntriesTool.execute) throw new Error('searchEntriesTool has no execute function.')

    await expect(
      searchEntriesTool.execute({ limit: 10 }, { requestContext: new RequestContext() }),
    ).rejects.toThrow('Authenticated user context is required')
    expect(service.constructor).not.toHaveBeenCalled()
  })
})

describe('getEntryTool', () => {
  it('uses the request-context user to retrieve an entry', async () => {
    if (!getEntryTool.execute) throw new Error('getEntryTool has no execute function.')

    await getEntryTool.execute(
      { id: ENTRY_ID },
      { requestContext: createUserRequestContext(USER_ID) },
    )

    expect(service.constructor).toHaveBeenCalledWith(USER_ID)
    expect(service.findOneEntry).toHaveBeenCalledWith(ENTRY_ID)
  })

  it('fails without a user in request context', async () => {
    if (!getEntryTool.execute) throw new Error('getEntryTool has no execute function.')

    await expect(
      getEntryTool.execute({ id: ENTRY_ID }, { requestContext: new RequestContext() }),
    ).rejects.toThrow('Authenticated user context is required')
    expect(service.constructor).not.toHaveBeenCalled()
  })
})
