/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { FileChange, FileHistoryStats, FileHistory, SessionFileChanges, FileDiff } from './types'

export async function getAllFileChanges(): Promise<FileChange[]> {
  console.warn('[Phase 1] getAllFileChanges not yet implemented')
  return []
}

export async function getFileHistoryStats(): Promise<FileHistoryStats | null> {
  console.warn('[Phase 1] getFileHistoryStats not yet implemented')
  return null
}

export async function getFileHistories(): Promise<FileHistory[]> {
  console.warn('[Phase 1] getFileHistories not yet implemented')
  return []
}

export async function getSessionsWithFileChanges(): Promise<SessionFileChanges[]> {
  console.warn('[Phase 1] getSessionsWithFileChanges not yet implemented')
  return []
}

export async function getSessionFileChanges(sessionId: string): Promise<SessionFileChanges | null> {
  console.warn('[Phase 1] getSessionFileChanges not yet implemented')
  return null
}

export async function getFileChangeByHash(sessionId: string, hash: string): Promise<FileDiff | null> {
  console.warn('[Phase 1] getFileChangeByHash not yet implemented')
  return null
}
