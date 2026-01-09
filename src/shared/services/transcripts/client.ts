/**
 * TypeScript client for transcripts Tauri commands
 * Communicates with src-tauri/src/commands/transcripts.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type {
  Project,
  Session,
  SessionDetails,
  ProjectStats,
  PaginatedMessages,
} from './types'

/**
 * Get all projects from ~/.claude/projects/
 */
export async function getProjects(): Promise<Project[]> {
  try {
    console.log('[Tauri] Invoking get_projects command...')
    const projects = await invoke<Project[]>('get_projects')
    console.log('[Tauri] get_projects response:', projects)
    return projects.map((p) => ({
      ...p,
      lastModified: new Date(p.lastModified),
    }))
  } catch (error) {
    console.error('[Tauri] Failed to get projects:', error)
    return []
  }
}

/**
 * Get all sessions for a project
 */
export async function getProjectSessions(projectId: string): Promise<Session[]> {
  try {
    const sessions = await invoke<Session[]>('get_project_sessions', { project_id: projectId })
    return sessions.map((s) => ({
      ...s,
      lastModified: new Date(s.lastModified),
    }))
  } catch (error) {
    console.error('Failed to get project sessions:', error)
    return []
  }
}

/**
 * Get session details with paginated messages
 */
export async function getSessionDetails(
  projectId: string,
  sessionId: string,
  page?: number,
): Promise<SessionDetails | null> {
  try {
    const details = await invoke<SessionDetails>('get_session_details', {
      project_id: projectId,
      session_id: sessionId,
      page,
    })
    return {
      ...details,
      lastModified: new Date(details.lastModified),
    }
  } catch (error) {
    console.error('Failed to get session details:', error)
    return null
  }
}

/**
 * Get paginated messages for a session
 */
export async function getSessionPaginated(
  projectId: string,
  sessionId: string,
  page?: number,
): Promise<PaginatedMessages | null> {
  try {
    return await invoke<PaginatedMessages>('get_session_paginated', {
      project_id: projectId,
      session_id: sessionId,
      page,
    })
  } catch (error) {
    console.error('Failed to get paginated messages:', error)
    return null
  }
}

/**
 * Get aggregated statistics for a project
 */
export async function getProjectStats(projectId: string): Promise<ProjectStats | null> {
  try {
    return await invoke<ProjectStats>('get_project_stats', { project_id: projectId })
  } catch (error) {
    console.error('Failed to get project stats:', error)
    return null
  }
}

/**
 * Delete a session file
 */
export async function deleteSession(projectId: string, sessionId: string): Promise<boolean> {
  try {
    return await invoke<boolean>('delete_session', {
      project_id: projectId,
      session_id: sessionId,
    })
  } catch (error) {
    console.error('Failed to delete session:', error)
    return false
  }
}
