import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { Clock, FileCode, MessageSquare, Terminal } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { cn } from '@/shared/lib/utils'
import type { Session } from '@/shared/types/transcripts'

export type SessionListMode = 'presentation' | 'selectable'

interface SessionListItemProps {
  session: Session
  projectId: string
  mode?: SessionListMode
  isSelected?: boolean
  onSelect?: () => void
}

export function SessionListItem({
  session,
  projectId,
  mode = 'presentation',
  isSelected = false,
  onSelect,
}: SessionListItemProps) {
  const isSelectable = mode === 'selectable'

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectable && onSelect) {
      e.preventDefault()
      onSelect()
    }
  }

  const cardContent = (
    <Card
      className={cn(
        "transition-all duration-200 border-2 h-full",
        isSelectable ? "cursor-pointer" : "",
        isSelectable && isSelected
          ? "border-chart-1 bg-chart-1/5"
          : "border-transparent hover:bg-muted/50"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm text-chart-1 font-medium leading-snug line-clamp-2 flex-1">
            {session.summary || (session.id.startsWith('agent-') ? 'Agent Session' : 'Untitled Session')}
          </CardTitle>
          {isSelectable && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect?.()}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 shrink-0 border-chart-1 data-[state=checked]:bg-chart-1 data-[state=checked]:border-chart-1"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {session.stats && (
            <>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {session.stats.promptCount} prompts
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <FileCode className="h-3 w-3" />
                {session.stats.messageCount} messages
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Terminal className="h-3 w-3" />
                {session.stats.toolCallCount} tool calls
              </span>
              <span>·</span>
              <span>{session.stats.totalPages} pages</span>
              {session.stats.totalCostUsd > 0 && (
                <>
                  <span>·</span>
                  <span>${session.stats.totalCostUsd.toFixed(2)}</span>
                </>
              )}
            </>
          )}
        </div>
        {/* Timestamp row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatDistanceToNow(new Date(session.lastModified), { addSuffix: true })}
          </div>
          <span className="font-mono text-[10px]">{session.id.slice(0, 8)}</span>
        </div>
      </CardContent>
    </Card>
  )

  if (mode === 'presentation') {
    return (
      <Link
        to="/transcripts/$projectId/$sessionId"
        params={{ projectId, sessionId: session.id }}
        search={{ page: 1 }}
        className="block h-full"
      >
        {cardContent}
      </Link>
    )
  }

  return cardContent
}
