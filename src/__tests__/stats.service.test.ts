// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/src/generated/prisma/client'
import { StatsService } from '@/src/server/stats/stats.service'

// 10:00 on 2026-06-10 in Manila (UTC+8)
const NOW = '2026-06-10T02:00:00.000Z'

const day = (date: string) => ({ entryDate: new Date(`${date}T00:00:00.000Z`) })

/** `dates` are distinct and newest first, as the GROUP BY query returns them. */
function setup(dates: string[]) {
  const db = { entry: { groupBy: vi.fn().mockResolvedValue(dates.map(day)) } }
  const service = new StatsService('u1', db as unknown as PrismaClient)
  return { db, service }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('StatsService.getStats', () => {
  it('returns 0 and null with no entries', async () => {
    const { service } = setup([])
    await expect(service.getStats()).resolves.toEqual({ currentStreak: 0, lastEntryDate: null })
  })

  it('counts an entry today only as 1', async () => {
    const { service } = setup(['2026-06-10'])
    await expect(service.getStats()).resolves.toEqual({
      currentStreak: 1,
      lastEntryDate: '2026-06-10',
    })
  })

  it('keeps the streak alive from yesterday before the user writes today', async () => {
    const { service } = setup(['2026-06-09'])
    await expect(service.getStats()).resolves.toEqual({
      currentStreak: 1,
      lastEntryDate: '2026-06-09',
    })
  })

  it('returns 0 when the latest entry is two days ago, but still reports it', async () => {
    const { service } = setup(['2026-06-08', '2026-06-07'])
    await expect(service.getStats()).resolves.toEqual({
      currentStreak: 0,
      lastEntryDate: '2026-06-08',
    })
  })

  it('stops counting at the first gap', async () => {
    const { service } = setup(['2026-06-10', '2026-06-09', '2026-06-07', '2026-06-06'])
    await expect(service.getStats()).resolves.toMatchObject({ currentStreak: 2 })
  })

  it('counts back from yesterday across a gap', async () => {
    const { service } = setup(['2026-06-09', '2026-06-08', '2026-06-06'])
    await expect(service.getStats()).resolves.toMatchObject({ currentStreak: 2 })
  })

  it('counts across a month boundary', async () => {
    vi.setSystemTime(new Date('2026-07-01T02:00:00.000Z'))
    const { service } = setup(['2026-07-01', '2026-06-30', '2026-06-29'])
    await expect(service.getStats()).resolves.toMatchObject({ currentStreak: 3 })
  })

  it('groups by day so several entries on one day count once, scoped to live entries', async () => {
    const { db, service } = setup(['2026-06-10'])
    await service.getStats()

    expect(db.entry.groupBy).toHaveBeenCalledWith({
      by: ['entryDate'],
      where: {
        userId: 'u1',
        deletedAt: null,
        entryDate: { lte: new Date('2026-06-10T00:00:00.000Z') },
      },
      orderBy: { entryDate: 'desc' },
    })
  })

  describe('Manila day boundary', () => {
    const dates = ['2026-06-01', '2026-05-31']

    it('at 23:30 Manila, Jun 1 is today', async () => {
      vi.setSystemTime(new Date('2026-06-01T15:30:00.000Z'))
      const { db, service } = setup(dates)

      await expect(service.getStats()).resolves.toMatchObject({ currentStreak: 2 })
      expect(db.entry.groupBy.mock.calls[0][0].where.entryDate).toEqual({
        lte: new Date('2026-06-01T00:00:00.000Z'),
      })
    })

    it('at 00:30 Manila the next day, Jun 2 is today and the streak holds from yesterday', async () => {
      vi.setSystemTime(new Date('2026-06-01T16:30:00.000Z'))
      const { db, service } = setup(dates)

      await expect(service.getStats()).resolves.toMatchObject({ currentStreak: 2 })
      expect(db.entry.groupBy.mock.calls[0][0].where.entryDate).toEqual({
        lte: new Date('2026-06-02T00:00:00.000Z'),
      })
    })

    it('a day later in Manila (still Jun 2 in UTC), the streak has lapsed', async () => {
      vi.setSystemTime(new Date('2026-06-02T16:30:00.000Z'))
      const { service } = setup(dates)

      await expect(service.getStats()).resolves.toMatchObject({ currentStreak: 0 })
    })
  })
})
