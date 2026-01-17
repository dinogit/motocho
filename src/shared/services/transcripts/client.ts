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
  Message,
} from '@/shared/types/transcripts'

/**
 * Get all projects from ~/.claude/projects/
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const projects = await invoke<Project[]>('get_projects')
    return projects.map((p) => ({
      ...p,
      lastModified: new Date(p.lastModified),
    }))
  } catch (error) {
    console.error('[Transcripts] Failed to get projects:', error)
    return []
  }
}

/**
 * Get all sessions for a project
 */
export async function getProjectSessions(projectId: string): Promise<Session[]> {
  try {
    const sessions = await invoke<Session[]>('get_project_sessions', { projectId })
    return sessions.map((s) => ({
      ...s,
      lastModified: new Date(s.lastModified),
    }))
  } catch (error) {
    console.error('[Transcripts] Failed to get project sessions:', error)
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
): Promise<{ session: Session; pagination: PaginatedMessages } | null> {
  try {
    const details = await invoke<SessionDetails>('get_session_details', {
      projectId,
      sessionId,
      page,
    })

    const session: Session = {
      id: details.id,
      projectId: details.projectId,
      filePath: details.filePath,
      lastModified: new Date(details.lastModified),
      messageCount: details.messageCount,
      summary: details.summary,
      stats: details.stats,
    }

    const pagination: PaginatedMessages = {
      messages: details.messages,
      totalPages: details.stats?.totalPages || 1,
      currentPage: page || 1,
      totalMessages: details.messageCount,
      hasMore: (page || 1) < (details.stats?.totalPages || 1),
    }

    return { session, pagination }
  } catch (error) {
    console.error('[Transcripts] Failed to get session details:', error)
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
      projectId,
      sessionId,
      page,
    })
  } catch (error) {
    console.error('[Transcripts] Failed to paginated messages:', error)
    return null
  }
}

/**
 * Get aggregated statistics for a project
 */
export async function getProjectStats(projectId: string): Promise<ProjectStats | null> {
  try {
    const stats = await invoke<ProjectStats>('get_project_stats', { projectId })
    if (!stats) return null

    return {
      ...stats,
      firstSession: stats.firstSession ? new Date(stats.firstSession) : null,
      lastSession: stats.lastSession ? new Date(stats.lastSession) : null,
    }
  } catch (error) {
    console.error('[Transcripts] Failed to get project stats:', error)
    return null
  }
}

/**
 * Delete a session file
 */
export async function deleteSession(projectId: string, sessionId: string): Promise<boolean> {
  try {
    return await invoke<boolean>('delete_session', {
      projectId,
      sessionId,
    })
  } catch (error) {
    console.error('[Transcripts] Failed to delete session:', error)
    return false
  }
}
/**
 * Get full transcript for a sub-agent
 */
export async function getAgentTranscript(
  projectId: string,
  sessionId: string,
  agentId: string
): Promise<Message[]> {
  try {
    return await invoke<Message[]>('get_agent_transcript', {
      projectId,
      sessionId,
      agentId,
    })
  } catch (error) {
    console.error(`[Transcripts] Failed to get agent transcript for ${agentId}:`, error)
    return []
  }
}
