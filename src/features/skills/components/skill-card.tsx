/**
 * Skill Card
 *
 * Displays a single skill with its name, description, and content.
 * Uses a collapsible to show/hide the full skill content.
 * Includes a copy button to copy skill to another project.
 */

import { useState } from 'react'
import { Zap, Copy, ChevronDown, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import type { Skill } from '@/shared/types/skills'
import { copySkill, deleteSkill } from '@/shared/services/skills/client'
import { MarkdownViewer } from './markdown-viewer'

interface ProjectOption {
  path: string
  name: string
}

interface SkillCardProps {
  skill: Skill
  currentProjectPath: string
  allProjects: ProjectOption[]
  isSelected: boolean
  onToggleSelection: () => void
}

export function SkillCard({
  skill,
  currentProjectPath,
  allProjects,
  isSelected,
  onToggleSelection,
}: SkillCardProps) {
  const [isCopying, setIsCopying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter out current project from copy destinations
  const copyDestinations = allProjects.filter(p => p.path !== currentProjectPath)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const result = await deleteSkill(skill.path)

      if (result) {
        toast.success(`Deleted "${skill.name}"`)
        // Reload page to reflect changes
        window.location.reload()
      } else {
        toast.error('Failed to delete skill')
      }
    } catch {
      toast.error('Failed to delete skill')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleCopy(destinationProject: string, destinationName: string) {
    setIsCopying(true)
    try {
      const result = await copySkill(skill.path, destinationProject)

      if (result) {
        toast.success(`Copied "${skill.name}" to ${destinationName}`)
      } else {
        toast.error('Failed to copy skill')
      }
    } catch {
      toast.error('Failed to copy skill')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <Collapsible>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelection}
              />
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">{skill.name}</CardTitle>
                {skill.description && (
                  <CardDescription className="text-xs line-clamp-2">
                    {skill.description}
                  </CardDescription>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {copyDestinations.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={isCopying}>
                      {isCopying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="ml-1 text-xs">Copy</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {copyDestinations.map((project) => (
                      <DropdownMenuItem
                        key={project.path}
                        onClick={() => handleCopy(project.path, project.name)}
                      >
                        {project.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isDeleting}>
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete skill?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{skill.name}" from disk. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <span className="mr-1 text-xs">View</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2">
            <div className="rounded-lg bg-muted/50 p-3 max-h-80 overflow-y-auto">
              <MarkdownViewer content={skill.content} />
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
              {skill.path}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
