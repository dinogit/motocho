/**
 * Tauri-based AI Chat Client
 *
 * Replaces HTTP streaming with Tauri event-based streaming.
 * Streams chat responses via Tauri events instead of SSE.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatStreamEvent {
  type: 'text' | 'tool_use' | 'complete' | 'error'
  content?: string
  delta?: string
}

export interface ChatResponse {
  content: string
  isComplete: boolean
}

// ============================================================================
// Chat Client
// ============================================================================

/**
 * Start a chat stream session with Claude
 * Streams responses via Tauri events
 */
export async function startChat(
  messages: ChatMessage[],
  context?: string,
  projectId?: string,
  sessionId?: string,
): Promise<AsyncIterable<string>> {
  // Start the chat command (returns a promise)
  const chatPromise = invoke<string>('start_chat', {
    messages,
    context,
    projectId,
    sessionId,
  })

  // Return an async iterable that yields streaming chunks
  return {
    async *[Symbol.asyncIterator]() {
      // Listen for chat-stream events
      const unlisten = await listen<ChatStreamEvent>('chat-stream', (event) => {
        // Events will be yielded as they arrive
      })

      try {
        // Collect all chunks
        let buffer = ''

        const unlistenFn = await listen<ChatStreamEvent>('chat-stream', (event) => {
          if (event.payload.type === 'text' && event.payload.delta) {
            buffer += event.payload.delta
          }
        })

        // Wait for the chat to complete
        const result = await chatPromise

        // Clean up listener
        unlistenFn()

        // Yield the final result
        yield result
      } catch (error) {
        unlisten()
        throw error
      }
    },
  }
}

/**
 * Stream chat with real-time event handling
 * Provides callbacks for different event types
 */
export async function streamChat(
  messages: ChatMessage[],
  options: {
    context?: string
    projectId?: string
    sessionId?: string
    onText?: (chunk: string) => void
    onComplete?: (content: string) => void
    onError?: (error: string) => void
  },
): Promise<string> {
  // Listen for events
  const unlistenText = await listen<ChatStreamEvent>('chat-stream', (event) => {
    switch (event.payload.type) {
      case 'text':
        if (event.payload.delta && options.onText) {
          options.onText(event.payload.delta)
        }
        break
      case 'complete':
        if (event.payload.content && options.onComplete) {
          options.onComplete(event.payload.content)
        }
        break
      case 'error':
        if (event.payload.content && options.onError) {
          options.onError(event.payload.content)
        }
        break
    }
  })

  try {
    // Start the chat
    const result = await invoke<string>('start_chat', {
      messages,
      context: options.context,
      projectId: options.projectId,
      sessionId: options.sessionId,
    })

    return result
  } finally {
    // Clean up listener
    unlistenText()
  }
}

/**
 * Convert ReadableStream-like interface to async iterable for compatibility
 */
export function createStreamFromChat(
  messages: ChatMessage[],
  context?: string,
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      try {
        await streamChat(messages, {
          context,
          onText: (chunk) => {
            controller.enqueue(chunk)
          },
          onComplete: () => {
            controller.close()
          },
          onError: (error) => {
            controller.error(new Error(error))
          },
        })
      } catch (error) {
        controller.error(error)
      }
    },
  })
}
