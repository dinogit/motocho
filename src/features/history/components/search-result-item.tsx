import { Link } from '@tanstack/react-router'
import { Clock, FolderOpen, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import type { SearchResult } from '@/shared/types/history'

interface SearchResultItemProps {
  result: SearchResult
  query?: string
}

export function SearchResultItem({ result, query }: SearchResultItemProps) {
  const { entry, projectName, formattedDate, formattedTime } = result

  // Encode project path for URL (replace / with -)
  const encodeCodexProjectId = (path: string) =>
    path
      .split('')
      .map((ch) => {
        const code = ch.charCodeAt(0)
        if (
          (code >= 48 && code <= 57) ||
          (code >= 65 && code <= 90) ||
          (code >= 97 && code <= 122) ||
          ch === '.' || ch === '_' || ch === '-'
        ) {
          return ch
        }
        return `~${code.toString(16).toUpperCase().padStart(2, '0')}`
      })
      .join('')

  const encodedProject = entry.source === 'codex'
    ? encodeCodexProjectId(entry.project)
    : entry.project.replace(/\//g, '-')

  // Highlight matching text
  const highlightText = (text: string, search?: string) => {
    if (!search || !search.trim()) {
      return text
    }

    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <Link
      to="/transcripts/$projectId/$sessionId"
      params={{
        projectId: encodedProject,
        sessionId: entry.sessionId,
      }}
      search={{ page: 1, source: entry.source }}
      className="block group"
    >
      <Card className="transition-all hover:bg-muted/50 hover:border-primary/30">
        <CardContent className="p-4">
          {/* Prompt text */}
          <p className="text-sm leading-relaxed line-clamp-2 mb-3 text-chart-1">
            {highlightText(entry.display, query)}
          </p>

          {/* Metadata row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                {projectName}
              </span>
              <Badge variant="outline" className="text-[10px] py-0">
                {entry.source === 'codex' ? 'Codex' : 'Code'}
              </Badge>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formattedDate} · {formattedTime}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
