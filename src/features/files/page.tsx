import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Route } from '@/routes/files/index'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { FileIcon, FolderIcon, ClockIcon, EditIcon, FileTextIcon } from 'lucide-react'
import type { SessionFileChanges, FileHistory } from '@/shared/services/files/types'

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function StatsCards({ stats }: { stats: { totalFiles: number; totalChanges: number; totalLinesWritten: number; sessionCount: number } | null }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalFiles}</p>
              <p className="text-xs text-muted-foreground">Files Modified</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <EditIcon className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalChanges}</p>
              <p className="text-xs text-muted-foreground">Total Changes</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileTextIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalLinesWritten.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Lines Written</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FolderIcon className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.sessionCount}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SessionList({ sessions }: { sessions: SessionFileChanges[] }) {
  const [search, setSearch] = useState('')

  const filtered = sessions.filter((session) =>
    session.summary.toLowerCase().includes(search.toLowerCase()) ||
    session.files.some((f) => f.filePath.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search sessions or files..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No sessions with file changes found
          </div>
        ) : (
          filtered.map((session) => (
            <Link
              key={session.sessionId}
              to="/files/$sessionId"
              params={{ sessionId: session.sessionId }}
              className="block"
            >
              <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{session.summary}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {session.changeCount} changes
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderIcon className="h-3 w-3" />
                        <span className="truncate">{session.projectName}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {session.files.slice(0, 5).map((file) => (
                          <Badge key={file.filePath} variant="outline" className="text-xs">
                            {file.displayName}
                          </Badge>
                        ))}
                        {session.files.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{session.files.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <ClockIcon className="h-3 w-3" />
                      {formatRelativeTime(new Date(session.timestamp))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

function FileList({ files }: { files: FileHistory[] }) {
  const [search, setSearch] = useState('')

  const filtered = files.filter((file) =>
    file.filePath.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search files..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No files found
          </div>
        ) : (
          filtered.map((file) => (
            <Link
              key={file.filePath}
              to="/files/$sessionId"
              params={{ sessionId: file.lastChange.sessionId }}
              search={{ file: file.filePath }}
              className="block"
            >
              <Card className="py-3 hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{file.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{file.filePath}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary">{file.changeCount} versions</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(file.lastChange.timestamp))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export function Page() {
  const { sessions, files, stats } = Route.useLoaderData()

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>File History</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            Browse file changes across all Claude Code sessions
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-6 p-6">
        <StatsCards stats={stats} />

        <Tabs defaultValue="sessions" className="w-full">
          <TabsList>
            <TabsTrigger value="sessions">By Session</TabsTrigger>
            <TabsTrigger value="files">By File</TabsTrigger>
          </TabsList>
          <TabsContent value="sessions" className="mt-4">
            <SessionList sessions={sessions} />
          </TabsContent>
          <TabsContent value="files" className="mt-4">
            <FileList files={files} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
