import { describe, expect, it } from 'vitest'
import {
  APP_TIME_ZONE,
  calendarDateToDbDate,
  dbDateToCalendarDate,
  formatEntryTimestamp,
  formatTodayTimestamp,
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

describe('formatTodayTimestamp', () => {
  it('formats the Manila date and time', () => {
    // 00:14 UTC is 8:14 AM in Manila
    expect(formatTodayTimestamp(new Date('2026-08-25T00:14:00Z'))).toBe('Today, Aug 25 · 8:14 AM')
  })

  it('uses the Manila day, not the UTC day', () => {
    expect(formatTodayTimestamp(new Date('2026-08-24T16:30:00Z'))).toBe('Today, Aug 25 · 12:30 AM')
  })
})

describe('formatEntryTimestamp', () => {
  // 2026-08-25 08:14 in Manila
  const now = new Date('2026-08-25T00:14:00Z')

  it('says "Today" for an entry written on the current Manila day', () => {
    expect(formatEntryTimestamp(new Date('2026-08-25T00:14:00Z'), now)).toBe(
      'Today, Aug 25 · 8:14 AM',
    )
  })

  it('judges "today" by the Manila day, not the UTC day', () => {
    // 4:30pm UTC on Aug 24 is 12:30am on Aug 25 in Manila
    expect(formatEntryTimestamp(new Date('2026-08-24T16:30:00Z'), now)).toBe(
      'Today, Aug 25 · 12:30 AM',
    )
    // ...and 3:59pm UTC on Aug 24 is still Aug 24 in Manila
    expect(formatEntryTimestamp(new Date('2026-08-24T15:59:00Z'), now)).toBe(
      'Mon, Aug 24 · 11:59 PM',
    )
  })

  it('shows the weekday for an earlier entry in the same year', () => {
    expect(formatEntryTimestamp(new Date('2026-08-23T13:05:00Z'), now)).toBe(
      'Sun, Aug 23 · 9:05 PM',
    )
  })

  it('adds the year for an entry from a previous year', () => {
    expect(formatEntryTimestamp(new Date('2025-08-25T00:14:00Z'), now)).toBe(
      'Mon, Aug 25, 2025 · 8:14 AM',
    )
  })

  it('compares years in Manila, so a late-December UTC entry that is already January is this year', () => {
    // 5:30pm UTC on Dec 31, 2025 is 1:30am on Jan 1, 2026 in Manila
    expect(formatEntryTimestamp(new Date('2025-12-31T17:30:00Z'), now)).toBe('Thu, Jan 1 · 1:30 AM')
  })

  it('defaults "now" to the current time', () => {
    expect(formatEntryTimestamp(new Date())).toMatch(/^Today, /)
  })
})
