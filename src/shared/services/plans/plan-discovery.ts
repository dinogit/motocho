/**
 * Plan Discovery Service
 *
 * Discovers and parses Claude Code plan files from ~/.claude/plans/
 */

import { readdir, stat, readFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import type { Plan, PlanSummary } from './types'

const CLAUDE_PLANS_DIR = join(homedir(), '.claude', 'plans')

/**
 * Extract title from markdown content (first H1 or H2 heading)
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled Plan'
}

/**
 * Extract overview from markdown content
 * Looks for content after the title and before the first section
 */
function extractOverview(content: string): string {
  // Remove the title line
  const withoutTitle = content.replace(/^#\s+.+$/m, '').trim()

  // Find content before the next heading or code block
  const lines = withoutTitle.split('\n')
  const overviewLines: string[] = []

  for (const line of lines) {
    // Stop at next heading, horizontal rule, or code block
    if (line.match(/^#{1,6}\s/) || line.match(/^---/) || line.match(/^```/)) {
      break
    }
    overviewLines.push(line)
  }

  const overview = overviewLines.join('\n').trim()

  // Return first 300 chars if too long
  if (overview.length > 300) {
    return overview.slice(0, 300).trim() + '...'
  }

  return overview || 'No description available'
}

/**
 * Convert filename to readable title
 */
function filenameToTitle(filename: string): string {
  return filename
    .replace('.md', '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Find all plans in the Claude plans directory
 */
export async function findPlans(): Promise<PlanSummary[]> {
  try {
    const entries = await readdir(CLAUDE_PLANS_DIR, { withFileTypes: true })
    const plans: PlanSummary[] = []

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue

      const filePath = join(CLAUDE_PLANS_DIR, entry.name)

      try {
        const [fileStat, content] = await Promise.all([
          stat(filePath),
          readFile(filePath, 'utf-8'),
        ])

        const id = entry.name.replace('.md', '')
        const title = extractTitle(content) || filenameToTitle(entry.name)
        const overview = extractOverview(content)

        plans.push({
          id,
          title,
          overview,
          lastModified: fileStat.mtime,
        })
      } catch (err) {
        console.warn(`Failed to process plan ${entry.name}:`, err)
      }
    }

    // Sort by last modified, newest first
    return plans.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
  } catch (err) {
    console.error('Failed to read Claude plans directory:', err)
    return []
  }
}

/**
 * Get a specific plan by ID
 */
export async function getPlan(planId: string): Promise<Plan | null> {
  const filePath = join(CLAUDE_PLANS_DIR, `${planId}.md`)

  try {
    const [fileStat, content] = await Promise.all([
      stat(filePath),
      readFile(filePath, 'utf-8'),
    ])

    const title = extractTitle(content) || filenameToTitle(`${planId}.md`)
    const overview = extractOverview(content)

    return {
      id: planId,
      title,
      overview,
      content,
      filePath,
      lastModified: fileStat.mtime,
      size: fileStat.size,
    }
  } catch (err) {
    console.error(`Failed to read plan ${planId}:`, err)
    return null
  }
}

/**
 * Get the plans directory path
 */
export function getPlansDir(): string {
  return CLAUDE_PLANS_DIR
}