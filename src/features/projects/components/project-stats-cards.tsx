/**
 * Project Statistics Cards
 *
 * Displays efficiency metrics for a project:
 * - Project Cost: Total spent on this project
 * - Lines Written: Total lines of code written via Write/Edit tools
 * - Time Spent: Total time Claude spent processing (from durationMs)
 * - Sessions: Number of conversation sessions
 *
 * These metrics help understand the investment in a project
 * and the productivity gains from using Claude Code.
 */

import { DollarSign, Code2, Clock, MessageSquare } from 'lucide-react'
import {
  Stat,
  StatLabel,
  StatValue,
  StatIndicator,
  StatDescription,
} from '@/shared/components/ui/stat'
import type { ProjectStats } from '@/shared/types/transcripts'

interface ProjectStatsCardsProps {
  stats: ProjectStats
}

/**
 * Format milliseconds to human-readable duration
 * e.g., 3600000 → "1h 0m"
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m`
  }

  return `${seconds}s`
}

/**
 * Format large numbers with K/M suffix
 * e.g., 12500 → "12.5K"
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toLocaleString()
}

/**
 * Format cost with dollar sign
 * e.g., 12.5678 → "$12.57"
 */
function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  return `$${cost.toFixed(2)}`
}

export function ProjectStatsCards({ stats }: ProjectStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat>
        <StatLabel>API Value</StatLabel>
        <StatValue>{formatCost(stats.totalCost)}</StatValue>
        <StatIndicator variant="icon" color="success">
          <DollarSign />
        </StatIndicator>
        <StatDescription>Token value (if paying per-token)</StatDescription>
      </Stat>

      <Stat>
        <StatLabel>Lines Written</StatLabel>
        <StatValue>{formatNumber(stats.linesWritten)}</StatValue>
        <StatIndicator variant="icon" color="info">
          <Code2 />
        </StatIndicator>
        <StatDescription>Code written via Write/Edit</StatDescription>
      </Stat>

      <Stat>
        <StatLabel>Time Spent</StatLabel>
        <StatValue>{formatDuration(stats.timeSpentMs)}</StatValue>
        <StatIndicator variant="icon" color="warning">
          <Clock />
        </StatIndicator>
        <StatDescription>Claude processing time</StatDescription>
      </Stat>

      <Stat>
        <StatLabel>Sessions</StatLabel>
        <StatValue>{stats.sessionCount}</StatValue>
        <StatIndicator variant="icon" color="default">
          <MessageSquare />
        </StatIndicator>
        <StatDescription>
          {stats.totalMessages} messages, {stats.totalToolCalls} tool calls
        </StatDescription>
      </Stat>
    </div>
  )
}