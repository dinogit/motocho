import { useState, useCallback } from 'react'
import { useLoaderData } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { format, subDays } from 'date-fns'
import { FileText, Copy, Download, Loader2, Sparkles } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { DateRangePicker } from './components/date-range-picker'
import { ReportPreview } from './components/report-preview'
import type { Project } from '@/shared/types/transcripts'

interface WorkGroup {
  subject: string
  workType: string
  count: number
  firstTimestamp: number
  lastTimestamp: number
  sessions: string[]
}

interface ReportData {
  projectName: string
  dateRange: string
  workItems: WorkGroup[]
  markdown: string
  totalFiles: number
  totalCommands: number
  totalSessions: number
}

export function Page() {
  const { projects } = useLoaderData({ from: '/reports', structuralSharing: false }) as { projects: Project[] }

  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [useAI, setUseAI] = useState(true) // AI summaries enabled by default
  const [report, setReport] = useState<ReportData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setError('Please select a date range')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await invoke<ReportData>('generate_report', {
        projectId: selectedProject === 'all' ? null : selectedProject,
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd'),
        useAi: useAI,
      })
      setReport(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsGenerating(false)
    }
  }, [selectedProject, dateRange, useAI])

  const handleCopy = useCallback(async () => {
    if (!report) return

    try {
      await navigator.clipboard.writeText(report.markdown)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [report])

  const handleSave = useCallback(async () => {
    if (!report || !dateRange?.from || !dateRange?.to) return

    try {
      const projectName = selectedProject !== 'all'
        ? projects.find((p) => p.id === selectedProject)?.displayName.replace(/[/\\]/g, '-') || 'project'
        : 'all-projects'
      const defaultFilename = `report-${projectName}-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.md`

      await invoke('save_report', {
        content: report.markdown,
        defaultFilename,
      })
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }, [report, selectedProject, projects, dateRange])

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Reports</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            Generate session reports showing what was done across your Claude Code projects
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>

      <div className="flex flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project">Project (optional)</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ai-summaries" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  AI-Powered Summaries
                </Label>
                <p className="text-xs text-muted-foreground">
                  Uses Claude Haiku for better descriptions
                </p>
              </div>
              <Switch
                id="ai-summaries"
                checked={useAI}
                onCheckedChange={setUseAI}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !dateRange?.from || !dateRange?.to}
              className="w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {report && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Work Completed</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">{report.workItems.length}</span> work items,{' '}
                  <span className="font-medium">{report.totalFiles}</span> files,{' '}
                  <span className="font-medium">{report.totalSessions}</span> sessions
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Download className="mr-2 h-4 w-4" />
                  Save as .md
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ReportPreview markdown={report.markdown} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
