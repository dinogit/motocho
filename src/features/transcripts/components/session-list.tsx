import { FileText } from 'lucide-react'
import type { Session } from '@/shared/types/transcripts'
import { SessionListItem, type SessionListMode } from './session-list-item'

interface SessionListProps {
  sessions: Session[]
  projectId: string
  mode?: SessionListMode
  selectedSessionIds?: string[]
  onToggleSelection?: (sessionId: string) => void
}

export function SessionList({
  sessions,
  projectId,
  mode = 'presentation',
  selectedSessionIds = [],
  onToggleSelection
}: SessionListProps) {
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
        <SessionListItem
          key={session.id}
          session={session}
          projectId={projectId}
          mode={mode}
          isSelected={selectedSessionIds.includes(session.id)}
          onSelect={() => onToggleSelection?.(session.id)}
        />
      ))}
    </div>
  )
}
