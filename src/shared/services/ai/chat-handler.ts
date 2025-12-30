/**
 * AI Chat Handler
 *
 * Server-side handler for chat requests.
 * This is the logic your API route should call.
 */

import { chat, toServerSentEventsStream } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { saveToLibraryTool, listLibraryTool, searchLibraryTool } from './tools'
import { saveSkill, listSkills } from '../library/server-functions'
import type { SaveSkillInput } from '../library/types'

export interface ChatRequest {
  /** Chat messages */
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  /** The content being discussed (from transcript) */
  context: {
    type: 'tool_use' | 'tool_result' | 'text'
    toolName?: string
    content: string
  }
  /** Project ID for saving skills */
  projectId: string
  /** Session ID where this content came from */
  sessionId: string
}

/**
 * System prompt for the chat
 */
function buildSystemPrompt(context: ChatRequest['context']): string {
  return `You are a helpful assistant analyzing a Claude Code conversation transcript.

The user is looking at this specific content from the transcript:

<context>
Type: ${context.type}${context.toolName ? `\nTool: ${context.toolName}` : ''}
Content:
${context.content}
</context>

Your role:
1. Answer questions about this specific content
2. Explain code, patterns, or decisions
3. Help the user understand costs, timing, or efficiency
4. When asked to save something, use the saveToLibrary tool

Keep responses concise and focused on the specific content shown.`
}

/**
 * Handle a chat request and return a streaming response
 */
export async function handleChatRequest(request: ChatRequest): Promise<ReadableStream> {
  const systemPrompt = buildSystemPrompt(request.context)

  // Define types for tool args
  type SaveToLibraryArgs = {
    name: string
    description: string
    tags: string[]
    notes?: string
  }

  type ListLibraryArgs = {
    query?: string
    tags?: string[]
    limit?: number
  }

  type SearchLibraryArgs = {
    query: string
  }

  // Create server-side tool implementations
  const saveToLibraryServer = saveToLibraryTool.server(async (rawArgs) => {
    const args = rawArgs as SaveToLibraryArgs
    try {
      const skillInput: SaveSkillInput = {
        name: args.name,
        description: args.description,
        tags: args.tags,
        notes: args.notes,
        content: request.context.content,
        source: {
          projectId: request.projectId,
          sessionId: request.sessionId,
          type: request.context.type,
          toolName: request.context.toolName,
        },
      }

      const result = await saveSkill({
        data: {
          projectId: request.projectId,
          skill: skillInput,
        },
      })

      return {
        success: true,
        skillId: result.id,
        message: `Saved "${args.name}" to your library with tags: ${args.tags.join(', ')}`,
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  })

  const listLibraryServer = listLibraryTool.server(async (rawArgs) => {
    const args = rawArgs as ListLibraryArgs
    try {
      const skills = await listSkills({
        data: {
          projectId: request.projectId,
          params: {
            query: args.query,
            tags: args.tags,
            limit: args.limit,
          },
        },
      })

      return {
        skills: skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          tags: s.tags,
          createdAt: s.createdAt,
        })),
        total: skills.length,
      }
    } catch {
      return { skills: [], total: 0 }
    }
  })

  const searchLibraryServer = searchLibraryTool.server(async (rawArgs) => {
    const args = rawArgs as SearchLibraryArgs
    try {
      const skills = await listSkills({
        data: {
          projectId: request.projectId,
          params: { query: args.query, limit: 10 },
        },
      })

      return {
        skills: skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          tags: s.tags,
          relevance: `Matches search for "${args.query}"`,
        })),
      }
    } catch {
      return { skills: [] }
    }
  })

  // Prepend system message to messages array
  const messagesWithSystem = [
    { role: 'user' as const, content: `[System Context]\n${systemPrompt}\n\n[User Message]\n${request.messages[0]?.content || ''}` },
    ...request.messages.slice(1),
  ]

  // Run chat with streaming
  const stream = chat({
    adapter: anthropicText('claude-sonnet-4', {
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
    messages: messagesWithSystem,
    tools: [saveToLibraryServer, listLibraryServer, searchLibraryServer],
  })

  return toServerSentEventsStream(stream)
}

/**
 * Create an HTTP Response from the chat stream
 */
export async function createChatResponse(request: ChatRequest): Promise<Response> {
  const stream = await handleChatRequest(request)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}