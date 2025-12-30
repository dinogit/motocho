/**
 * Library Types
 *
 * Types for the per-project skill/snippet library.
 * Skills are saved in {projectPath}/.claude-dashboard/library/
 */

/**
 * A saved skill/snippet from a transcript
 */
export interface LibrarySkill {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what this skill does/contains */
  description: string
  /** Tags for organization and search */
  tags: string[]
  /** The actual content (code, instructions, etc.) */
  content: string
  /** Optional notes from the user */
  notes?: string
  /** Source information */
  source: {
    /** Project ID (encoded path) */
    projectId: string
    /** Session ID where this was found */
    sessionId: string
    /** Type of content: tool_use, tool_result, text */
    type: 'tool_use' | 'tool_result' | 'text'
    /** Tool name if applicable */
    toolName?: string
    /** Original timestamp */
    timestamp?: string
  }
  /** When this skill was saved */
  createdAt: string
  /** When this skill was last updated */
  updatedAt: string
}

/**
 * Library index stored in index.json
 */
export interface LibraryIndex {
  /** Version for future migrations */
  version: number
  /** All skills in this project's library */
  skills: LibrarySkill[]
}

/**
 * Input for saving a new skill
 */
export interface SaveSkillInput {
  /** Name for the skill */
  name: string
  /** Description (can be auto-generated) */
  description: string
  /** Tags for organization */
  tags: string[]
  /** The content to save */
  content: string
  /** Optional user notes */
  notes?: string
  /** Source information */
  source: LibrarySkill['source']
}

/**
 * Search/filter options for library
 */
export interface LibrarySearchParams {
  /** Text search in name, description, content */
  query?: string
  /** Filter by tags */
  tags?: string[]
  /** Limit results */
  limit?: number
}