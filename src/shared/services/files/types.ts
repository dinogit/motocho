// Types for file history tracking

/**
 * Represents a single file modification (Write or Edit operation)
 */
export interface FileChange {
  /** Unique hash for this version */
  hash: string
  /** Session ID where the change occurred */
  sessionId: string
  /** Project ID */
  projectId: string
  /** File path that was modified */
  filePath: string
  /** Type of modification */
  type: 'write' | 'edit'
  /** Timestamp of the change */
  timestamp: string
  /** For Write: full content. For Edit: new_string */
  content: string
  /** For Edit operations: the string that was replaced */
  oldContent?: string
  /** Message UUID where this change occurred */
  messageUuid: string
}

/**
 * A file with all its changes across sessions
 */
export interface FileHistory {
  /** File path */
  filePath: string
  /** Display name (filename) */
  displayName: string
  /** Total number of changes */
  changeCount: number
  /** Sessions that modified this file */
  sessionIds: string[]
  /** Most recent change */
  lastChange: FileChange
  /** All changes, newest first */
  changes: FileChange[]
}

/**
 * Aggregated statistics for file history
 */
export interface FileHistoryStats {
  /** Total unique files modified */
  totalFiles: number
  /** Total modifications */
  totalChanges: number
  /** Total lines written */
  totalLinesWritten: number
  /** Most modified files */
  topFiles: { filePath: string; changeCount: number }[]
  /** Sessions with file changes */
  sessionCount: number
}

/**
 * Session with its file changes
 */
export interface SessionFileChanges {
  sessionId: string
  projectId: string
  projectName: string
  timestamp: string
  summary: string
  /** Files modified in this session */
  files: SessionFileInfo[]
  /** Total changes in this session */
  changeCount: number
}

/**
 * File info within a session
 */
export interface SessionFileInfo {
  filePath: string
  displayName: string
  changes: FileChange[]
  changeCount: number
}

/**
 * Diff between two versions of a file
 */
export interface FileDiff {
  filePath: string
  sessionId: string
  projectId: string
  timestamp: string
  type: 'write' | 'edit'
  /** For writes: full content */
  content: string
  /** For edits: old content */
  oldContent?: string
  /** Previous version content (if available) */
  previousContent?: string
  /** Previous version hash */
  previousHash?: string
}