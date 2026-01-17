// Types for Claude Code history data from history.jsonl

export interface HistoryEntry {
  display: string
  pastedContents: { [key: string]: object }
  timestamp: number
  project: string
  sessionId: string
}

export interface SearchResult {
  entry: HistoryEntry
  projectName: string
  formattedDate: string
  formattedTime: string
}

export interface HistorySearchParams {
  query: string
  project?: string
  limit?: number
}

export interface HistoryStats {
  totalPrompts: number
  uniqueProjects: number
  uniqueSessions: number
  dateRange: {
    first: Date
    last: Date
  }
}