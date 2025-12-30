import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import * as crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import type {
  FileChange,
  FileHistory,
  FileHistoryStats,
  SessionFileChanges,
  SessionFileInfo,
  FileDiff,
} from './types'
import type { RawLogEntry, RawContentBlock } from '../transcripts/types'

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')

/**
 * Decode project name from Claude's encoded format
 */
function decodeProjectName(encodedName: string): string {
  const decoded = encodedName.replace(/^-/, '/').replace(/-/g, '/')
  const parts = decoded.split('/').filter(Boolean)
  return parts.slice(-2).join('/')
}

/**
 * Generate a hash for file content
 */
function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12)
}

/**
 * Extract file changes from a session file
 */
function extractFileChanges(
  content: string,
  sessionId: string,
  projectId: string
): FileChange[] {
  const lines = content.split('\n').filter((line) => line.trim())
  const changes: FileChange[] = []

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as RawLogEntry

      if (parsed.type !== 'assistant' || !parsed.message) continue

      const msgContent = parsed.message.content
      if (!Array.isArray(msgContent)) continue

      for (const block of msgContent as RawContentBlock[]) {
        if (block.type !== 'tool_use') continue

        if (block.name === 'Write' && block.input?.file_path && block.input?.content) {
          const fileContent = block.input.content as string
          changes.push({
            hash: hashContent(fileContent + parsed.timestamp),
            sessionId,
            projectId,
            filePath: block.input.file_path as string,
            type: 'write',
            timestamp: parsed.timestamp,
            content: fileContent,
            messageUuid: parsed.uuid,
          })
        }

        if (block.name === 'Edit' && block.input?.file_path && block.input?.new_string) {
          const newString = block.input.new_string as string
          const oldString = block.input.old_string as string | undefined
          changes.push({
            hash: hashContent(newString + (oldString || '') + parsed.timestamp),
            sessionId,
            projectId,
            filePath: block.input.file_path as string,
            type: 'edit',
            timestamp: parsed.timestamp,
            content: newString,
            oldContent: oldString,
            messageUuid: parsed.uuid,
          })
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  return changes
}

/**
 * Extract summary from session file
 */
function extractSummary(content: string): string {
  const lines = content.split('\n').filter((line) => line.trim())

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      if (parsed.type === 'summary' && parsed.summary) {
        return parsed.summary
      }
    } catch {
      // Skip
    }
  }

  // Fallback: get first user message
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as RawLogEntry
      if (parsed.type === 'user' && parsed.message) {
        const msgContent = parsed.message.content
        if (typeof msgContent === 'string') {
          return msgContent.slice(0, 100) + (msgContent.length > 100 ? '...' : '')
        }
        if (Array.isArray(msgContent)) {
          for (const block of msgContent) {
            if (block.type === 'text' && block.text) {
              const text = block.text as string
              return text.slice(0, 100) + (text.length > 100 ? '...' : '')
            }
          }
        }
      }
    } catch {
      // Skip
    }
  }

  return 'Session'
}

/**
 * Get all file changes across all sessions
 */
export const getAllFileChanges = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FileChange[]> => {
    const allChanges: FileChange[] = []

    try {
      const projectDirs = await fs.promises.readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })

      for (const projectDir of projectDirs) {
        if (!projectDir.isDirectory()) continue

        const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir.name)
        const sessionFiles = await fs.promises.readdir(projectPath)

        for (const sessionFile of sessionFiles) {
          if (!sessionFile.endsWith('.jsonl') || sessionFile.includes('agent-')) continue

          const sessionPath = path.join(projectPath, sessionFile)
          const stat = await fs.promises.stat(sessionPath)
          if (stat.size === 0) continue

          const content = await fs.promises.readFile(sessionPath, 'utf-8')
          const sessionId = sessionFile.replace('.jsonl', '')
          const changes = extractFileChanges(content, sessionId, projectDir.name)

          allChanges.push(...changes)
        }
      }
    } catch {
      // Projects directory doesn't exist
    }

    // Sort by timestamp, newest first
    return allChanges.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }
)

/**
 * Get file history stats
 */
export const getFileHistoryStats = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FileHistoryStats> => {
    const changes = await getAllFileChanges()

    const fileMap = new Map<string, number>()
    const sessionSet = new Set<string>()
    let totalLinesWritten = 0

    for (const change of changes) {
      fileMap.set(change.filePath, (fileMap.get(change.filePath) || 0) + 1)
      sessionSet.add(change.sessionId)
      totalLinesWritten += change.content.split('\n').length
    }

    const topFiles = Array.from(fileMap.entries())
      .map(([filePath, changeCount]) => ({ filePath, changeCount }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10)

    return {
      totalFiles: fileMap.size,
      totalChanges: changes.length,
      totalLinesWritten,
      topFiles,
      sessionCount: sessionSet.size,
    }
  }
)

/**
 * Get file history grouped by file
 */
export const getFileHistories = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FileHistory[]> => {
    const changes = await getAllFileChanges()

    const fileMap = new Map<string, FileChange[]>()

    for (const change of changes) {
      const existing = fileMap.get(change.filePath) || []
      existing.push(change)
      fileMap.set(change.filePath, existing)
    }

    const histories: FileHistory[] = []

    for (const [filePath, fileChanges] of fileMap.entries()) {
      const sessionIds = [...new Set(fileChanges.map((c) => c.sessionId))]
      const sortedChanges = fileChanges.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      histories.push({
        filePath,
        displayName: path.basename(filePath),
        changeCount: fileChanges.length,
        sessionIds,
        lastChange: sortedChanges[0],
        changes: sortedChanges,
      })
    }

    // Sort by most recent change
    return histories.sort(
      (a, b) =>
        new Date(b.lastChange.timestamp).getTime() -
        new Date(a.lastChange.timestamp).getTime()
    )
  }
)

/**
 * Get sessions with file changes
 */
export const getSessionsWithFileChanges = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionFileChanges[]> => {
    const sessions: SessionFileChanges[] = []

    try {
      const projectDirs = await fs.promises.readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })

      for (const projectDir of projectDirs) {
        if (!projectDir.isDirectory()) continue

        const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir.name)
        const sessionFiles = await fs.promises.readdir(projectPath)

        for (const sessionFile of sessionFiles) {
          if (!sessionFile.endsWith('.jsonl') || sessionFile.includes('agent-')) continue

          const sessionPath = path.join(projectPath, sessionFile)
          const stat = await fs.promises.stat(sessionPath)
          if (stat.size === 0) continue

          const content = await fs.promises.readFile(sessionPath, 'utf-8')
          const sessionId = sessionFile.replace('.jsonl', '')
          const changes = extractFileChanges(content, sessionId, projectDir.name)

          if (changes.length === 0) continue

          // Group changes by file
          const fileMap = new Map<string, FileChange[]>()
          for (const change of changes) {
            const existing = fileMap.get(change.filePath) || []
            existing.push(change)
            fileMap.set(change.filePath, existing)
          }

          const files: SessionFileInfo[] = Array.from(fileMap.entries()).map(
            ([filePath, fileChanges]) => ({
              filePath,
              displayName: path.basename(filePath),
              changes: fileChanges.sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              ),
              changeCount: fileChanges.length,
            })
          )

          // Get the earliest timestamp from changes
          const timestamps = changes.map((c) => new Date(c.timestamp).getTime())
          const earliest = new Date(Math.min(...timestamps)).toISOString()

          sessions.push({
            sessionId,
            projectId: projectDir.name,
            projectName: decodeProjectName(projectDir.name),
            timestamp: earliest,
            summary: extractSummary(content),
            files,
            changeCount: changes.length,
          })
        }
      }
    } catch {
      // Projects directory doesn't exist
    }

    // Sort by timestamp, newest first
    return sessions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }
)

/**
 * Get file changes for a specific session
 */
export const getSessionFileChanges = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: sessionId }): Promise<SessionFileChanges | null> => {
    const sessions = await getSessionsWithFileChanges()
    return sessions.find((s) => s.sessionId === sessionId) || null
  })

/**
 * Get a specific file change by hash
 */
export const getFileChangeByHash = createServerFn({ method: 'GET' })
  .inputValidator((d: { sessionId: string; hash: string }) => d)
  .handler(async ({ data }): Promise<FileDiff | null> => {
    const changes = await getAllFileChanges()

    const change = changes.find(
      (c) => c.sessionId === data.sessionId && c.hash === data.hash
    )

    if (!change) return null

    // Find previous version of the same file
    const fileChanges = changes
      .filter((c) => c.filePath === change.filePath)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const currentIndex = fileChanges.findIndex((c) => c.hash === change.hash)
    const previousChange = currentIndex < fileChanges.length - 1 ? fileChanges[currentIndex + 1] : null

    return {
      filePath: change.filePath,
      sessionId: change.sessionId,
      projectId: change.projectId,
      timestamp: change.timestamp,
      type: change.type,
      content: change.content,
      oldContent: change.oldContent,
      previousContent: previousChange?.content,
      previousHash: previousChange?.hash,
    }
  })

/**
 * Get file changes for a specific file path
 */
export const getFileChangesForPath = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: filePath }): Promise<FileHistory | null> => {
    const histories = await getFileHistories()
    return histories.find((h) => h.filePath === filePath) || null
  })