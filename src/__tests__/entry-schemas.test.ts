import { describe, expect, it } from 'vitest'
import {
  EntryCreateSchema,
  EntryIdSchema,
  EntryListQuerySchema,
  EntryListSchema,
  EntrySchema,
  EntryAnalysisSchema,
  EntryUpdateSchema,
  MoodSchema,
  ENTRY_SUMMARY_MAX_LENGTH,
  TAG_NAME_MAX_LENGTH,
  TAGS_PER_ENTRY_MAX,
} from '@/src/server/entry/schemas'

function errorsOf(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  const errors: Record<string, string> = {}
  for (const issue of result.error?.issues ?? []) {
    const field = issue.path.length ? String(issue.path[0]) : ''
    errors[field] ??= issue.message
  }
  return errors
}

const uuid = '0190f5d2-7c3a-7b1e-9f00-1a2b3c4d5e6f'

describe('EntryCreateSchema', () => {
  it('trims the title and body', () => {
    expect(EntryCreateSchema.parse({ title: '  Morning  ', body: '  Hello  ' })).toMatchObject({
      title: 'Morning',
      body: 'Hello',
    })
  })

  it.each(['', '   '])('turns a blank title %j into undefined', (title) => {
    expect(EntryCreateSchema.parse({ title, body: 'Hello' }).title).toBeUndefined()
  })

  it('rejects a whitespace-only body', () => {
    expect(errorsOf(EntryCreateSchema.safeParse({ body: '   ' }))).toEqual({
      body: 'Write something before saving.',
    })
  })

  it('defaults tags to an empty list', () => {
    expect(EntryCreateSchema.parse({ body: 'Hello' })).toEqual({ body: 'Hello', tags: [] })
  })

  it('accepts an optional framework uuid', () => {
    expect(EntryCreateSchema.parse({ body: 'Hello', frameworkId: uuid })).toMatchObject({
      frameworkId: uuid,
    })
    expect(
      EntryCreateSchema.safeParse({ body: 'Hello', frameworkId: 'daily-review' }).success,
    ).toBe(false)
  })

  it('drops a client-sent time zone: dates are always derived in Manila time', () => {
    expect(EntryCreateSchema.parse({ body: 'x', timeZone: 'America/New_York' })).toEqual({
      body: 'x',
      tags: [],
    })
  })

  it(`accepts ${TAGS_PER_ENTRY_MAX} tags and rejects more`, () => {
    const tags = Array.from({ length: TAGS_PER_ENTRY_MAX + 1 }, (_, i) => `tag${i}`)
    expect(EntryCreateSchema.safeParse({ body: 'x', tags: tags.slice(1) }).success).toBe(true)
    expect(errorsOf(EntryCreateSchema.safeParse({ body: 'x', tags })).tags).toBe(
      `An entry can have at most ${TAGS_PER_ENTRY_MAX} tags.`,
    )
  })

  it.each(['2026-08-25T08:14:00Z', '2026-08-25T08:14:00.000+08:00'])(
    'accepts the ISO datetime %j',
    (writtenAt) => {
      expect(EntryCreateSchema.parse({ body: 'x', writtenAt }).writtenAt).toBe(writtenAt)
    },
  )

  it.each(['2026-08-25', 'yesterday', '2026-13-01T00:00:00Z'])(
    'rejects the invalid datetime %j',
    (writtenAt) => {
      expect(errorsOf(EntryCreateSchema.safeParse({ body: 'x', writtenAt })).writtenAt).toBe(
        'Enter a valid date and time.',
      )
    },
  )

  it('trims tags and removes case-insensitive duplicates, keeping the first spelling', () => {
    const { tags } = EntryCreateSchema.parse({
      body: 'x',
      tags: ['Gratitude', ' gratitude ', 'Work', 'GRATITUDE'],
    })
    expect(tags).toEqual(['Gratitude', 'Work'])
  })

  it('rejects an empty tag name', () => {
    expect(errorsOf(EntryCreateSchema.safeParse({ body: 'x', tags: ['  '] })).tags).toBe(
      'Tag names cannot be empty.',
    )
  })

  it(`accepts a ${TAG_NAME_MAX_LENGTH}-character tag and rejects one longer`, () => {
    const max = 'a'.repeat(TAG_NAME_MAX_LENGTH)
    expect(EntryCreateSchema.safeParse({ body: 'x', tags: [max] }).success).toBe(true)
    expect(EntryCreateSchema.safeParse({ body: 'x', tags: [`${max}a`] }).success).toBe(false)
  })
})

describe('EntryUpdateSchema', () => {
  it('applies no defaults, so omitted fields stay unchanged', () => {
    expect(EntryUpdateSchema.parse({ body: 'Hello' })).toEqual({ body: 'Hello' })
  })

  it.each(['', '   ', null])('turns a cleared title %j into null', (title) => {
    expect(EntryUpdateSchema.parse({ title }).title).toBeNull()
  })

  it('trims the title', () => {
    expect(EntryUpdateSchema.parse({ title: '  Evening  ' }).title).toBe('Evening')
  })

  it.each([{}, { timeZone: 'Asia/Manila' }])('rejects %j: nothing to change', (input) => {
    expect(errorsOf(EntryUpdateSchema.safeParse(input))).toEqual({
      '': 'Change at least one of title, body, writtenAt or tags.',
    })
  })

  it('accepts an empty tag list, which clears every tag', () => {
    expect(EntryUpdateSchema.parse({ tags: [] })).toEqual({ tags: [] })
  })

  it('de-duplicates tags', () => {
    expect(EntryUpdateSchema.parse({ tags: ['Work', 'work'] }).tags).toEqual(['Work'])
  })

  it('still rejects a whitespace-only body', () => {
    expect(EntryUpdateSchema.safeParse({ body: '  ' }).success).toBe(false)
  })
})

describe('EntryIdSchema', () => {
  it('accepts a uuid', () => {
    expect(EntryIdSchema.parse({ id: uuid })).toEqual({ id: uuid })
  })

  it('rejects an id that is not a uuid', () => {
    expect(EntryIdSchema.safeParse({ id: '123' }).success).toBe(false)
  })
})

describe('EntryListQuerySchema', () => {
  it('defaults skip to 0 and take to 20', () => {
    expect(EntryListQuerySchema.parse({})).toEqual({ skip: 0, take: 20 })
  })

  it('coerces numbers from query-string values', () => {
    expect(EntryListQuerySchema.parse({ skip: '5', take: '50' })).toMatchObject({
      skip: 5,
      take: 50,
    })
  })

  it.each([{ take: '0' }, { take: '101' }, { skip: '-1' }, { skip: '1.5' }, { skip: 'abc' }])(
    'rejects out-of-range paging %j',
    (query) => {
      expect(EntryListQuerySchema.safeParse(query).success).toBe(false)
    },
  )

  it('trims searchText and drops it when blank', () => {
    expect(EntryListQuerySchema.parse({ searchText: '  coffee ' }).searchText).toBe('coffee')
    expect(EntryListQuerySchema.parse({ searchText: '   ' }).searchText).toBeUndefined()
  })

  it('requires tagId to be a uuid', () => {
    expect(EntryListQuerySchema.parse({ tagId: uuid }).tagId).toBe(uuid)
    expect(EntryListQuerySchema.safeParse({ tagId: 'work' }).success).toBe(false)
  })

  it('rejects dates that are not YYYY-MM-DD', () => {
    expect(EntryListQuerySchema.safeParse({ entryStartDate: '08/25/2026' }).success).toBe(false)
  })

  it.each([
    { entryStartDate: '2026-08-25', entryEndDate: '2026-08-25' },
    { entryStartDate: '2026-08-01', entryEndDate: '2026-08-31' },
    { entryStartDate: '2026-08-25' },
    { entryEndDate: '2026-08-25' },
  ])('accepts the date range %j', (query) => {
    expect(EntryListQuerySchema.safeParse(query).success).toBe(true)
  })

  it('rejects a start date after the end date, on entryEndDate', () => {
    expect(
      errorsOf(
        EntryListQuerySchema.safeParse({
          entryStartDate: '2026-08-26',
          entryEndDate: '2026-08-25',
        }),
      ),
    ).toEqual({ entryEndDate: 'The end date must be on or after the start date.' })
  })
})

describe('EntrySchema / EntryListSchema', () => {
  const entry = {
    id: uuid,
    title: null,
    body: 'Hello',
    mood: null,
    summary: null,
    frameworkId: null,
    writtenAt: '2026-08-25T00:14:00.000Z',
    entryDate: '2026-08-25',
    createdAt: '2026-08-25T00:14:00.000Z',
    updatedAt: '2026-08-25T00:14:00.000Z',
    tags: [{ id: uuid, name: 'Gratitude' }],
  }

  it('parses an entry as it arrives over JSON', () => {
    expect(EntrySchema.parse(entry)).toEqual(entry)
  })

  it('rejects a Date object where an ISO string is expected', () => {
    expect(EntrySchema.safeParse({ ...entry, writtenAt: new Date() }).success).toBe(false)
  })

  it('parses a list with its total', () => {
    expect(EntryListSchema.parse({ entries: [entry], total: 1 })).toEqual({
      entries: [entry],
      total: 1,
    })
  })

  describe('MoodSchema / EntryAnalysisSchema', () => {
    it.each([
      'CALM',
      'GRATEFUL',
      'HAPPY',
      'HOPEFUL',
      'NEUTRAL',
      'ANXIOUS',
      'STRESSED',
      'SAD',
      'FRUSTRATED',
    ])('accepts the %s mood', (mood) => {
      expect(MoodSchema.parse(mood)).toBe(mood)
    })

    it('rejects a mood outside the Prisma enum', () => {
      expect(MoodSchema.safeParse('REFLECTIVE').success).toBe(false)
    })

    it('parses analysis output with normalized tag names', () => {
      expect(
        EntryAnalysisSchema.parse({
          mood: 'GRATEFUL',
          summary: '  A quiet morning brought a sense of gratitude.  ',
          suggestedTags: ['Morning', ' morning ', 'Home'],
        }),
      ).toEqual({
        mood: 'GRATEFUL',
        summary: 'A quiet morning brought a sense of gratitude.',
        suggestedTags: ['Morning', 'Home'],
      })
    })

    it('rejects empty or overlong summaries', () => {
      const analysis = { mood: 'CALM', suggestedTags: [] }
      expect(EntryAnalysisSchema.safeParse({ ...analysis, summary: '  ' }).success).toBe(false)
      expect(
        EntryAnalysisSchema.safeParse({
          ...analysis,
          summary: 'a'.repeat(ENTRY_SUMMARY_MAX_LENGTH + 1),
        }).success,
      ).toBe(false)
    })

    it('uses the existing tag name validation rules', () => {
      expect(
        EntryAnalysisSchema.safeParse({
          mood: 'CALM',
          summary: 'A short summary.',
          suggestedTags: [''],
        }).success,
      ).toBe(false)
    })
  })
})
