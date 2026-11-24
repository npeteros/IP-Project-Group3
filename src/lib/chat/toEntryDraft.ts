import {
  CHAT_MAX_DRAFT_LENGTH,
  CHAT_MAX_DRAFT_TITLE_LENGTH,
  type ChatRequestInput,
} from '@/src/server/chat/schemas'

/** The editor's current title and body as an `entryDraft`, cut to what the chat API accepts. */
export function toEntryDraft({
  title,
  body,
}: {
  title: string
  body: string
}): ChatRequestInput['entryDraft'] {
  return {
    title: title.trim().slice(0, CHAT_MAX_DRAFT_TITLE_LENGTH) || undefined,
    body: body.trim().slice(0, CHAT_MAX_DRAFT_LENGTH) || undefined,
  }
}
