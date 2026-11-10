// Every calendar-date decision in the app (which day an entry belongs to, date
// filters, "today") is made in one fixed time zone. Safe to import on the client.

export const APP_TIME_ZONE = 'Asia/Manila'

const calendarDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The `YYYY-MM-DD` date that `date` falls on in Manila. 8pm UTC on Jun 1 is Jun 2. */
export function toCalendarDate(date: Date): string {
  const parts = calendarDateFormat.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  // `year: 'numeric'` doesn't pad, so year 999 would otherwise produce an invalid date string
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`
}

/** A `YYYY-MM-DD` date as the UTC-midnight `Date` that a Postgres `DATE` column stores. */
export function calendarDateToDbDate(calendarDate: string): Date {
  return new Date(`${calendarDate}T00:00:00.000Z`)
}

/** A `DATE` column value back to `YYYY-MM-DD`. */
export function dbDateToCalendarDate(dbDate: Date): string {
  return dbDate.toISOString().slice(0, 10)
}

const monthDayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  month: 'short',
  day: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
})

/** Editor header label for an instant written today, e.g. `Today, Aug 25 · 8:14 AM` (Manila). */
export function formatTodayTimestamp(date: Date): string {
  return `Today, ${monthDayFormat.format(date)} · ${timeFormat.format(date)}`
}

const weekdayMonthDayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const weekdayMonthDayYearFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/**
 * Editor header label for the instant an entry was written (Manila). Entries from today read
 * `Today, Aug 25 · 8:14 AM`, earlier ones `Mon, Aug 24 · 8:14 AM`, and ones from a previous year
 * add the year. `now` is injectable so callers (and tests) control what "today" means.
 */
export function formatEntryTimestamp(writtenAt: Date, now: Date = new Date()): string {
  const time = timeFormat.format(writtenAt)
  const writtenDay = toCalendarDate(writtenAt)
  const today = toCalendarDate(now)

  if (writtenDay === today) return `Today, ${monthDayFormat.format(writtenAt)} · ${time}`

  const sameYear = writtenDay.slice(0, 4) === today.slice(0, 4)
  const date = (sameYear ? weekdayMonthDayFormat : weekdayMonthDayYearFormat).format(writtenAt)
  return `${date} · ${time}`
}
