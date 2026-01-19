import type {
  Message,
  ContentBlock,
  RawLogEntry,
  RawContentBlock,
  PaginatedMessages,
  SessionStats,
  RawSummaryEntry,
  TokenUsage,
} from '@/shared/types/transcripts'

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
  let firstTimestamp: string | null = null
  let lastTimestamp: string | null = null

  const entries: RawLogEntry[] = []

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)

      // Check for summary entry
      if (parsed.type === 'summary') {
        summary = (parsed as RawSummaryEntry).summary || ''
        continue
      }

      // Skip non-message and non-progress entries
      if (parsed.type !== 'user' && parsed.type !== 'assistant' && parsed.type !== 'progress') {
        continue
      }

      if (parsed.type === 'progress') {
        entries.push(parsed as RawLogEntry)
        continue
      }

      const entry = parsed as RawLogEntry
      if (!entry.message) continue

      entries.push(entry)

      // Track first and last timestamps
      if (!firstTimestamp) {
        firstTimestamp = entry.timestamp
      }
      lastTimestamp = entry.timestamp

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

  // Calculate duration from first and last message
  let durationMs = 0
  if (firstTimestamp && lastTimestamp) {
    const firstDate = new Date(firstTimestamp).getTime()
    const lastDate = new Date(lastTimestamp).getTime()
    durationMs = Math.max(0, lastDate - firstDate)
  }

  return {
    messages,
    stats: {
      promptCount,
      messageCount,
      toolCallCount,
      totalCostUsd: calculatedCost || totalCostUsd,
      totalPages,
      durationMs,
      startTimestamp: firstTimestamp || undefined,
      endTimestamp: lastTimestamp || undefined,
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
  // Filter for user/assistant messages and progress entries
  const activeEntries = entries.filter(
    (entry) =>
      entry.type === 'user' || entry.type === 'assistant' || entry.type === 'progress'
  )

  const messages: Message[] = []
  const toolUseMap: Record<string, ContentBlock> = {}

  // First pass: Create messages and populate toolUseMap
  activeEntries.forEach((entry) => {
    if (entry.type === 'progress') {
      if (entry.data) {
        messages.push({
          uuid: entry.uuid,
          type: 'progress',
          role: 'assistant', // Render as assistant for consistency
          timestamp: entry.timestamp,
          content: [
            {
              type: 'progress',
              text: entry.data.prompt,
              agentId: entry.data.agentId,
              toolUseID: entry.data.toolUseID || (entry as any).data.toolUseId,
              timestamp: entry.timestamp,
            },
          ],
        })
      }
      return
    }

    const msg = entry.message
    if (!msg) return

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

    const content = normalizeContent(msg.content)

    // Store tool_use blocks in the map for progress association
    // Also check for agentId in tool_results
    content.forEach(block => {
      if (block.type === 'tool_use' && block.id) {
        toolUseMap[block.id] = block
        // Check if agentId is already in the input (sometimes happens in certain versions of the log)
        if (block.name === 'Task' && (block.input as any)?.agentId) {
          block.agentId = (block.input as any).agentId
        }
      }
      if (block.type === 'tool_result' && block.tool_use_id) {
        const toolUseBlock = toolUseMap[block.tool_use_id]
        if (toolUseBlock) {
          toolUseBlock.result = block.content

          // 1. Check if there's an agentId in the raw entry's toolUseResult metadata
          if ((entry as any).toolUseResult?.agentId) {
            toolUseBlock.agentId = (entry as any).toolUseResult.agentId
          }

          // 2. Try to extract agentId from the tool_result content (using aggressive deep scan)
          if (!toolUseBlock.agentId) {
            const searchStr = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);

            const agentIdMatch = searchStr.match(/agent-([a-f0-9]+)/i) ||
              searchStr.match(/Agent ID[:\s]+([a-f0-9]+)/i) ||
              searchStr.match(/agentId[:\s]+([a-f0-9]+)/i);

            if (agentIdMatch) {
              const id = agentIdMatch[1];
              toolUseBlock.agentId = id.startsWith('agent-') ? id : `agent-${id}`;
            }
          }
        }
      }
    })

    messages.push({
      uuid: entry.uuid,
      type: entry.type as any,
      role: entry.type as any,
      timestamp: entry.timestamp,
      content,
      model: msg.model,
      usage,
    })
  })

  // Second pass: Associate progress with tool calls and extract agentId from progress metadata
  activeEntries.forEach((entry) => {
    if (entry.type !== 'progress' || !entry.data) return

    // Safety check for parentToolUseID in various possible locations
    const parentId = (entry as any).parentToolUseID ||
      (entry as any).data.parentToolUseID ||
      (entry as any).data.toolUseId; // Some logs use lowercase id

    if (parentId && toolUseMap[parentId]) {
      const toolBlock = toolUseMap[parentId]

      // Aggressively capture agentId from any progress data field
      const extractedId = entry.data.agentId ||
        (entry as any).agentId ||
        (entry as any).data.agentID ||
        (entry as any).data.agent_id;

      if (extractedId && !toolBlock.agentId) {
        toolBlock.agentId = extractedId.startsWith('agent-') ? extractedId : `agent-${extractedId}`;
      }

      if (!toolBlock.progress) {
        toolBlock.progress = []
      }

      toolBlock.progress.push({
        uuid: entry.uuid,
        timestamp: entry.timestamp,
        type: entry.data.type,
        prompt: entry.data.prompt,
        agentId: entry.data.agentId,
        toolUseID: entry.data.toolUseID || parentId,
        parentToolUseID: parentId,
        ...entry.data
      })
    }
  })

  return messages
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
    hasMore: currentPage < totalPages,
  }
}

/**
 * Generate a summary from the first user message
 */
export function generateSummary(messages: Message[], maxLength: number = 100): string {
  const firstUserMessage = messages.find((m) => m.type === 'user')
  if (!firstUserMessage) return 'Empty session'

  const textContent = firstUserMessage.content
    .filter((block: ContentBlock): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block: { text: string }) => block.text)
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
      if (block.type === 'tool_use' && block.name) {
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
    .filter((block: ContentBlock): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('\n')
}

/**
 * Check if a message contains only tool results
 */
export function isToolResultOnly(message: Message): boolean {
  return message.content.every(
    (block: ContentBlock) => block.type === 'tool_result' || block.type === 'tool_use'
  )
}