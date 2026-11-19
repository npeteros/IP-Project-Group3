import { describe, expect, it } from 'vitest'
import { toEntryDraft } from '@/src/lib/chat/toEntryDraft'
import { CHAT_MAX_DRAFT_LENGTH, CHAT_MAX_DRAFT_TITLE_LENGTH } from '@/src/server/chat/schemas'

describe('toEntryDraft', () => {
  it('trims the title and body', () => {
    expect(toEntryDraft({ title: '  A quiet day ', body: '\nWent for a walk.  ' })).toEqual({
      title: 'A quiet day',
      body: 'Went for a walk.',
    })
  })

  it('cuts the body to CHAT_MAX_DRAFT_LENGTH and the title to its limit', () => {
    const draft = toEntryDraft({
      title: 't'.repeat(CHAT_MAX_DRAFT_TITLE_LENGTH + 40),
      body: 'b'.repeat(CHAT_MAX_DRAFT_LENGTH + 500),
    })

    expect(draft?.title).toHaveLength(CHAT_MAX_DRAFT_TITLE_LENGTH)
    expect(draft?.body).toHaveLength(CHAT_MAX_DRAFT_LENGTH)
  })

  it('leaves out a blank title or body', () => {
    expect(toEntryDraft({ title: '  ', body: '' })).toEqual({ title: undefined, body: undefined })
  })
})
