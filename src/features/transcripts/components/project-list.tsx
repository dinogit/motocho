import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { Folder, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import type { Project } from '@/shared/services/transcripts/types'

interface ProjectListProps {
  projects: Project[]
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Folder className="h-12 w-12 mb-4" />
        <p className="text-lg">No projects found</p>
        <p className="text-sm">Claude Code sessions will appear here</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          to="/transcripts/$projectId"
          params={{ projectId: project.id }}
          className="block"
        >
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <Folder className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary">
                  {project.sessionCount} {project.sessionCount === 1 ? 'session' : 'sessions'}
                </Badge>
              </div>
              <CardTitle className="text-base leading-tight mt-2">
                {project.displayName}
              </CardTitle>
              <CardDescription className="text-xs truncate">
                {project.path}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(project.lastModified), { addSuffix: true })}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}