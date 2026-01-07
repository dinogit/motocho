import { useState } from 'react'
import { MessageBlock } from './message-block'
import {MessageSquare, Terminal, FileCode, DollarSign, Trash2, Loader2, Clock, CalendarDays} from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/shared/components/ui/pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import type { Session, PaginatedMessages } from '@/shared/services/transcripts/types'

interface TranscriptViewerProps {
  session: Session
  pagination: PaginatedMessages
  onPageChange: (page: number) => void
  onAsk?: (content: string, toolName: string, type: 'tool_use' | 'tool_result' | 'text') => void
  onDelete?: () => Promise<void>
}

/**
 * Format duration in milliseconds to human-readable format (e.g., "2h 45m 30s")
 */
function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

  return parts.join(' ')
}

export function TranscriptViewer({
  session,
  pagination,
  onPageChange,
  onAsk,
  onDelete,
}: TranscriptViewerProps) {
  const { messages, currentPage, totalPages } = pagination
  const stats = session.stats
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
  }

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4">
        <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
          <CardTitle className="text-lg">{session.summary}</CardTitle>
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this session from disk. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Stats row - like simonw's format */}
          {stats && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                {stats.promptCount} prompts
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <FileCode className="h-4 w-4" />
                {stats.messageCount} messages
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4" />
                {stats.toolCallCount} tool calls
              </span>
              <span>·</span>
              <span>{stats.totalPages} pages</span>
              {stats.totalCostUsd > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {stats.totalCostUsd.toFixed(2)}
                  </span>
                </>
              )}
              {stats.durationMs > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatDuration(stats.durationMs)}
                  </span>
                </>
              )}
            </div>
          )}
          {/* Session timing row */}
          {stats && stats.startTimestamp && stats.endTimestamp && (
            <div className="text-xs text-muted-foreground flex flex-row gap-2">
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                Start: {new Date(stats.startTimestamp).toLocaleString()}
              </div>
              <span> - </span>
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                End: {new Date(stats.endTimestamp).toLocaleString()}
              </div>
            </div>
          )}
          {/* Metadata row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">{session.id.slice(0, 12)}</span>
            <span className="ml-auto">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="flex-1">
        <div className="space-y-4 pb-4">
          {messages.map((message) => (
            <MessageBlock key={message.uuid} message={message} onAsk={onAsk} />
          ))}
        </div>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="pt-4 border-t">
          <TranscriptPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}

interface TranscriptPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function TranscriptPagination({
  currentPage,
  totalPages,
  onPageChange,
}: TranscriptPaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      pages.push(totalPages)
    }

    return pages
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>

        {getPageNumbers().map((page, index) =>
          page === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => onPageChange(page)}
                isActive={page === currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}