"use client"

import type React from "react"
import { useState } from "react"
import {
  MessageSquare,
  FileCode,
  Terminal,
  DollarSign,
  Clock,
  CalendarDays,
  GitBranch,
  RefreshCw,
  Trash2,
  Loader2,
  Activity,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
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
} from "@/shared/components/ui/alert-dialog"
import type { Session } from "@/shared/types/transcripts"

interface SessionCardProps {
  session: Session
  currentPage?: number
  totalPages?: number
  onRefresh?: () => Promise<void>
  onDelete?: () => Promise<void>
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function SessionCard({
  session,
  currentPage = 1,
  totalPages = 1,
  onRefresh,
  onDelete,
}: SessionCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const stats = session.stats

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh?.()
    setIsRefreshing(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete?.()
    setIsDeleting(false)
  }

  return (
    <Card className="overflow-hidden border-0 mb-12 bg-primary/5">
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <CardTitle className="text-xl font-semibold text-foreground leading-tight pr-4 flex items-center gap-3">
          {session.summary}
          {stats?.health && stats.health.status !== 'healthy' && (
            <div className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-medium flex items-center gap-1",
              stats.health.status === 'stalled' ? "text-amber-500 border-amber-500/30 bg-amber-500/10" :
                stats.health.status === 'expensive' ? "text-amber-500 border-amber-500/30 bg-amber-500/10" :
                  "text-red-500 border-red-500/30 bg-red-500/10"
            )}>
              <Activity className="h-3 w-3" />
              {stats.health.status}
            </div>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this session from disk. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        {stats && (
          <div className="flex flex-row justify-between gap-4">
            <StatItem
              icon={<MessageSquare className="h-4 w-4" />}
              value={stats.promptCount}
              label="prompts"
              color="text-chart-1"
            />
            <StatItem
              icon={<FileCode className="h-4 w-4" />}
              value={stats.messageCount}
              label="messages"
              color="text-chart-1"
            />
            <StatItem
              icon={<Terminal className="h-4 w-4" />}
              value={stats.toolCallCount}
              label="tool calls"
              color="text-chart-1"
            />
            {stats.totalCostUsd > 0 && (
              <StatItem
                icon={<DollarSign className="h-4 w-4" />}
                value={stats.totalCostUsd.toFixed(2)}
                label="cost"
                color="text-chart-1"
              />
            )}
            {stats.durationMs !== undefined && stats.durationMs > 0 && (
              <StatItem
                icon={<Clock className="h-4 w-4" />}
                value={formatDuration(stats.durationMs)}
                label="duration"
                color="text-chart-1"
              />
            )}
            <StatItem
              icon={<FileCode className="h-4 w-4" />}
              value={stats.totalPages}
              label="pages"
              color="text-chart-1"
            />
          </div>
        )}

        {/* Session Timing */}
        {stats?.startTimestamp && stats?.endTimestamp && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs p-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-chart-1" />
              <span className="text-muted-foreground/70">Start:</span>
              <span className="font-medium text-foreground/80">{new Date(stats.startTimestamp as string).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-chart-1" />
              <span className="text-muted-foreground/70">End:</span>
              <span className="font-medium text-foreground/80">{new Date(stats.endTimestamp as string).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Footer Metadata */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <code className="font-mono bg-muted/50 px-2 py-1 rounded text-foreground/70">
              Session ID: {session.id}
            </code>
            {stats?.gitBranch && (
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                <GitBranch className="h-3 w-3 text-red-500" />
                <span className="text-foreground/70">{stats.gitBranch}</span>
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatItem({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  color: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 w-fit">
      <span className={color}>{icon}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-semibold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}