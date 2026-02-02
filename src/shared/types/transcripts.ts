export interface Project {
  id: string
  displayName: string
  path: string
  sessionCount: number
  lastModified: string | Date
}

export interface Session {
  id: string
  projectId?: string
  filePath?: string
  timestamp?: string
  lastModified: string | Date
  summary: string | null
  messageCount?: number
  cost?: number
  linesWritten?: number
  processingTime?: number
  stats?: SessionStats
}

export interface SessionDetails {
  id: string
  projectId: string
  filePath: string
  lastModified: string
  messageCount: number
  summary: string | null
  stats: SessionStats
  messages: Message[]
}

export interface ProjectStats {
  totalCost: number
  totalLinesWritten: number
  linesWritten: number
  totalProcessingTime: number
  timeSpentMs: number
  sessionCount: number
  totalMessages: number
  totalToolCalls: number
  firstSession?: string | Date | null
  lastSession?: string | Date | null
}

export interface Message {
  role: 'user' | 'assistant' | 'summary' | 'tool_use' | 'tool_result'
  content: ContentBlock[]
  type: 'user' | 'assistant' | 'summary' | 'tool_use' | 'tool_result' | 'progress' | 'hook'
  usage?: TokenUsage
  model?: string
  timestamp?: string
  uuid: string
}

export interface ContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, any>
  tool_use_id?: string
  content?: any
  is_error?: boolean
  thinking?: string
  source?: any
  progress?: AgentProgressData[]
  [key: string]: any
}

export interface ToolResultContent {
  type: string
  content?: string
  [key: string]: any
}

export interface PaginatedMessages {
  messages: Message[]
  hasMore: boolean
  totalPages: number
  currentPage: number
  totalMessages: number
}

// Raw types from JSONL files
export interface RawContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: any
  tool_use_id?: string
  content?: any
  is_error?: boolean
  thinking?: string
  source?: any
}

export interface RawLogEntry {
  uuid: string
  parentUuid: string | null
  type: 'user' | 'assistant' | 'summary' | 'tool_use' | 'tool_result' | 'progress'
  timestamp: string
  message?: {
    model: string
    content: string | RawContentBlock[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  }
  costUsd?: number
  data?: any // For progress entries
}

export interface RawProgressEntry extends RawLogEntry {
  type: 'progress'
  data: {
    type: 'agent_progress'
    prompt: string
    agentId: string
    [key: string]: any
  }
  toolUseID: string
  parentToolUseID?: string
}

export interface AgentProgressData {
  uuid: string
  timestamp: string
  type: string
  prompt: string
  agentId: string
  toolUseID: string
  parentToolUseID?: string
  messages?: Message[]
  [key: string]: any
}

export interface HookProgressData {
  type: 'hook_progress'
  hookEvent?: string
  hookName?: string
  command?: string
  [key: string]: any
}

export interface HookEntry {
  uuid: string
  timestamp: string
  type: 'progress'
  data: HookProgressData
  parentToolUseID?: string
  cwd?: string
  sessionId?: string
  version?: string
  gitBranch?: string
}

export interface RawSummaryEntry {
  type: 'summary'
  summary: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  costUsd: number
}

export interface SessionStats {
  promptCount: number
  messageCount: number
  toolCallCount: number
  totalCostUsd: number
  totalPages: number
  durationMs: number
  startTimestamp?: string
  endTimestamp?: string
  gitBranch?: string
  health?: SessionHealth
  toolBreakdown?: Record<string, number>
  techStack?: TechStack
}

export interface TechStack {
  languages: LanguageInfo[]
  totalFiles: number
}

export interface LanguageInfo {
  name: string
  framework?: string
  fileCount: number
}

export interface SessionHealth {
  promptsPerHour: number
  toolCallsPerPrompt: number
  assistantMessagesPerPrompt: number
  tokensPerMinute: number
  status: 'healthy' | 'stalled' | 'frantic' | 'expensive' | 'looping' | 'exploding' | 'heavy'
  verdict: 'continue' | 'constrain' | 'restart'
}