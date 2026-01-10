import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/transcripts/$projectId/$sessionId.tsx'
import { TranscriptViewer } from '@/features/transcripts/components/transcript-viewer'
import { ChatDrawer, type ChatContext } from '@/features/transcripts/components/chat-drawer'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'
import { deleteSession, getSessionDetails } from '@/shared/services/transcripts/client'

export function Page() {
  const initialData = Route.useLoaderData()
  const { projectId, sessionId } = Route.useParams()
  const navigate = useNavigate()
  const searchParams = Route.useSearch() as { page?: number }

  // State for auto-refresh
  const [data, setData] = useState(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Chat drawer state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState<ChatContext | null>(null)

  // Auto-refresh every 10 seconds
  useEffect(() => {
    async function refreshData() {
      setIsRefreshing(true)
      const updatedData = await getSessionDetails(projectId, sessionId, searchParams.page)
      if (updatedData) {
        setData(updatedData)
      }
      setIsRefreshing(false)
    }

    const interval = setInterval(refreshData, 10000)
    return () => clearInterval(interval)
  }, [projectId, sessionId, searchParams.page])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Session not found</p>
      </div>
    )
  }

  const handleDelete = async () => {
    const success = await deleteSession(projectId, sessionId)
    if (success) {
      navigate({ to: '/transcripts/$projectId', params: { projectId } })
    }
  }

  const handlePageChange = (page: number) => {
    navigate({
      to: '/transcripts/$projectId/$sessionId',
      params: { projectId, sessionId: data.session.id },
      search: { page },
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
          onDelete={handleDelete}
          isRefreshing={isRefreshing}
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