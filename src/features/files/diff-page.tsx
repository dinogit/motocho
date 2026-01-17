import { Link } from '@tanstack/react-router'
import { Route } from '@/routes/files/$sessionId/$fileHash'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { FileIcon, PencilIcon, FilePlusIcon, ArrowLeftIcon } from 'lucide-react'
import type { FileDiff } from '@/shared/types/files'
import { useMemo } from 'react'

function formatDateTime(date: Date): string {
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath
}

function CodeBlock({ content, title, variant = 'neutral' }: { content: string; title?: string; variant?: 'added' | 'removed' | 'neutral' }) {
  const lines = content.split('\n')
  const bgClass = variant === 'added' ? 'bg-green-50' : variant === 'removed' ? 'bg-red-50' : 'bg-muted/30'

  return (
    <div className={`rounded-lg border overflow-hidden ${bgClass}`}>
      {title && (
        <div className="px-3 py-2 border-b bg-muted/50 text-sm font-medium">
          {title}
        </div>
      )}
      <ScrollArea className="h-[400px]">
        <div className="p-0">
          <table className="w-full text-sm font-mono">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="hover:bg-muted/30">
                  <td className="px-3 py-0.5 text-muted-foreground text-right select-none border-r w-12">
                    {index + 1}
                  </td>
                  <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  )
}

function SimpleDiff({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const diff = useMemo(() => {
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')

    // Simple line-by-line diff
    const result: { type: 'same' | 'added' | 'removed'; content: string; lineNumber?: number }[] = []

    // Find common prefix
    let commonStart = 0
    while (commonStart < Math.min(oldLines.length, newLines.length) && oldLines[commonStart] === newLines[commonStart]) {
      result.push({ type: 'same', content: oldLines[commonStart], lineNumber: commonStart + 1 })
      commonStart++
    }

    // Find common suffix
    let commonEnd = 0
    while (
      commonEnd < Math.min(oldLines.length - commonStart, newLines.length - commonStart) &&
      oldLines[oldLines.length - 1 - commonEnd] === newLines[newLines.length - 1 - commonEnd]
    ) {
      commonEnd++
    }

    // Add removed lines
    for (let i = commonStart; i < oldLines.length - commonEnd; i++) {
      result.push({ type: 'removed', content: oldLines[i] })
    }

    // Add added lines
    for (let i = commonStart; i < newLines.length - commonEnd; i++) {
      result.push({ type: 'added', content: newLines[i] })
    }

    // Add common suffix
    for (let i = oldLines.length - commonEnd; i < oldLines.length; i++) {
      result.push({ type: 'same', content: oldLines[i], lineNumber: i + 1 })
    }

    return result
  }, [oldContent, newContent])

  return (
    <div className="rounded-lg border overflow-hidden">
      <ScrollArea className="h-[400px]">
        <table className="w-full text-sm font-mono">
          <tbody>
            {diff.map((line, index) => (
              <tr
                key={index}
                className={
                  line.type === 'added'
                    ? 'bg-green-50'
                    : line.type === 'removed'
                      ? 'bg-red-50'
                      : ''
                }
              >
                <td className="px-2 py-0.5 text-muted-foreground select-none w-6">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''}
                </td>
                <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
                  <span className={line.type === 'added' ? 'text-green-800' : line.type === 'removed' ? 'text-red-800' : ''}>
                    {line.content || ' '}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <FileIcon className="h-12 w-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">File change not found</p>
      <p className="text-sm">This file version may have been deleted or is no longer available.</p>
      <Link to="/files" className="mt-4 text-primary hover:underline">
        Back to file history
      </Link>
    </div>
  )
}

export function DiffPage() {
  const { sessionId } = Route.useParams()
  const diff = Route.useLoaderData() as FileDiff | null

  if (!diff) {
    return (
      <>
        <PageHeader>
          <PageHeaderContent>
            <div>
              <PageTitle>File Not Found</PageTitle>
            </div>
          </PageHeaderContent>
        </PageHeader>
        <div className="p-6">
          <EmptyState />
        </div>
      </>
    )
  }

  const fileName = getFileName(diff.filePath)
  const isWrite = diff.type === 'write'
  const hasPrevious = diff.previousContent !== undefined

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
                  <BreadcrumbLink asChild>
                    <Link to="/files/$sessionId" params={{ sessionId }}>Session</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{fileName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <PageTitle className="flex items-center gap-2">
              <FileIcon className="h-5 w-5" />
              {fileName}
            </PageTitle>
            <PageDescription>
              {diff.filePath}
            </PageDescription>
          </div>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant={isWrite ? 'default' : 'secondary'} className="gap-1">
            {isWrite ? <FilePlusIcon className="h-3 w-3" /> : <PencilIcon className="h-3 w-3" />}
            {isWrite ? 'Write' : 'Edit'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDateTime(new Date(diff.timestamp))}
          </span>
          <span className="text-sm text-muted-foreground">
            {diff.content.split('\n').length} lines
          </span>
          {hasPrevious && diff.previousHash && (
            <Link
              to="/files/$sessionId/$fileHash"
              params={{ sessionId, fileHash: diff.previousHash }}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-3 w-3" />
              Previous version
            </Link>
          )}
        </div>

        {isWrite ? (
          <Card className="py-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">File Content</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CodeBlock content={diff.content} />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="changes" className="w-full">
            <TabsList>
              <TabsTrigger value="changes">Changes</TabsTrigger>
              <TabsTrigger value="new">New Content</TabsTrigger>
              {diff.oldContent && <TabsTrigger value="old">Old Content</TabsTrigger>}
              {hasPrevious && <TabsTrigger value="diff">Full Diff</TabsTrigger>}
            </TabsList>
            <TabsContent value="changes" className="mt-4">
              <Card className="py-0">
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {diff.oldContent && (
                      <CodeBlock
                        content={diff.oldContent}
                        title="Replaced"
                        variant="removed"
                      />
                    )}
                    <CodeBlock
                      content={diff.content}
                      title="With"
                      variant="added"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="new" className="mt-4">
              <Card className="py-0">
                <CardContent className="pt-6">
                  <CodeBlock content={diff.content} />
                </CardContent>
              </Card>
            </TabsContent>
            {diff.oldContent && (
              <TabsContent value="old" className="mt-4">
                <Card className="py-0">
                  <CardContent className="pt-6">
                    <CodeBlock content={diff.oldContent} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            {hasPrevious && diff.previousContent && (
              <TabsContent value="diff" className="mt-4">
                <Card className="py-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm">Diff with Previous Version</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <SimpleDiff oldContent={diff.previousContent} newContent={diff.content} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </>
  )
}
