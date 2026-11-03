import { describe, expect, it } from 'vitest'
import {
  APP_TIME_ZONE,
  calendarDateToDbDate,
  dbDateToCalendarDate,
  toCalendarDate,
} from '@/src/lib/timezone'

describe('timezone', () => {
  it('uses Manila time', () => {
    expect(APP_TIME_ZONE).toBe('Asia/Manila')
  })

  it.each([
    ['2026-06-01T15:59:59.999Z', '2026-06-01'], // 11:59pm Manila
    ['2026-06-01T16:00:00.000Z', '2026-06-02'], // midnight Manila
    ['2025-12-31T17:30:00.000Z', '2026-01-01'], // crosses the year
    ['2026-01-01T23:30:00-05:00', '2026-01-02'], // offset in the input doesn't matter
  ])('puts %s on %s', (instant, calendarDate) => {
    expect(toCalendarDate(new Date(instant))).toBe(calendarDate)
  })

  it('zero-pads years before 1000 so the result is still a valid date', () => {
    // Only the format is checked: Manila's historical offset that far back isn't +08:00
    const calendarDate = toCalendarDate(new Date('0999-05-01T00:00:00.000Z'))
    expect(calendarDate).toMatch(/^0999-\d{2}-\d{2}$/)
    expect(Number.isNaN(calendarDateToDbDate(calendarDate).getTime())).toBe(false)
  })

  it('round-trips a calendar date through a DATE column value', () => {
    const dbDate = calendarDateToDbDate('2026-02-28')
    expect(dbDate.toISOString()).toBe('2026-02-28T00:00:00.000Z')
    expect(dbDateToCalendarDate(dbDate)).toBe('2026-02-28')
  })
})
