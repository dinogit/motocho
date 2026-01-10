/**
 * TypeScript client for analytics Tauri commands
 * Communicates with src-tauri/src/commands/analytics.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type { StatsCache, AnalyticsSummary } from './types'

/**
 * Get raw analytics data from ~/.claude/stats-cache.json
 */
export async function getAnalyticsData(): Promise<StatsCache | null> {
  try {
    return await invoke<StatsCache>('get_analytics_data')
  } catch (error) {
    console.error('[Analytics] Failed to get analytics data:', error)
    return null
  }
}

/**
 * Get computed analytics summary with calculations
 * Includes total tokens, cost, averages, etc.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  try {
    return await invoke<AnalyticsSummary>('get_analytics_summary')
  } catch (error) {
    console.error('[Analytics] Failed to get analytics summary:', error)
    return null
  }
}
