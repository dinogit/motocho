/**
 * Skills Dashboard Page
 *
 * Displays CLAUDE.md and skills for all projects.
 * Supports bulk selection and copying to other projects.
 */

import { useState } from 'react'
import { useLoaderData } from '@tanstack/react-router'
import { Copy, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { StatsCards } from './components/stats-cards'
import { ProjectSection } from './components/project-section'
import type { SkillsDashboardData } from '@/shared/services/skills/types'
import { bulkCopy } from '@/shared/services/skills/client'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

export interface SelectedItem {
  type: 'skill' | 'claude-md'
  path: string
  sourceProject: string
  name: string
}

export function Page() {
  const data = useLoaderData({ from: '/skills' }) as SkillsDashboardData
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [destinationProject, setDestinationProject] = useState<string>('')
  const [isCopying, setIsCopying] = useState(false)

  // Use allProjects from server (includes ALL projects, not just those with skills)
  const allProjects = data.allProjects

  // Get unique source projects from selection to exclude from destination
  const sourceProjects = new Set(selectedItems.map((i) => i.sourceProject))
  const destinationOptions = allProjects.filter((p) => !sourceProjects.has(p.path))

  function toggleSelection(item: SelectedItem) {
    setSelectedItems((prev) => {
      const exists = prev.some(
        (i) => i.type === item.type && i.path === item.path
      )
      if (exists) {
        return prev.filter(
          (i) => !(i.type === item.type && i.path === item.path)
        )
      }
      return [...prev, item]
    })
  }

  function isSelected(type: 'skill' | 'claude-md', path: string) {
    return selectedItems.some((i) => i.type === type && i.path === path)
  }

  function clearSelection() {
    setSelectedItems([])
    setDestinationProject('')
  }

  async function handleBulkCopy() {
    if (!destinationProject || selectedItems.length === 0) return

    setIsCopying(true)
    try {
      const items = selectedItems.map((i) => ({
        type: (i.type === 'claude-md' ? 'claude_md' : i.type) as 'skill' | 'claude_md',
        source: i.path,
        sourceProject: i.sourceProject,
      }))
      const result = await bulkCopy(items, destinationProject)

      if (result && result.copiedCount > 0) {
        toast.success(`Copied ${result.copiedCount} item(s)`)
      }
      if (result && result.failedItems.length > 0) {
        result.failedItems.forEach((err: string) => toast.error(err))
      }

      clearSelection()
      window.location.reload()
    } catch {
      toast.error('Failed to copy items')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Skills & Instructions</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            Project CLAUDE.md files and custom skills
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-6 p-6 pb-24">
        {/* Statistics overview */}
        <StatsCards stats={data.stats} />

        {/* Project list */}
        {data.projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No projects with CLAUDE.md or skills found.</p>
            <p className="text-sm mt-1">
              Add a CLAUDE.md file or .claude/skills/ directory to your projects.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.projects.map((project) => (
              <ProjectSection
                key={project.projectPath}
                project={project}
                allProjects={allProjects}
                defaultOpen={false}
                onToggleSelection={toggleSelection}
                isSelected={isSelected}
              />
            ))}
          </div>
        )}

        {/* Educational footer */}
        <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground mb-2">About Skills & CLAUDE.md</h3>
          <p>
            CLAUDE.md files provide project-specific instructions that Claude follows
            in every conversation. Skills are reusable capabilities that Claude
            automatically triggers based on context.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>CLAUDE.md</strong> - Always loaded, applies to all conversations</li>
            <li><strong>Skills</strong> - Loaded on-demand when context matches the description</li>
          </ul>
          <p className="mt-2">
            Skills are stored in{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              .claude/skills/{'<skill-name>'}/SKILL.md
            </code>
          </p>
        </div>
      </div>

      {/* Floating action bar when items selected */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-background border rounded-lg shadow-lg px-4 py-3">
            <span className="text-sm font-medium">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </span>

            <Select value={destinationProject} onValueChange={setDestinationProject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((project) => (
                  <SelectItem key={project.path} value={project.path}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkCopy}
              disabled={!destinationProject || isCopying}
            >
              {isCopying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy
            </Button>

            <Button variant="ghost" size="icon" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
