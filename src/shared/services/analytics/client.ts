/**
 * TypeScript client for analytics Tauri commands
 * Communicates with src-tauri/src/commands/analytics.rs
 */

import { getTauriInvoke } from '../tauri-invoke'
import type { StatsCache, AnalyticsSummary } from './types'

/**
 * Get raw analytics data from ~/.claude/stats-cache.json
 */
export async function getAnalyticsData(): Promise<StatsCache | null> {
  try {
    const invoke = await getTauriInvoke()
    return await invoke<StatsCache>('get_analytics_data')
  } catch (error) {
    console.error('Failed to get analytics data:', error)
    return null
  }
}

/**
 * Get computed analytics summary with calculations
 * Includes total tokens, cost, averages, etc.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  try {
    const invoke = await getTauriInvoke()
    return await invoke<AnalyticsSummary>('get_analytics_summary')
  } catch (error) {
    console.error('Failed to get analytics summary:', error)
    return null
  }
}
