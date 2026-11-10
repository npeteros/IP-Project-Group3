import type { PrismaClient } from '@/src/generated/prisma/client'
import prisma from '@/src/lib/prisma'
import { calendarDateToDbDate, dbDateToCalendarDate, toCalendarDate } from '@/src/lib/timezone'
import type { Stats } from '@/src/server/stats/schemas'

const DAY_MS = 24 * 60 * 60 * 1000

export class StatsService {
  constructor(
    private readonly userId: string,
    private readonly db: PrismaClient = prisma,
  ) {}

  async getStats(): Promise<Stats> {
    const today = calendarDateToDbDate(toCalendarDate(new Date()))

    const days = await this.db.entry.groupBy({
      by: ['entryDate'],
      where: { userId: this.userId, deletedAt: null, entryDate: { lte: today } },
      orderBy: { entryDate: 'desc' },
    })

    const latest = days[0]?.entryDate
    return {
      currentStreak: latest
        ? countStreak(
            days.map((day) => day.entryDate),
            today,
          )
        : 0,
      lastEntryDate: latest ? dbDateToCalendarDate(latest) : null,
    }
  }
}

function countStreak(dates: Date[], today: Date): number {
  let expected = today.getTime()
  if (dates[0].getTime() !== expected) expected -= DAY_MS

  let streak = 0
  for (const date of dates) {
    if (date.getTime() !== expected) break
    streak++
    expected -= DAY_MS
  }
  return streak
}
