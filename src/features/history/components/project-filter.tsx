import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { FolderOpen } from 'lucide-react'

interface Project {
  path: string
  name: string
  count: number
}

interface ProjectFilterProps {
  projects: Project[]
  value: string
  onChange: (value: string) => void
}

export function ProjectFilter({ projects, value, onChange }: ProjectFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="All projects" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All projects</SelectItem>
        {projects.map((project) => (
          <SelectItem key={project.path} value={project.path}>
            <span className="flex items-center justify-between gap-2 w-full">
              <span className="truncate">{project.name}</span>
              <span className="text-xs text-muted-foreground">{project.count}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}