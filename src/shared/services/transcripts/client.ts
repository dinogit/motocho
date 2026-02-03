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
      source: 'code',
    }))
  } catch (error) {
    console.error('[Transcripts] Failed to get projects:', error)
    return []
  }
}

/**
 * Get all Codex projects from ~/.codex/sessions/
 */
export async function getCodexProjects(): Promise<Project[]> {
  try {
    const projects = await invoke<Project[]>('get_codex_projects')
    return projects.map((p) => ({
      ...p,
      lastModified: new Date(p.lastModified),
      source: 'codex',
    }))
  } catch (error) {
    console.error('[Transcripts] Failed to get Codex projects:', error)
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
      source: 'code',
    }))
  } catch (error) {
    console.error('[Transcripts] Failed to get project sessions:', error)
    return []
  }
}

/**
 * Get all Codex sessions for a project
 */
export async function getCodexProjectSessions(projectId: string): Promise<Session[]> {
  try {
    const sessions = await invoke<Session[]>('get_codex_project_sessions', { projectId })
    return sessions.map((s) => ({
      ...s,
      lastModified: new Date(s.lastModified),
      source: 'codex',
    }))
  } catch (error) {
    console.error('[Transcripts] Failed to get Codex project sessions:', error)
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
      source: 'code',
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
 * Get Codex session details with paginated messages
 */
export async function getCodexSessionDetails(
  projectId: string,
  sessionId: string,
  page?: number,
): Promise<{ session: Session; pagination: PaginatedMessages } | null> {
  try {
    const details = await invoke<SessionDetails>('get_codex_session_details', {
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
      source: 'codex',
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
    console.error('[Transcripts] Failed to get Codex session details:', error)
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
 * Get Codex paginated messages for a session
 */
export async function getCodexSessionPaginated(
  projectId: string,
  sessionId: string,
  page?: number,
): Promise<PaginatedMessages | null> {
  try {
    return await invoke<PaginatedMessages>('get_codex_session_paginated', {
      projectId,
      sessionId,
      page,
    })
  } catch (error) {
    console.error('[Transcripts] Failed to get Codex paginated messages:', error)
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
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Transcripts] Failed to get agent transcript for ${agentId}:`, errorMsg)
    throw error
  }
}
/**
 * Get all messages for a session (no pagination)
 */
export async function getAllSessionMessages(
  projectId: string,
  sessionId: string,
): Promise<Message[]> {
  try {
    return await invoke<Message[]>('get_all_session_messages', {
      projectId,
      sessionId,
    })
  } catch (error) {
    console.error('[Transcripts] Failed to get all session messages:', error)
    return []
  }
}

/**
 * Get all Codex messages for a session (no pagination)
 */
export async function getCodexAllSessionMessages(
  projectId: string,
  sessionId: string,
): Promise<Message[]> {
  try {
    return await invoke<Message[]>('get_codex_all_session_messages', {
      projectId,
      sessionId,
    })
  } catch (error) {
    console.error('[Transcripts] Failed to get all Codex session messages:', error)
    return []
  }
}

/**
 * Generate project documentation (legacy - uses reports.rs)
 */
export async function generateProjectDocumentation(projectId: string, sessionIds: string[], useAi: boolean = false): Promise<any> {
  try {
    return await invoke('generate_project_documentation', { projectId, sessionIds, useAi })
  } catch (error) {
    console.error('[Transcripts] Failed to generate project documentation:', error)
    throw error
  }
}

/**
 * Status of documentation generation
 * - success: AI successfully generated documentation with clear intent
 * - no_files_found: No documentable files in selected sessions
 * - fallback_used: AI unavailable, used deterministic fallback
 * - weak_intent: Generated but with limited intent data (AI handled gracefully)
 */
export type GenerationStatus = 'success' | 'no_files_found' | 'fallback_used' | 'weak_intent'

export interface DocumentationResult {
  projectName: string
  markdown: string
  sessionCount: number
  fileCount: number
  /** Status of the generation */
  status: GenerationStatus
  /** Debug info (in development builds only) */
  debugInfo?: string
}

export type DocAudience = 'engineer' | 'business' | 'agent'

/**
 * Generate rich project documentation using AI
 * @param audience - Target audience: 'engineer' (technical docs), 'business' (stakeholder summary), 'agent' (CLAUDE.md context)
 * @param customPrompt - Optional custom prompt to use instead of the default
 */
export async function generateDocumentation(
  projectId: string,
  sessionIds: string[],
  useAi: boolean = true,
  audience: DocAudience = 'engineer',
  customPrompt?: string,
  projectPath?: string,
  sessionSources?: Array<'code' | 'codex'>
): Promise<DocumentationResult> {
  try {
    return await invoke<DocumentationResult>('generate_documentation', {
      projectId,
      projectPath,
      sessionIds,
      sessionSources,
      useAi,
      audience,
      customPrompt,
    })
  } catch (error) {
    console.error('[Transcripts] Failed to generate documentation:', error)
    throw error
  }
}

/**
 * Get the prompt template for documentation generation (for preview/editing)
 */
export async function getDocumentationPrompt(
  projectId: string,
  sessionIds: string[],
  audience: DocAudience = 'engineer',
  projectPath?: string,
  sessionSources?: Array<'code' | 'codex'>
): Promise<string> {
  try {
    return await invoke<string>('get_documentation_prompt', {
      projectId,
      projectPath,
      sessionIds,
      sessionSources,
      audience,
    })
  } catch (error) {
    console.error('[Transcripts] Failed to get documentation prompt:', error)
    throw error
  }
}
