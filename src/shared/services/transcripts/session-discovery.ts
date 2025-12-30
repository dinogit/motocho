import { readdir, stat, readFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import type { Project, Session } from './types'
import { parseJsonl, generateSummary } from './parser'

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')

/**
 * Decode a project folder name to a readable path
 * Claude uses URL-encoded paths as folder names
 */
export function decodeProjectName(encodedName: string): string {
  try {
    // Replace '-' with '/' and decode URI components
    const decoded = decodeURIComponent(encodedName.replace(/-/g, '/'))
    return decoded
  } catch {
    return encodedName
  }
}

/**
 * Get display name from decoded project path
 */
export function getProjectDisplayName(decodedPath: string): string {
  // Extract the last meaningful part of the path
  const parts = decodedPath.split('/').filter(Boolean)
  if (parts.length === 0) return 'Unknown Project'

  // Return last 2 parts for context (e.g., "username/repo-name")
  return parts.slice(-2).join('/')
}

/**
 * Find all projects in the Claude projects directory
 */
export async function findProjects(): Promise<Project[]> {
  try {
    const entries = await readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
    const projects: Project[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const decodedPath = decodeProjectName(entry.name)

      try {
        const sessions = await findSessionsInProject(entry.name)
        if (sessions.length === 0) continue

        const latestSession = sessions.reduce((latest, session) =>
          session.lastModified > latest.lastModified ? session : latest
        )

        projects.push({
          id: entry.name,
          path: decodedPath,
          displayName: getProjectDisplayName(decodedPath),
          sessionCount: sessions.length,
          lastModified: latestSession.lastModified,
        })
      } catch (err) {
        console.warn(`Failed to process project ${entry.name}:`, err)
      }
    }

    // Sort by last modified, newest first
    return projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
  } catch (err) {
    console.error('Failed to read Claude projects directory:', err)
    return []
  }
}

/**
 * Find all sessions within a project directory
 */
export async function findSessionsInProject(projectId: string): Promise<Session[]> {
  const projectPath = join(CLAUDE_PROJECTS_DIR, projectId)

  try {
    const entries = await readdir(projectPath, { withFileTypes: true })
    const sessions: Session[] = []

    for (const entry of entries) {
      // Only process .jsonl files, skip agent files
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue
      if (entry.name.includes('_agent_')) continue

      const filePath = join(projectPath, entry.name)

      try {
        const fileStat = await stat(filePath)

        // Skip empty files
        if (fileStat.size === 0) continue

        // Read file to get message count and summary
        const content = await readFile(filePath, 'utf-8')
        const messages = parseJsonl(content)

        if (messages.length === 0) continue

        const sessionId = entry.name.replace('.jsonl', '')

        sessions.push({
          id: sessionId,
          projectId,
          filePath,
          lastModified: fileStat.mtime,
          messageCount: messages.length,
          summary: generateSummary(messages),
        })
      } catch (err) {
        console.warn(`Failed to process session ${entry.name}:`, err)
      }
    }

    // Sort by last modified, newest first
    return sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
  } catch (err) {
    console.error(`Failed to read project directory ${projectId}:`, err)
    return []
  }
}

/**
 * Get a specific session's full content
 */
export async function getSession(
  projectId: string,
  sessionId: string
): Promise<Session & { messages: ReturnType<typeof parseJsonl> } | null> {
  const filePath = join(CLAUDE_PROJECTS_DIR, projectId, `${sessionId}.jsonl`)

  try {
    const [fileStat, content] = await Promise.all([
      stat(filePath),
      readFile(filePath, 'utf-8'),
    ])

    const messages = parseJsonl(content)

    return {
      id: sessionId,
      projectId,
      filePath,
      lastModified: fileStat.mtime,
      messageCount: messages.length,
      summary: generateSummary(messages),
      messages,
    }
  } catch (err) {
    console.error(`Failed to read session ${sessionId}:`, err)
    return null
  }
}

/**
 * Search sessions by content
 */
export async function searchSessions(query: string): Promise<Session[]> {
  const projects = await findProjects()
  const results: Session[] = []
  const lowerQuery = query.toLowerCase()

  for (const project of projects) {
    const sessions = await findSessionsInProject(project.id)

    for (const session of sessions) {
      // Check if summary matches
      if (session.summary.toLowerCase().includes(lowerQuery)) {
        results.push(session)
        continue
      }

      // Check project name
      if (project.displayName.toLowerCase().includes(lowerQuery)) {
        results.push(session)
      }
    }
  }

  return results.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
}

/**
 * Get the Claude projects directory path
 */
export function getProjectsDir(): string {
  return CLAUDE_PROJECTS_DIR
}