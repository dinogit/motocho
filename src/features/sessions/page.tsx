import { useState } from 'react'
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
import { deleteSession } from '@/shared/services/transcripts/server-functions'

export function Page() {
  const data = Route.useLoaderData()
  const { projectId, sessionId } = Route.useParams()
  const navigate = useNavigate()

  // Chat drawer state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState<ChatContext | null>(null)

  const handleDelete = async () => {
    const result = await deleteSession({ data: { projectId, sessionId } })
    if (result.success) {
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