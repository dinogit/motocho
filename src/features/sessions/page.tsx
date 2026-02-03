import { useState } from 'react'
import { Link, useNavigate, useLoaderData } from '@tanstack/react-router'
import { Route } from '@/routes/transcripts/$projectId/$sessionId.tsx'
import { TranscriptViewer } from '@/features/transcripts/components/transcript-viewer'
import { ChatDrawer, type ChatContext } from '@/features/transcripts/components/chat-drawer'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'
import { deleteSession, getCodexSessionDetails, getSessionDetails } from '@/shared/services/transcripts/client'
const getUsageInfo: any = () => Promise.resolve() // Added this mock function based on the instruction's usage

export function Page() {
  const data = useLoaderData({ from: '/transcripts/$projectId/$sessionId', structuralSharing: false }) as any
  const { projectId, sessionId } = Route.useParams()
  const navigate = useNavigate()
  const searchParams = Route.useSearch() as { page?: number; source?: 'code' | 'codex' }
  const source = searchParams.source === 'codex' ? 'codex' : 'code'

  const [isRefreshing, setIsRefreshing] = useState(false)

  // Chat drawer state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState<ChatContext | null>(null)

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (source === 'codex') {
      await getCodexSessionDetails(projectId, sessionId, searchParams.page)
    } else {
      await getSessionDetails(projectId, sessionId, searchParams.page)
    }
    setIsRefreshing(false)
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Session not found</p>
      </div>
    )
  }

  const handleDelete = async () => {
    if (source !== 'codex') {
      const success = await deleteSession(projectId, sessionId)
      if (success) {
        navigate({ to: '/transcripts/$projectId', params: { projectId }, search: { source } })
      }
    }
  }

  const handlePageChange = (page: number) => {
    navigate({
      to: '/transcripts/$projectId/$sessionId',
      params: { projectId, sessionId: data.session.id },
      search: { page, source },
    })
  }

  // Handler for "Ask" button on tool blocks
  const handleAsk = (content: string, toolName: string, type: 'tool_use' | 'tool_result' | 'text') => {
    setChatContext({ type, toolName, content })
    setChatOpen(true)
  }

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Session Transcript</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            {data.session.summary || 'Conversation transcript'}
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-4 p-6">
        <TranscriptViewer
          session={data.session}
          pagination={data.pagination}
          onPageChange={handlePageChange}
          onAsk={handleAsk}
          onDelete={source === 'codex' ? undefined : handleDelete}
          onRefresh={handleRefresh}
        />
      </div>

      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        context={chatContext}
        projectId={projectId}
        sessionId={sessionId}
      />
    </>
  )
}
