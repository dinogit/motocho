import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createServerFn } from '@tanstack/react-start'
import type { Project, Session, ProjectStats, RawLogEntry, RawContentBlock } from './types'
import { parseJsonlWithStats, paginateMessages } from "@/shared/services/transcripts/parser.ts"

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')
const MESSAGES_PER_PAGE = 20

/**
 * Decode project name from Claude's encoded format
 */
function decodeProjectName(encodedName: string): string {
  // Replace leading dash and convert dashes back to slashes
  const decoded = encodedName.replace(/^-/, '/').replace(/-/g, '/')
  const parts = decoded.split('/').filter(Boolean)
  // Return last 2 parts for a readable name
  return parts.slice(-2).join('/')
}

export const getProjects = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Project[]> => {
    const entries = await fs.promises.readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })

    const projects: Project[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      // Count sessions in this project
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, entry.name)
      const projectEntries = await fs.promises.readdir(projectPath)
      const sessionCount = projectEntries.filter(
        (f) => f.endsWith('.jsonl') && !f.includes('agent-')
      ).length

      projects.push({
        id: entry.name,
        path: entry.name,
        displayName: decodeProjectName(entry.name),
        sessionCount,
        lastModified: new Date(),
      })
    }

    return projects.sort((a, b) => b.sessionCount - a.sessionCount)
  }
)


export const getProjectSessions = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: projectId }): Promise<Session[]> => {
    const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId)

    const entries = await fs.promises.readdir(projectPath, { withFileTypes: true })
    const sessions: Session[] = []

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue
      if (entry.name.includes('agent-')) continue

      const filePath = path.join(projectPath, entry.name)
      const stat = await fs.promises.stat(filePath)

      if (stat.size === 0) continue

      // Read and parse the file to get stats
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const parsed = parseJsonlWithStats(content, MESSAGES_PER_PAGE)

      sessions.push({
        id: entry.name.replace('.jsonl', ''),
        projectId,
        filePath,
        lastModified: stat.mtime,
        messageCount: parsed.stats.messageCount,
        summary: parsed.summary,
        stats: parsed.stats,
      })
    }

    return sessions.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    )
  })


export const getSessionDetails = createServerFn({ method: 'GET' })
  .inputValidator((d: { projectId: string; sessionId: string; page?: number }) => d)
  .handler(async ({ data }) => {
    const filePath = path.join(CLAUDE_PROJECTS_DIR, data.projectId, `${data.sessionId}.jsonl`)

    const [stat, content] = await Promise.all([
      fs.promises.stat(filePath),
      fs.promises.readFile(filePath, 'utf-8'),
    ])

    const parsed = parseJsonlWithStats(content, MESSAGES_PER_PAGE)
    const pagination = paginateMessages(parsed.messages, data.page || 1, MESSAGES_PER_PAGE)

    return {
      session: {
        id: data.sessionId,
        projectId: data.projectId,
        filePath,
        lastModified: stat.mtime,
        messageCount: parsed.stats.messageCount,
        summary: parsed.summary,
        stats: parsed.stats,
      },
      pagination,
    }
  })


// Anthropic pricing per million tokens (as of Dec 2025)
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-5-20251101': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-sonnet-4-5-20241022': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-sonnet-4-20250514': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-haiku-4-5-20241022': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  'claude-3-5-haiku-20241022': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  'default': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
}

/**
 * Calculate cost from token usage
 */
function calculateCostFromUsage(
  model: string | undefined,
  usage: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number } | undefined
): number {
  if (!usage) return 0

  const pricing = PRICING[model || ''] || PRICING['default']
  const inputTokens = usage.input_tokens || 0
  const outputTokens = usage.output_tokens || 0
  const cacheCreationTokens = usage.cache_creation_input_tokens || 0
  const cacheReadTokens = usage.cache_read_input_tokens || 0

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const cacheWriteCost = (cacheCreationTokens / 1_000_000) * pricing.cacheWrite
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheRead

  return inputCost + outputCost + cacheWriteCost + cacheReadCost
}

/**
 * Get project efficiency statistics
 *
 * Calculates aggregated stats across all sessions:
 * - Total cost from token usage in messages
 * - Lines written (from Write tool content)
 * - Time spent (estimated from message timestamps)
 * - Session/message/tool counts
 */
export const getProjectStats = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: projectId }): Promise<ProjectStats> => {
    const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId)

    let totalCost = 0
    let linesWritten = 0
    let timeSpentMs = 0
    let sessionCount = 0
    let totalMessages = 0
    let totalToolCalls = 0
    let firstSession: Date | null = null
    let lastSession: Date | null = null

    try {
      const entries = await fs.promises.readdir(projectPath, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue
        if (entry.name.includes('agent-')) continue

        const filePath = path.join(projectPath, entry.name)
        const stat = await fs.promises.stat(filePath)

        if (stat.size === 0) continue

        sessionCount++

        // Track date range
        const sessionDate = stat.mtime
        if (!firstSession || sessionDate < firstSession) {
          firstSession = sessionDate
        }
        if (!lastSession || sessionDate > lastSession) {
          lastSession = sessionDate
        }

        // Parse the session file
        const content = await fs.promises.readFile(filePath, 'utf-8')
        const lines = content.split('\n').filter((line) => line.trim())

        // Track timestamps for time spent calculation
        let sessionFirstTimestamp: Date | null = null
        let sessionLastTimestamp: Date | null = null

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)

            // Skip non-message entries
            if (parsed.type !== 'user' && parsed.type !== 'assistant') {
              continue
            }

            const entry = parsed as RawLogEntry
            if (!entry.message) continue

            totalMessages++

            // Track timestamps
            if (entry.timestamp) {
              const ts = new Date(entry.timestamp)
              if (!sessionFirstTimestamp || ts < sessionFirstTimestamp) {
                sessionFirstTimestamp = ts
              }
              if (!sessionLastTimestamp || ts > sessionLastTimestamp) {
                sessionLastTimestamp = ts
              }
            }

            // Calculate cost from usage tokens
            if (entry.message.usage) {
              totalCost += calculateCostFromUsage(entry.message.model, entry.message.usage)
            }

            // Count tool calls and lines written
            const msgContent = entry.message.content
            if (Array.isArray(msgContent)) {
              for (const block of msgContent as RawContentBlock[]) {
                if (block.type === 'tool_use') {
                  totalToolCalls++

                  // Count lines from Write tool
                  if (block.name === 'Write' && block.input?.content) {
                    const writeContent = block.input.content as string
                    linesWritten += writeContent.split('\n').length
                  }

                  // Count lines from Edit tool (new_string lines)
                  if (block.name === 'Edit' && block.input?.new_string) {
                    const newContent = block.input.new_string as string
                    linesWritten += newContent.split('\n').length
                  }
                }
              }
            }
          } catch {
            // Skip malformed lines
          }
        }

        // Add session duration
        if (sessionFirstTimestamp && sessionLastTimestamp) {
          timeSpentMs += sessionLastTimestamp.getTime() - sessionFirstTimestamp.getTime()
        }
      }
    } catch {
      // Project directory doesn't exist or can't be read
    }

    return {
      totalCost,
      linesWritten,
      timeSpentMs,
      sessionCount,
      totalMessages,
      totalToolCalls,
      firstSession,
      lastSession,
    }
  })

/**
 * Delete a session from disk
 */
export const deleteSession = createServerFn({ method: 'POST' })
  .inputValidator((d: { projectId: string; sessionId: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const filePath = path.join(CLAUDE_PROJECTS_DIR, data.projectId, `${data.sessionId}.jsonl`)

    try {
      await fs.promises.unlink(filePath)
      return { success: true }
    } catch {
      return { success: false }
    }
  })
