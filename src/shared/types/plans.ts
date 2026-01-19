/**
 * Plan Types
 *
 * Types for Claude Code plan files stored in ~/.claude/plans/
 */

export interface Plan {
  /** Plan ID (filename without extension) */
  id: string
  /** Plan title extracted from first heading */
  title: string
  /** Overview/description extracted from content */
  overview: string
  /** Full markdown content */
  content: string
  /** File path */
  filePath: string
  /** Last modified date */
  lastModified: Date
  /** File size in bytes */
  size: number
}

export interface PlanSummary {
  /** Plan ID (filename without extension) */
  id: string
  /** Plan title extracted from first heading */
  title: string
  /** Overview/description extracted from content */
  overview: string
  /** Last modified date */
  lastModified: Date
}