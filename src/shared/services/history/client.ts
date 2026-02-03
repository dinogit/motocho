/**
 * TypeScript client for history Tauri commands
 * Communicates with src-tauri/src/commands/history.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type { SearchResult, HistoryStats, HistoryProjectInfo } from '@/shared/types/history'

// Extended ProjectInfo type that includes count
export interface ProjectInfo {
  path: string
  name: string
  count: number
  source?: 'code' | 'codex'
}

/**
 * Get all history entries with optional limit
 */
export async function getHistory(limit?: number): Promise<SearchResult[]> {
  try {
    return await invoke<SearchResult[]>('get_history', { limit })
  } catch (error) {
    console.error('[History] Failed to get history:', error)
    return []
  }
}

/**
 * Get all Codex history entries with optional limit
 */
export async function getCodexHistory(limit?: number): Promise<SearchResult[]> {
  try {
    return await invoke<SearchResult[]>('get_codex_history', { limit })
  } catch (error) {
    console.error('[History] Failed to get Codex history:', error)
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
    return await invoke<SearchResult[]>('search_history', { query, project, limit })
  } catch (error) {
    console.error('[History] Failed to search history:', error)
    return []
  }
}

/**
 * Search Codex history entries by query
 */
export async function searchCodexHistory(
  query: string,
  project?: string,
  limit?: number,
): Promise<SearchResult[]> {
  try {
    return await invoke<SearchResult[]>('search_codex_history', { query, project, limit })
  } catch (error) {
    console.error('[History] Failed to search Codex history:', error)
    return []
  }
}

/**
 * Get history statistics (total, projects, sessions, date range)
 */
export async function getHistoryStats(): Promise<HistoryStats | null> {
  try {
    return await invoke<HistoryStats>('get_history_stats')
  } catch (error) {
    console.error('[History] Failed to get history stats:', error)
    return null
  }
}

/**
 * Get Codex history statistics
 */
export async function getCodexHistoryStats(): Promise<HistoryStats | null> {
  try {
    return await invoke<HistoryStats>('get_codex_history_stats')
  } catch (error) {
    console.error('[History] Failed to get Codex history stats:', error)
    return null
  }
}

/**
 * Get unique projects from history with counts
 */
export async function getHistoryProjects(): Promise<ProjectInfo[]> {
  try {
    return await invoke<ProjectInfo[]>('get_history_projects')
  } catch (error) {
    console.error('[History] Failed to get history projects:', error)
    return []
  }
}

/**
 * Get unique Codex projects from history with counts
 */
export async function getCodexHistoryProjects(): Promise<HistoryProjectInfo[]> {
  try {
    return await invoke<HistoryProjectInfo[]>('get_codex_history_projects')
  } catch (error) {
    console.error('[History] Failed to get Codex history projects:', error)
    return []
  }
}
