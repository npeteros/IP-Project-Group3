import { z } from 'zod'

export const StatsSchema = z
  .object({
    currentStreak: z.number().int().min(0).meta({
      description:
        'Consecutive Manila calendar days with at least one live entry, counted back from today, or from yesterday if there is no entry today yet.',
    }),
    lastEntryDate: z.iso.date().nullable().meta({
      description: 'The most recent `entryDate` (`YYYY-MM-DD`) of a live entry, or null if none.',
    }),
  })
  .meta({ id: 'Stats' })

export type Stats = z.infer<typeof StatsSchema>
