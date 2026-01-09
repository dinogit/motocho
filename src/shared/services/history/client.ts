/**
 * TypeScript client for history Tauri commands
 * Communicates with src-tauri/src/commands/history.rs
 */

import { getTauriInvoke } from '../tauri-invoke'
import type { SearchResult, HistoryStats } from './types'

// Extended ProjectInfo type that includes count
export interface ProjectInfo {
  path: string
  name: string
  count: number
}

/**
 * Get all history entries with optional limit
 */
export async function getHistory(limit?: number): Promise<SearchResult[]> {
  try {
    const invoke = await getTauriInvoke()
    return await invoke<SearchResult[]>('get_history', { limit })
  } catch (error) {
    console.error('Failed to get history:', error)
    return []
  }
}

/**
 * Search history entries by query
 */
export async function searchHistory(
  query: string,
  project?: string,
  limit?: number,
): Promise<SearchResult[]> {
  try {
    const invoke = await getTauriInvoke()
    return await invoke<SearchResult[]>('search_history', { query, project, limit })
  } catch (error) {
    console.error('Failed to search history:', error)
    return []
  }
}

/**
 * Get history statistics (total, projects, sessions, date range)
 */
export async function getHistoryStats(): Promise<HistoryStats | null> {
  try {
    const invoke = await getTauriInvoke()
    return await invoke<HistoryStats>('get_history_stats')
  } catch (error) {
    console.error('Failed to get history stats:', error)
    return null
  }
}

/**
 * Get unique projects from history with counts
 */
export async function getHistoryProjects(): Promise<ProjectInfo[]> {
  try {
    const invoke = await getTauriInvoke()
    return await invoke<ProjectInfo[]>('get_history_projects')
  } catch (error) {
    console.error('Failed to get history projects:', error)
    return []
  }
}
