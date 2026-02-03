export interface ActivityCountsBySource {
  [source: string]: number
}

export interface DailyActivityV2 {
  date: string
  messageCounts: ActivityCountsBySource
  toolCallCounts: ActivityCountsBySource
  sessionCounts: ActivityCountsBySource
}

export interface DailyTokensV2 {
  date: string
  tokensBySource: ActivityCountsBySource
}

export interface ModelUsageEntryV2 {
  source: string
  modelId: string
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  messageCount: number
  webSearchRequests: number
  costUSD: number
  contextWindow: number
}

export interface AnalyticsSummaryV2 {
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

export interface AnalyticsV2 {
  summary: AnalyticsSummaryV2
  dailyActivity: DailyActivityV2[]
  hourlyActivity: Record<string, Record<string, number>>
  dailyTokens: DailyTokensV2[]
  modelUsage: ModelUsageEntryV2[]
}
