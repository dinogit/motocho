import type {
  Message,
  ContentBlock,
  RawLogEntry,
  RawContentBlock,
  PaginatedMessages,
  SessionStats,
  RawSummaryEntry,
  TokenUsage,
} from './types'

// Anthropic pricing per million tokens (as of Dec 2025)
// Source: https://claude.com/pricing
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  // Opus 4.5 - Most intelligent model
  'claude-opus-4-5-20251101': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  // Sonnet 4.5 - Balanced (using ≤200K pricing)
  'claude-sonnet-4-5-20241022': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-sonnet-4-20250514': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  // Legacy Sonnet 3.5
  'claude-3-5-sonnet-20241022': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  // Haiku 4.5 - Fastest, most cost-efficient
  'claude-haiku-4-5-20241022': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  // Legacy Haiku 3.5
  'claude-3-5-haiku-20241022': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  // Default to Sonnet pricing
  'default': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
}

function calculateCost(
  model: string | undefined,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number
): number {
  const pricing = PRICING[model || ''] || PRICING['default']

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const cacheWriteCost = (cacheCreationTokens / 1_000_000) * pricing.cacheWrite
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheRead

  return inputCost + outputCost + cacheWriteCost + cacheReadCost
}

export interface ParsedSession {
  messages: Message[]
  stats: SessionStats
  summary: string
}

/**
 * Parse JSONL content into messages and extract stats
 */
export function parseJsonlWithStats(content: string, perPage: number = 20): ParsedSession {
  const lines = content.split('\n').filter((line) => line.trim())

  let summary = ''
  let promptCount = 0
  let messageCount = 0
  let toolCallCount = 0
  let totalCostUsd = 0

  const entries: RawLogEntry[] = []

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)

      // Check for summary entry
      if (parsed.type === 'summary') {
        summary = (parsed as RawSummaryEntry).summary || ''
        continue
      }

      // Skip non-message entries
      if (parsed.type !== 'user' && parsed.type !== 'assistant') {
        continue
      }

      const entry = parsed as RawLogEntry
      if (!entry.message) continue

      entries.push(entry)

      // Count stats
      if (entry.type === 'user') {
        promptCount++
      }
      messageCount++

      if (entry.costUsd) {
        totalCostUsd += entry.costUsd
      }

      // Count tool calls
      const msgContent = entry.message.content
      if (Array.isArray(msgContent)) {
        for (const block of msgContent) {
          if (block.type === 'tool_use') {
            toolCallCount++
          }
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  const messages = entriesToMessages(entries)
  const totalPages = Math.ceil(messages.length / perPage)

  // Calculate total cost from parsed messages
  const calculatedCost = messages.reduce((sum, msg) => sum + (msg.usage?.costUsd || 0), 0)

  return {
    messages,
    stats: {
      promptCount,
      messageCount,
      toolCallCount,
      totalCostUsd: calculatedCost || totalCostUsd,
      totalPages,
    },
    summary: summary || generateSummary(messages),
  }
}

/**
 * Parse JSONL content into an array of messages
 */
export function parseJsonl(content: string): Message[] {
  const lines = content.split('\n').filter((line) => line.trim())
  const entries: RawLogEntry[] = []

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as RawLogEntry
      entries.push(entry)
    } catch {
      console.warn('Failed to parse JSONL line:', line.substring(0, 100))
    }
  }

  return entriesToMessages(entries)
}

/**
 * Convert raw log entries to structured messages
 */
function entriesToMessages(entries: RawLogEntry[]): Message[] {
  // Filter for user/assistant messages only
  // Note: parentUuid links conversation chain, NOT sub-agent filtering
  // Agent messages are in separate files (agent-*.jsonl) which are excluded at file level
  const mainEntries = entries.filter(
    (entry) =>
      (entry.type === 'user' || entry.type === 'assistant') &&
      entry.message
  )

  return mainEntries.map((entry) => {
    const msg = entry.message
    let usage: TokenUsage | undefined

    if (msg.usage) {
      const inputTokens = msg.usage.input_tokens || 0
      const outputTokens = msg.usage.output_tokens || 0
      const cacheCreationTokens = msg.usage.cache_creation_input_tokens || 0
      const cacheReadTokens = msg.usage.cache_read_input_tokens || 0
      const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens

      usage = {
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens,
        totalTokens,
        costUsd: calculateCost(msg.model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens),
      }
    }

    return {
      uuid: entry.uuid,
      type: entry.type,
      timestamp: entry.timestamp,
      content: normalizeContent(msg.content),
      model: msg.model,
      usage,
    }
  })
}

/**
 * Normalize content to always be an array of content blocks
 */
function normalizeContent(
  content: string | RawContentBlock[]
): ContentBlock[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }

  return content.map((block) => {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text }
      case 'tool_use':
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        }
      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content: block.content,
          is_error: block.is_error,
        }
      case 'thinking':
        return { type: 'thinking', thinking: block.thinking }
      case 'image':
        return { type: 'image', source: block.source }
      default:
        return { type: 'text', text: JSON.stringify(block) }
    }
  }) as ContentBlock[]
}

/**
 * Paginate messages (newest first)
 */
export function paginateMessages(
  messages: Message[],
  page: number,
  perPage: number = 5
): PaginatedMessages {
  // Reverse to show newest messages first
  const reversed = [...messages].reverse()

  const totalMessages = reversed.length
  const totalPages = Math.ceil(totalMessages / perPage)
  const currentPage = Math.max(1, Math.min(page, totalPages))

  const startIndex = (currentPage - 1) * perPage
  const endIndex = startIndex + perPage

  return {
    messages: reversed.slice(startIndex, endIndex),
    totalPages,
    currentPage,
    totalMessages,
  }
}

/**
 * Generate a summary from the first user message
 */
export function generateSummary(messages: Message[], maxLength: number = 100): string {
  const firstUserMessage = messages.find((m) => m.type === 'user')
  if (!firstUserMessage) return 'Empty session'

  const textContent = firstUserMessage.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join(' ')

  if (textContent.length <= maxLength) {
    return textContent
  }

  return textContent.substring(0, maxLength - 3) + '...'
}

/**
 * Extract tool usage statistics from messages
 */
export function extractToolStats(messages: Message[]): Record<string, number> {
  const stats: Record<string, number> = {}

  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === 'tool_use') {
        stats[block.name] = (stats[block.name] || 0) + 1
      }
    }
  }

  return stats
}

/**
 * Get text content from a message
 */
export function getMessageText(message: Message): string {
  return message.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

/**
 * Check if a message contains only tool results
 */
export function isToolResultOnly(message: Message): boolean {
  return message.content.every(
    (block) => block.type === 'tool_result' || block.type === 'tool_use'
  )
}