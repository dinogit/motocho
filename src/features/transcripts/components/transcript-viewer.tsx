import { MessageBlock } from './message-block'
import { MessageSquare, Terminal, FileCode, DollarSign } from 'lucide-react'
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
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import type { Session, PaginatedMessages } from '@/shared/services/transcripts/types'

interface TranscriptViewerProps {
  session: Session
  pagination: PaginatedMessages
  onPageChange: (page: number) => void
  onAsk?: (content: string, toolName: string, type: 'tool_use' | 'tool_result' | 'text') => void
}

export function TranscriptViewer({
  session,
  pagination,
  onPageChange,
  onAsk,
}: TranscriptViewerProps) {
  const { messages, currentPage, totalPages } = pagination
  const stats = session.stats

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{session.summary}</CardTitle>
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
            </div>
          )}
          {/* Metadata row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {new Date(session.lastModified).toLocaleDateString()} at{' '}
              {new Date(session.lastModified).toLocaleTimeString()}
            </span>
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