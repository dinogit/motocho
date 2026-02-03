// Types for Claude Code analytics data from stats-cache.json

export interface DailyActivity {
  date: string
  messageCount: number
  sessionCount: number
  toolCallCount: number
}

export interface DailyModelTokens {
  date: string
  tokensByModel: Record<string, number>
}

export interface ModelUsage {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  messageCount?: number
  webSearchRequests: number
  costUSD: number
  contextWindow: number
}

export interface LongestSession {
  sessionId: string
  duration: number
  messageCount: number
  timestamp: string
}

export interface StatsCache {
  version: number
  lastComputedDate: string
  dailyActivity: DailyActivity[]
  dailyModelTokens: DailyModelTokens[]
  modelUsage: Record<string, ModelUsage>
  totalSessions: number
  totalMessages: number
  longestSession: LongestSession
  firstSessionDate: string
  hourCounts: Record<string, number>
  hourCountsBySource?: Record<string, Record<string, number>>
}

// Computed analytics for display
export interface AnalyticsSummary {
  totalSessions: number
  totalMessages: number
  totalToolCalls: number
  totalTokens: number
  totalCost: number
  averageMessagesPerSession: number
  averageTokensPerDay: number
  mostActiveHour: number
  daysActive: number
  firstSessionDate: string
  lastActiveDate: string
}
