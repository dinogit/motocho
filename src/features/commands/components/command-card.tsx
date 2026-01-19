import {ChevronDown, Copy, ExternalLink, BookOpen, Lightbulb, Terminal} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import type { Command } from '@/shared/types/commands'
import { getColorConfig } from '../lib/colors'

interface CommandCardProps {
  command: Command
}

export function CommandCard({
  command,
}: CommandCardProps) {

  return (
    <div className="flex flex-col border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-row items-center space-x-4 mb-4">
        <Terminal className="h-4 w-4 text-chart-1" />
        <p className="font-semibold">{command.name}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        {command.description}
      </p>
    </div>
  )
}
