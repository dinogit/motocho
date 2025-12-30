import { createFileRoute } from '@tanstack/react-router'
import { createChatResponse } from '@/shared/services/ai/chat-handler'
import type { ChatRequest } from '@/shared/services/ai/chat-handler'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json() as ChatRequest
        return createChatResponse(body)
      },
    },
  },
})
