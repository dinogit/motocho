/**
 * TypeScript client for files Tauri commands
 * Communicates with src-tauri/src/commands/files.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type { FileChange, FileHistoryStats, FileHistory, SessionFileChanges, FileDiff } from './types'

/**
 * Get all file changes across all sessions
 */
export async function getAllFileChanges(): Promise<FileChange[]> {
  try {
    return await invoke<FileChange[]>('get_all_file_changes')
  } catch (error) {
    console.error('[Files] Failed to get all file changes:', error)
    return []
  }
}

/**
 * Get file history statistics
 */
export async function getFileHistoryStats(): Promise<FileHistoryStats | null> {
  try {
    return await invoke<FileHistoryStats>('get_file_history_stats')
  } catch (error) {
    console.error('[Files] Failed to get file history stats:', error)
    return null
  }
}

/**
 * Get file histories grouped by file
 */
export async function getFileHistories(): Promise<FileHistory[]> {
  try {
    return await invoke<FileHistory[]>('get_file_histories')
  } catch (error) {
    console.error('[Files] Failed to get file histories:', error)
    return []
  }
}

/**
 * Get all sessions with file changes
 */
export async function getSessionsWithFileChanges(): Promise<SessionFileChanges[]> {
  try {
    return await invoke<SessionFileChanges[]>('get_sessions_with_file_changes')
  } catch (error) {
    console.error('[Files] Failed to get sessions with file changes:', error)
    return []
  }
}

/**
 * Get file changes for a specific session
 */
export async function getSessionFileChanges(
  sessionId: string,
): Promise<SessionFileChanges | null> {
  try {
    const allSessions = await getSessionsWithFileChanges()
    const session = allSessions.find(s => s.sessionId === sessionId)
    if (!session) return null

    return await invoke<SessionFileChanges>('get_session_file_changes', {
      projectId: session.projectId,
      sessionId,
    })
  } catch (error) {
    console.error('[Files] Failed to get session file changes:', error)
    return null
  }
}

/**
 * Get a specific file change by hash
 */
export async function getFileChangeByHash(
  sessionId: string,
  hash: string,
): Promise<FileDiff | null> {
  try {
    const allSessions = await getSessionsWithFileChanges()
    const session = allSessions.find(s => s.sessionId === sessionId)
    if (!session) return null

    return await invoke<FileDiff>('get_file_change_by_hash', {
      projectId: session.projectId,
      sessionId,
      hash,
    })
  } catch (error) {
    console.error('[Files] Failed to get file change by hash:', error)
    return null
  }
}
