import { MessageBlock } from './message-block'
import { StandaloneProgressBlock } from './blocks/standalone-progress-block'
import { SessionCard } from './session-card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/shared/components/ui/pagination'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import type { Session, PaginatedMessages } from '@/shared/types/transcripts'
import { UserHealthCard } from '@/features/sessions/components/user-health-card'

interface TranscriptViewerProps {
  session: Session
  pagination: PaginatedMessages
  onPageChange: (page: number) => void
  onAsk?: (content: string, toolName: string, type: 'tool_use' | 'tool_result' | 'text') => void
  onDelete?: () => Promise<void>
  onRefresh?: () => Promise<void>
}

export function TranscriptViewer({
  session,
  pagination,
  onPageChange,
  onAsk,
  onDelete,
  onRefresh,
}: TranscriptViewerProps) {
  const { messages, currentPage, totalPages } = pagination

  return (
    <div className="flex flex-col h-full">
      <SessionCard
        session={session}
        currentPage={currentPage}
        totalPages={totalPages}
        onRefresh={onRefresh}
        onDelete={onDelete}
      />

      {session.stats?.health && (
        <div className="px-4 pb-2">
          <UserHealthCard
            health={session.stats.health}
            toolBreakdown={session.stats.toolBreakdown}
          />
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4 pb-4">
          {messages.slice().reverse().map((message) => {
            if (message.type === 'progress') {
              const progressBlock = message.content.find(b => b.type === 'progress')
              if (progressBlock) {
                return (
                  <StandaloneProgressBlock
                    key={message.uuid}
                    text={progressBlock.text || ''}
                    agentId={progressBlock.agentId}
                    timestamp={message.timestamp}
                    toolUseID={progressBlock.toolUseID}
                  />
                )
              }
            }
            return (
              <MessageBlock key={message.uuid} message={message} onAsk={onAsk} projectId={session.projectId} sessionId={session.id} />
            )
          })}
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