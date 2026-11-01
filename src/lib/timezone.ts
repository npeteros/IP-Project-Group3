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
