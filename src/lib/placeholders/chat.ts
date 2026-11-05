// Placeholder conversation until chat is wired to the Mastra agent.

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'What themes keep coming up in my entries about work?',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content:
      "Over the last month, deadline pressure and feeling under-appreciated come up most — often on Mondays. You've also mentioned wanting clearer boundaries three times.",
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'That tracks. Any suggestion?',
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content:
      'Sunday evenings seem to set the tone — worth trying a short wind-down ritual before the week starts?',
  },
]
