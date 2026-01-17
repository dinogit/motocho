import { Link } from '@tanstack/react-router'
import { Route } from '@/routes/files/$sessionId/index'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
} from '@/shared/components/page/page-header'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { FileIcon, ClockIcon, PencilIcon, FilePlusIcon, ChevronRightIcon } from 'lucide-react'
import type { SessionFileChanges, FileChange } from '@/shared/types/files'

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function ChangeItem({ change, sessionId }: { change: FileChange; sessionId: string }) {
  const isWrite = change.type === 'write'
  const lineCount = change.content.split('\n').length

  return (
    <Link
      to="/files/$sessionId/$fileHash"
      params={{ sessionId, fileHash: change.hash }}
      className="block"
    >
      <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-accent/50 transition-colors cursor-pointer border-l-2 border-transparent hover:border-primary">
        <div className={`p-1.5 rounded ${isWrite ? 'bg-green-100' : 'bg-blue-100'}`}>
          {isWrite ? (
            <FilePlusIcon className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <PencilIcon className="h-3.5 w-3.5 text-blue-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={isWrite ? 'default' : 'secondary'} className="text-xs">
              {isWrite ? 'Write' : 'Edit'}
            </Badge>
            <span className="text-xs text-muted-foreground">{lineCount} lines</span>
          </div>
          {change.type === 'edit' && change.oldContent && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Replaced: <code className="bg-muted px-1 rounded">{change.oldContent.slice(0, 40)}...</code>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <ClockIcon className="h-3 w-3" />
          {formatTime(new Date(change.timestamp))}
        </div>
        <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

function FileSection({ file, sessionId }: { file: { filePath: string; displayName: string; changes: FileChange[]; changeCount: number }; sessionId: string }) {
  return (
    <Card className="py-4">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{file.filePath}</p>
          </div>
          <Badge variant="outline">{file.changeCount} changes</Badge>
        </div>
        <div className="flex flex-col gap-1">
          {file.changes.map((change) => (
            <ChangeItem key={change.hash} change={change} sessionId={sessionId} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <FileIcon className="h-12 w-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">Session not found</p>
      <p className="text-sm">This session may have been deleted or doesn't have any file changes.</p>
      <Link to="/files" className="mt-4 text-primary hover:underline">
        Back to file history
      </Link>
    </div>
  )
}

export function SessionPage() {
  const session = Route.useLoaderData() as SessionFileChanges | null

  if (!session) {
    return (
      <>
        <PageHeader>
          <PageHeaderContent>
            <div>
              <PageTitle>Session Not Found</PageTitle>
            </div>
          </PageHeaderContent>
        </PageHeader>
        <div className="p-6">
          <EmptyState />
        </div>
      </>
    )
  }

  const sessionDate = new Date(session.timestamp)

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <div>
            <Breadcrumb className="mb-2">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/files">File History</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Session</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <PageTitle>Session File Changes</PageTitle>
            <PageDescription>
              {session.summary}
            </PageDescription>
          </div>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Project:</span>
            <span className="font-medium">{session.projectName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{formatDate(sessionDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Files:</span>
            <Badge variant="secondary">{session.files.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Changes:</span>
            <Badge variant="secondary">{session.changeCount}</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {session.files.map((file) => (
            <FileSection key={file.filePath} file={file} sessionId={session.sessionId} />
          ))}
        </div>
      </div>
    </>
  )
}
