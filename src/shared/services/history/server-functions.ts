import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createServerFn } from '@tanstack/react-start'
import type { HistoryEntry, SearchResult, HistoryStats } from './types'

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const HISTORY_PATH = path.join(CLAUDE_DIR, 'history.jsonl')

/**
 * Extract readable project name from full path
 */
function getProjectName(projectPath: string): string {
  const parts = projectPath.split('/').filter(Boolean)
  return parts.slice(-2).join('/')
}

/**
 * Format timestamp to date and time strings
 */
function formatTimestamp(timestamp: number): { date: string; time: string } {
  const d = new Date(timestamp)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

/**
 * Read all history entries
 */
async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const content = await fs.promises.readFile(HISTORY_PATH, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim())

    const entries: HistoryEntry[] = []
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as HistoryEntry
        if (entry.display && entry.timestamp) {
          entries.push(entry)
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Sort by timestamp descending (newest first)
    return entries.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

/**
 * Get all history entries with optional limit
 */
export const getHistory = createServerFn({ method: 'GET' })
  .inputValidator((d: { limit?: number } | undefined) => d || {})
  .handler(async ({ data }): Promise<SearchResult[]> => {
    const entries = await readHistory()
    const limited = data?.limit ? entries.slice(0, data.limit) : entries

    return limited.map((entry) => {
      const { date, time } = formatTimestamp(entry.timestamp)
      return {
        entry,
        projectName: getProjectName(entry.project),
        formattedDate: date,
        formattedTime: time,
      }
    })
  })

/**
 * Search history entries
 */
export const searchHistory = createServerFn({ method: 'GET' })
  .inputValidator((d: { query: string; project?: string; limit?: number }) => d)
  .handler(async ({ data }): Promise<SearchResult[]> => {
    const entries = await readHistory()
    const query = data.query.toLowerCase()

    let filtered = entries.filter((entry) => {
      const matchesQuery = entry.display.toLowerCase().includes(query)
      const matchesProject = !data.project || entry.project.includes(data.project)
      return matchesQuery && matchesProject
    })

    if (data.limit) {
      filtered = filtered.slice(0, data.limit)
    }

    return filtered.map((entry) => {
      const { date, time } = formatTimestamp(entry.timestamp)
      return {
        entry,
        projectName: getProjectName(entry.project),
        formattedDate: date,
        formattedTime: time,
      }
    })
  })

/**
 * Get history statistics
 */
export const getHistoryStats = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HistoryStats | null> => {
    const entries = await readHistory()

    if (entries.length === 0) {
      return null
    }

    const projects = new Set(entries.map((e) => e.project))
    const sessions = new Set(entries.map((e) => e.sessionId))

    // Entries are already sorted by timestamp desc
    const lastEntry = entries[0]
    const firstEntry = entries[entries.length - 1]

    return {
      totalPrompts: entries.length,
      uniqueProjects: projects.size,
      uniqueSessions: sessions.size,
      dateRange: {
        first: new Date(firstEntry.timestamp),
        last: new Date(lastEntry.timestamp),
      },
    }
  }
)

/**
 * Get unique projects from history
 */
export const getHistoryProjects = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ path: string; name: string; count: number }[]> => {
    const entries = await readHistory()

    const projectCounts = new Map<string, number>()
    for (const entry of entries) {
      projectCounts.set(entry.project, (projectCounts.get(entry.project) || 0) + 1)
    }

    return Array.from(projectCounts.entries())
      .map(([path, count]) => ({
        path,
        name: getProjectName(path),
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }
)