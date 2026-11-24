import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CompanionChat } from '@/components/CompanionChat'
import {
  INTERRUPTED_REPLY,
  readConversation,
  storeConversation,
} from '@/src/lib/chat/companionConversations'
import { AI_PANEL } from '@/src/lib/constants'
import type { ReflectionChatMessage } from '@/src/lib/chat/useReflectionChat'
import { CHAT_MAX_DRAFT_LENGTH, CHAT_MAX_MESSAGE_LENGTH } from '@/src/server/chat/schemas'

const chat = vi.hoisted(() => ({
  messages: [] as ReflectionChatMessage[],
  status: 'ready' as 'ready' | 'submitted' | 'streaming',
  sendMessage: vi.fn(),
  retryMessage: vi.fn(),
  stop: vi.fn(),
  useReflectionChat: vi.fn(),
}))

// The shared hook has its own tests (S4-01). Mocking it here keeps these about the panel.
vi.mock('@/src/lib/chat/useReflectionChat', () => ({
  useReflectionChat: chat.useReflectionChat.mockImplementation(() => chat),
}))

const user = (content: string): ReflectionChatMessage => ({
  id: `user-${content}`,
  role: 'user',
  content,
})
const assistant = (content: string, error?: string): ReflectionChatMessage => ({
  id: `assistant-${content || 'pending'}`,
  role: 'assistant',
  content,
  error,
})

const input = () => screen.getByRole('textbox', { name: 'Ask the companion' }) as HTMLInputElement
const sendButton = () => screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement
const DRAFT = { title: 'A slower morning', body: 'Coffee, no phone.' }

beforeEach(() => {
  chat.messages = []
  chat.status = 'ready'
  chat.sendMessage.mockReset()
  chat.retryMessage.mockReset()
  chat.useReflectionChat.mockClear()
})

afterEach(cleanup)

describe('CompanionChat', () => {
  it('introduces itself before the first message', () => {
    render(<CompanionChat draft={DRAFT} />)
    expect(screen.getByText(AI_PANEL.companionIntro)).toBeTruthy()
    expect(screen.queryByRole('log')).toBeNull()
  })

  describe('the entry draft', () => {
    it('gives the shared chat hook the current title and body', () => {
      render(<CompanionChat draft={{ title: '  A quiet day ', body: ' I took a walk. ' }} />)

      expect(chat.useReflectionChat).toHaveBeenLastCalledWith(
        expect.objectContaining({ entryDraft: { title: 'A quiet day', body: 'I took a walk.' } }),
      )
    })

    it('truncates a long body to CHAT_MAX_DRAFT_LENGTH before handing it over', () => {
      render(<CompanionChat draft={{ title: '', body: 'b'.repeat(CHAT_MAX_DRAFT_LENGTH + 800) }} />)

      const { entryDraft } = chat.useReflectionChat.mock.lastCall![0]
      expect(entryDraft.body).toHaveLength(CHAT_MAX_DRAFT_LENGTH)
      expect(entryDraft.title).toBeUndefined()
    })

    it('follows the draft as it changes', () => {
      const { rerender } = render(<CompanionChat draft={{ title: 'T', body: 'one' }} />)
      rerender(<CompanionChat draft={{ title: 'T', body: 'one two' }} />)

      expect(chat.useReflectionChat.mock.lastCall![0].entryDraft.body).toBe('one two')
    })
  })

  describe('carrying the conversation over', () => {
    const KEY = 'entry-1'
    /** Renders, reading `initialMessages` on mount as the real hook does. */
    function renderReadingInitial(conversationId?: string) {
      let initial: ReflectionChatMessage[] | undefined
      chat.useReflectionChat.mockImplementationOnce(
        ({ initialMessages }: { initialMessages: () => ReflectionChatMessage[] }) => {
          initial = initialMessages()
          return chat
        },
      )
      render(<CompanionChat draft={DRAFT} conversationId={conversationId} />)
      return initial
    }

    it('starts from the conversation stored under its id', () => {
      storeConversation(KEY, [user('Hi'), assistant('Hello.')])
      expect(renderReadingInitial(KEY)).toEqual([user('Hi'), assistant('Hello.')])
    })

    it('starts empty without an id', () => {
      expect(renderReadingInitial()).toEqual([])
    })

    it('stores the conversation while mounted, and clears it on unmount', () => {
      chat.messages = [user('Hi'), assistant('Hello.')]
      const { unmount } = render(<CompanionChat draft={DRAFT} conversationId={KEY} />)

      expect(readConversation(KEY)).toEqual([user('Hi'), assistant('Hello.')])
      unmount()
      expect(readConversation(KEY)).toEqual([])
    })

    it('stores a reply still streaming as interrupted, so it can be retried later', () => {
      chat.messages = [user('Hi'), assistant('Hel')]
      chat.status = 'streaming'
      render(<CompanionChat draft={DRAFT} conversationId={KEY} />)

      expect(readConversation(KEY).at(-1)).toEqual(assistant('Hel', INTERRUPTED_REPLY))
    })
  })

  it('shows the conversation', () => {
    chat.messages = [user('What stands out?'), assistant('The quiet.')]
    render(<CompanionChat draft={DRAFT} />)

    expect(screen.getByRole('log', { name: 'Conversation' }).textContent).toBe(
      'What stands out?The quiet.',
    )
    expect(screen.queryByText(AI_PANEL.companionIntro)).toBeNull()
  })

  describe('sending', () => {
    it('sends the typed message and clears the field', () => {
      render(<CompanionChat draft={DRAFT} />)

      fireEvent.change(input(), { target: { value: 'What should I write next?' } })
      fireEvent.click(sendButton())

      expect(chat.sendMessage).toHaveBeenCalledWith('What should I write next?')
      expect(input().value).toBe('')
    })

    it('sends on Enter', () => {
      render(<CompanionChat draft={DRAFT} />)
      fireEvent.change(input(), { target: { value: 'Hello' } })

      fireEvent.submit(input().closest('form')!)

      expect(chat.sendMessage).toHaveBeenCalledWith('Hello')
    })

    it('does not send an empty message', () => {
      render(<CompanionChat draft={DRAFT} />)
      fireEvent.change(input(), { target: { value: '   ' } })

      expect(sendButton().disabled).toBe(true)
      fireEvent.submit(input().closest('form')!)
      expect(chat.sendMessage).not.toHaveBeenCalled()
    })

    it('limits a message to what the API accepts', () => {
      render(<CompanionChat draft={DRAFT} />)
      expect(input().maxLength).toBe(CHAT_MAX_MESSAGE_LENGTH)
    })

    it.each(['submitted', 'streaming'] as const)(
      'does not send while the status is %s',
      (status) => {
        chat.status = status
        chat.messages = [user('Earlier question'), assistant('')]
        render(<CompanionChat draft={DRAFT} />)
        fireEvent.change(input(), { target: { value: 'Another' } })

        expect(sendButton().disabled).toBe(true)
        fireEvent.submit(input().closest('form')!)
        expect(chat.sendMessage).not.toHaveBeenCalled()
      },
    )
  })

  describe('waiting and failures', () => {
    it('shows "Thinking…" until the first words of the reply arrive', () => {
      chat.status = 'submitted'
      chat.messages = [user('Hello'), assistant('')]
      render(<CompanionChat draft={DRAFT} />)

      expect(screen.getByRole('status').textContent).toBe('Thinking…')
    })

    it('stops showing "Thinking…" once the reply is coming in', () => {
      chat.status = 'streaming'
      chat.messages = [user('Hello'), assistant('Hi th')]
      render(<CompanionChat draft={DRAFT} />)

      expect(screen.queryByText('Thinking…')).toBeNull()
      expect(screen.getByText('Hi th')).toBeTruthy()
    })

    it('shows the hook’s error quietly, with a retry for that reply', () => {
      chat.messages = [
        user('Hello'),
        assistant('', "You've reached the AI limit for now, try again later."),
      ]
      render(<CompanionChat draft={DRAFT} />)

      expect(screen.getByRole('status').textContent).toBe(
        "You've reached the AI limit for now, try again later.",
      )
      expect(screen.queryByText('Thinking…')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
      expect(chat.retryMessage).toHaveBeenCalledWith('assistant-pending')
    })

    it('keeps a partial reply visible next to its error', () => {
      chat.messages = [user('Hello'), assistant('Half an ans', 'The model stopped.')]
      render(<CompanionChat draft={DRAFT} />)

      expect(screen.getByText('Half an ans')).toBeTruthy()
      expect(screen.getByRole('status').textContent).toBe('The model stopped.')
    })

    it('never uses an alert, and still lets the user keep typing', () => {
      chat.messages = [user('Hello'), assistant('', 'Something went wrong.')]
      render(<CompanionChat draft={DRAFT} />)

      expect(screen.queryByRole('alert')).toBeNull()
      expect(input().disabled).toBe(false)
    })

    it('disables the retry while another reply is being fetched', () => {
      chat.status = 'streaming'
      chat.messages = [assistant('', 'Old error'), user('Again'), assistant('')]
      render(<CompanionChat draft={DRAFT} />)

      expect(
        (screen.getByRole('button', { name: 'Try again' }) as HTMLButtonElement).disabled,
      ).toBe(true)
    })
  })
})
