/**
 * Skills Statistics Cards
 *
 * Displays overview statistics about skills configuration:
 * - Total projects scanned
 * - Projects with CLAUDE.md
 * - Projects with skills
 * - Total skills count
 */

import { FolderOpen, FileText, Sparkles, Zap } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import type { SkillsStats } from '@/shared/types/skills'

interface StatsCardsProps {
  stats: SkillsStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Projects',
      value: stats.totalProjects,
      icon: FolderOpen,
      description: 'With instructions or skills',
    },
    {
      label: 'CLAUDE.md',
      value: stats.projectsWithClaudeMd,
      icon: FileText,
      description: 'Projects with instructions',
    },
    {
      label: 'With Skills',
      value: stats.projectsWithSkills,
      icon: Sparkles,
      description: 'Projects with skills',
    },
    {
      label: 'Total Skills',
      value: stats.totalSkills,
      icon: Zap,
      description: 'Across all projects',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <card.icon className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
