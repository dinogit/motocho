import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { Clock, FileText, MessageSquare, Terminal, FileCode } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card'
import type { Session } from '@/shared/services/transcripts/types'

interface SessionListProps {
  sessions: Session[]
  projectId: string
}

export function SessionList({ sessions, projectId }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4" />
        <p className="text-lg">No sessions found</p>
        <p className="text-sm">This project has no recorded sessions</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {sessions.map((session) => (
        <Link
          key={session.id}
          to="/transcripts/$projectId/$sessionId"
          params={{ projectId, sessionId: session.id }}
          search={{ page: 1 }}
          className="block"
        >
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-chart-1 font-medium leading-snug line-clamp-2">
                {session.summary || (session.id.startsWith('agent-') ? 'Agent Session' : 'Untitled Session')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {/* Stats row - like simonw's "10 prompts · 238 messages · 65 tool calls · 2 pages" */}
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
        </Link>
      ))}
    </div>
  )
}