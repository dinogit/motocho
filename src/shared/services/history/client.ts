/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { SearchResult, HistoryStats, ProjectInfo } from './types'

export async function getHistory(limit?: number): Promise<SearchResult[]> {
  console.warn('[Phase 1] getHistory not yet implemented')
  return []
}

export async function searchHistory(query: string, project?: string, limit?: number): Promise<SearchResult[]> {
  console.warn('[Phase 1] searchHistory not yet implemented')
  return []
}

export async function getHistoryStats(): Promise<HistoryStats | null> {
  console.warn('[Phase 1] getHistoryStats not yet implemented')
  return null
}

export async function getHistoryProjects(): Promise<ProjectInfo[]> {
  console.warn('[Phase 1] getHistoryProjects not yet implemented')
  return []
}
