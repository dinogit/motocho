// Types for Claude Code transcripts

export interface Project {
  id: string
  path: string
  displayName: string
  sessionCount: number
  lastModified: Date
}

/**
 * Project efficiency statistics
 * Aggregated from all sessions in a project
 */
export interface ProjectStats {
  /** Total cost in USD for this project */
  totalCost: number
  /** Total lines of code written via Write/Edit tools */
  linesWritten: number
  /** Total time spent in milliseconds */
  timeSpentMs: number
  /** Number of sessions */
  sessionCount: number
  /** Total messages across all sessions */
  totalMessages: number
  /** Total tool calls */
  totalToolCalls: number
  /** First session date */
  firstSession: Date | null
  /** Last session date */
  lastSession: Date | null
}

export interface SessionStats {
  promptCount: number      // user messages without parentUuid
  messageCount: number     // total user + assistant messages
  toolCallCount: number    // tool_use blocks
  totalCostUsd: number     // sum of costUsd
  totalPages: number       // pagination pages
  durationMs: number       // session duration in milliseconds
  startTimestamp?: string  // ISO 8601 timestamp of first message
  endTimestamp?: string    // ISO 8601 timestamp of last message
}

export interface Session {
  id: string
  projectId: string
  filePath: string
  lastModified: Date
  messageCount: number
  summary: string
  stats?: SessionStats
}

export interface SessionDetails extends Session {
  messages: Message[]
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  costUsd: number
}

export interface Message {
  uuid: string
  type: 'user' | 'assistant'
  timestamp: string
  content: ContentBlock[]
  model?: string
  usage?: TokenUsage
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock
  | ThinkingBlock
  | ImageBlock

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, any>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | ToolResultContent[]
  is_error?: boolean
}

export interface ToolResultContent {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

export interface ImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

// Tool-specific input types
export interface BashToolInput {
  command: string
  description?: string
  timeout?: number
}

export interface WriteToolInput {
  file_path: string
  content: string
}

export interface EditToolInput {
  file_path: string
  old_string: string
  new_string: string
}

export interface ReadToolInput {
  file_path: string
  offset?: number
  limit?: number
}

export interface GlobToolInput {
  pattern: string
  path?: string
}

export interface GrepToolInput {
  pattern: string
  path?: string
  include?: string
}

export interface TodoWriteToolInput {
  todos: TodoItem[]
}

export interface TodoItem {
  id?: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
}

// Raw JSONL entry types (as stored in files)
export interface RawSummaryEntry {
  type: 'summary'
  summary: string
  leafUuid: string
}

export interface RawLogEntry {
  parentUuid?: string | null
  uuid: string
  type: 'user' | 'assistant'
  message: RawMessage
  timestamp: string
  costUsd?: number
  durationMs?: number
}

export interface RawMessage {
  role: 'user' | 'assistant'
  content: string | RawContentBlock[]
  model?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

export type RawContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
  | { type: 'tool_result'; tool_use_id: string; content: string | ToolResultContent[]; is_error?: boolean }
  | { type: 'thinking'; thinking: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

// Pagination
export interface PaginatedMessages {
  messages: Message[]
  totalPages: number
  currentPage: number
  totalMessages: number
}

export const MESSAGES_PER_PAGE = 5