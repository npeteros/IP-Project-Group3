import { describe, expect, it } from 'vitest'
import {
  FrameworkCreateSchema,
  FrameworkIdSchema,
  FrameworkListSchema,
  FrameworkSchema,
} from '@/src/server/framework/schemas'

const id = '00000000-0000-4000-8000-000000000001'
const timestamp = '2026-10-30T00:00:00.000Z'
const framework = {
  id,
  userId: null,
  name: 'Daily Review',
  description: 'Three quick prompts to close the day',
  icon: 'check',
  durationMinutes: 3,
  prompts: ['What went well today?'],
  createdAt: timestamp,
  updatedAt: timestamp,
}

describe('Framework schemas', () => {
  it('parses a framework and a framework list', () => {
    expect(FrameworkSchema.parse(framework)).toEqual(framework)
    expect(FrameworkListSchema.parse({ frameworks: [framework] })).toEqual({
      frameworks: [framework],
    })
  })

  it('requires a UUID framework ID', () => {
    expect(FrameworkIdSchema.parse({ id })).toEqual({ id })
    expect(FrameworkIdSchema.safeParse({ id: 'daily-review' }).success).toBe(false)
  })

  it('trims framework fields and prompts', () => {
    expect(
      FrameworkCreateSchema.parse({
        name: ' Daily Review ',
        description: ' A short reflection ',
        icon: ' check ',
        durationMinutes: 3,
        prompts: [' What went well? '],
      }),
    ).toEqual({
      name: 'Daily Review',
      description: 'A short reflection',
      icon: 'check',
      durationMinutes: 3,
      prompts: ['What went well?'],
    })
  })

  it.each([[], Array.from({ length: 11 }, (_, index) => `Prompt ${index}`), ['  ']])(
    'rejects invalid prompt lists',
    (prompts) => {
      expect(
        FrameworkCreateSchema.safeParse({
          name: 'Daily Review',
          description: 'A short reflection',
          icon: 'check',
          durationMinutes: 3,
          prompts,
        }).success,
      ).toBe(false)
    },
  )

  it('rejects non-positive or fractional durations', () => {
    const create = { name: 'Test', description: 'Test', icon: 'check', prompts: ['Prompt'] }
    expect(FrameworkCreateSchema.safeParse({ ...create, durationMinutes: 0 }).success).toBe(false)
    expect(FrameworkCreateSchema.safeParse({ ...create, durationMinutes: 1.5 }).success).toBe(false)
  })
})
