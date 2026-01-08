/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { StatsCache, AnalyticsSummary } from './types'

export async function getAnalyticsData(): Promise<StatsCache | null> {
  console.warn('[Phase 1] getAnalyticsData not yet implemented')
  return null
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  console.warn('[Phase 1] getAnalyticsSummary not yet implemented')
  return null
}
