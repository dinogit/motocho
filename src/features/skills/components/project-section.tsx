/**
 * Project Skills Section
 *
 * Displays skills and CLAUDE.md for a single project:
 * - Project name and path
 * - CLAUDE.md content (rendered markdown) with selection checkbox
 * - List of skills with selection checkboxes
 */

import { FolderOpen, FileText } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { ChevronDown } from 'lucide-react'
import { SkillCard } from './skill-card'
import { MarkdownViewer } from './markdown-viewer'
import type { ProjectSkillsConfig } from '@/shared/types/skills'
import type { SelectedItem } from '../page'

interface ProjectOption {
  path: string
  name: string
}

interface ProjectSectionProps {
  project: ProjectSkillsConfig
  allProjects: ProjectOption[]
  defaultOpen?: boolean
  onToggleSelection: (item: SelectedItem) => void
  isSelected: (type: 'skill' | 'claude-md', path: string) => boolean
}

export function ProjectSection({
  project,
  allProjects,
  defaultOpen = true,
  onToggleSelection,
  isSelected,
}: ProjectSectionProps) {
  const hasClaudeMd = Boolean(project.claudeMd)
  const hasSkills = project.skills.length > 0

  const claudeMdPath = `${project.projectPath}/CLAUDE.md`
  const isClaudeMdSelected = isSelected('claude-md', claudeMdPath)

  function handleClaudeMdToggle() {
    onToggleSelection({
      type: 'claude-md',
      path: claudeMdPath,
      sourceProject: project.projectPath,
      name: 'CLAUDE.md',
    })
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{project.projectName}</CardTitle>
                <CardDescription className="text-xs font-mono">
                  {project.projectPath}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasClaudeMd && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  CLAUDE.md
                </Badge>
              )}
              {hasSkills && (
                <Badge variant="secondary" className="text-xs">
                  {project.skills.length} skill(s)
                </Badge>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* CLAUDE.md content */}
            {hasClaudeMd && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={isClaudeMdSelected}
                    onCheckedChange={handleClaudeMdToggle}
                  />
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CLAUDE.md
                  </h4>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 max-h-96 overflow-y-auto ml-6">
                  <MarkdownViewer content={project.claudeMd!} />
                </div>
              </div>
            )}

            {/* Skills */}
            {hasSkills && (
              <div>
                <h4 className="text-sm font-medium mb-2">Skills</h4>
                <div className="space-y-2">
                  {project.skills.map((skill) => (
                    <SkillCard
                      key={skill.path}
                      skill={skill}
                      currentProjectPath={project.projectPath}
                      allProjects={allProjects}
                      isSelected={isSelected('skill', skill.path)}
                      onToggleSelection={() =>
                        onToggleSelection({
                          type: 'skill',
                          path: skill.path,
                          sourceProject: project.projectPath,
                          name: skill.name,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
