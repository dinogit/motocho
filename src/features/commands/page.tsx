'use client'

import { useMemo, useState } from 'react'
import { Search, Sparkles, Terminal } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { StatCard } from './components/stat-card'
import { CommandCard } from './components/command-card'
import type { CommandsDashboardData } from '@/shared/types/commands'

interface CommandsPageProps {
  data: CommandsDashboardData | null
}

export function CommandsPage({ data }: CommandsPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredCommands = useMemo(() => {
    if (!data) return []

    let commands = data.commands

    if (selectedCategory !== 'all') {
      const category = data.categories.find(c => c.id === selectedCategory)
      if (category) {
        commands = commands.filter(c => category.commandIds.includes(c.id))
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      commands = commands.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.fullDescription.toLowerCase().includes(query)
      )
    }

    return commands
  }, [data, searchQuery, selectedCategory])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading commands...</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pb-12">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 opacity-30 dark:opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-violet-500/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative space-y-12">
        {/* Hero Section */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 text-white">
                <Terminal className="w-6 h-6" />
              </div>
              <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30">
                CLI Reference
              </Badge>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
              My Commands
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Master your workflow with {data.totalCommands} powerful commands. {data.installedCount} installed and ready to amplify your development power.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <StatCard label="Total Commands" value={data.totalCommands} color="sky" delay={0} />
            <StatCard label="Installed" value={data.installedCount} color="emerald" delay={100} />
            <StatCard label="Categories" value={data.categories.length} color="violet" delay={200} />
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="space-y-4 sticky top-0 z-10 py-4 backdrop-blur-md bg-background/80 -mx-6 px-6 rounded-lg border border-border/50 animate-in fade-in duration-700 delay-100">
          <div className="relative group">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground group-focus-within:text-sky-500 transition-colors" />
            <Input
              placeholder="Search commands by name or function..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 h-11 rounded-lg border-sky-500/20 focus:border-sky-500/50 bg-background/50 backdrop-blur-sm transition-all"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/50 h-auto p-0 space-x-1">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-sky-500 data-[state=active]:bg-transparent transition-all px-4 py-2 text-sm font-medium"
              >
                All Commands
              </TabsTrigger>
              {data.categories.map((category, idx) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-sky-500 data-[state=active]:bg-transparent transition-all px-4 py-2 text-sm font-medium"
                  style={{ transitionDelay: `${idx * 50}ms` }}
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Commands Grid */}
        <div className="space-y-3">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-20 rounded-lg border border-dashed border-border/50 bg-muted/30">
              <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No commands found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or category filter</p>
            </div>
          ) : (
            filteredCommands.map((command, idx) => (
              <CommandCard
                key={command.id}
                command={command}
                isExpanded={expandedCommand === command.id}
                onToggle={() =>
                  setExpandedCommand(expandedCommand === command.id ? null : command.id)
                }
                delay={idx * 50}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
