/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { Project, Session, SessionDetails, ProjectStats } from './types'

export async function getProjects(): Promise<Project[]> {
  console.warn('[Phase 1] getProjects not yet implemented')
  return []
}

export async function getProjectSessions(_projectId: string): Promise<Session[]> {
  console.warn('[Phase 1] getProjectSessions not yet implemented')
  return []
}

export async function getSessionDetails(_projectId: string, _sessionId: string,_page?: number): Promise<SessionDetails | null> {
  console.warn('[Phase 1] getSessionDetails not yet implemented')
  return null
}

export async function getProjectStats(_projectId: string): Promise<ProjectStats | null> {
  console.warn('[Phase 1] getProjectStats not yet implemented')
  return null
}

export async function deleteSession(_projectId: string, _sessionId: string): Promise<boolean> {
  console.warn('[Phase 1] deleteSession not yet implemented')
  return false
}
