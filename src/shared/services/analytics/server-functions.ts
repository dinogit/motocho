import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createServerFn } from '@tanstack/react-start'
import type { StatsCache, AnalyticsSummary } from './types'

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const STATS_CACHE_PATH = path.join(CLAUDE_DIR, 'stats-cache.json')

// Anthropic pricing per million tokens (as of Dec 2025)
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-5-20251101': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-sonnet-4-5-20241022': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-sonnet-4-20250514': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-haiku-4-5-20241022': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  'claude-3-5-haiku-20241022': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  'default': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
}

function calculateModelCost(modelId: string, usage: {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
}): number {
  const pricing = PRICING[modelId] || PRICING['default']

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output
  const cacheWriteCost = (usage.cacheCreationInputTokens / 1_000_000) * pricing.cacheWrite
  const cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * pricing.cacheRead

  return inputCost + outputCost + cacheWriteCost + cacheReadCost
}

export const getAnalyticsData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StatsCache | null> => {
    try {
      const content = await fs.promises.readFile(STATS_CACHE_PATH, 'utf-8')
      return JSON.parse(content) as StatsCache
    } catch {
      return null
    }
  }
)

export const getAnalyticsSummary = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AnalyticsSummary | null> => {
    try {
      const content = await fs.promises.readFile(STATS_CACHE_PATH, 'utf-8')
      const stats = JSON.parse(content) as StatsCache

      // Calculate totals
      const totalToolCalls = stats.dailyActivity.reduce((sum, day) => sum + day.toolCallCount, 0)

      // Calculate total tokens and cost from model usage
      let totalTokens = 0
      let totalCost = 0

      for (const [modelId, usage] of Object.entries(stats.modelUsage)) {
        const modelTokens = usage.inputTokens + usage.outputTokens +
          usage.cacheReadInputTokens + usage.cacheCreationInputTokens
        totalTokens += modelTokens
        totalCost += calculateModelCost(modelId, usage)
      }

      // Find most active hour
      let mostActiveHour = 0
      let maxHourCount = 0
      for (const [hour, count] of Object.entries(stats.hourCounts)) {
        if (count > maxHourCount) {
          maxHourCount = count
          mostActiveHour = parseInt(hour)
        }
      }

      const daysActive = stats.dailyActivity.length
      const averageMessagesPerSession = stats.totalSessions > 0
        ? Math.round(stats.totalMessages / stats.totalSessions)
        : 0
      const averageTokensPerDay = daysActive > 0
        ? Math.round(totalTokens / daysActive)
        : 0

      return {
        totalSessions: stats.totalSessions,
        totalMessages: stats.totalMessages,
        totalToolCalls,
        totalTokens,
        totalCost,
        averageMessagesPerSession,
        averageTokensPerDay,
        mostActiveHour,
        daysActive,
        firstSessionDate: stats.firstSessionDate,
        lastActiveDate: stats.lastComputedDate,
      }
    } catch {
      return null
    }
  }
)