import { MessageSquare, FolderOpen, Layers } from 'lucide-react'
import type { HistoryStats } from '@/shared/services/history/types'

interface StatsBarProps {
  stats: HistoryStats
  resultCount?: number
  isFiltered?: boolean
}

export function StatsBar({ stats, resultCount, isFiltered }: StatsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {isFiltered && resultCount !== undefined ? (
        <span className="font-medium text-foreground">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            {stats.totalPrompts.toLocaleString()} prompts
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            {stats.uniqueProjects} projects
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            {stats.uniqueSessions} sessions
          </span>
        </>
      )}
    </div>
  )
}