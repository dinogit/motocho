import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { FlipVertical2, Search, Wrench, Plug } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: App,
})

const quickLinks = [
  {
    title: 'Transcripts',
    description: 'Browse and search your Claude Code conversation transcripts',
    href: '/transcripts',
    icon: FlipVertical2,
  },
  {
    title: 'History',
    description: 'Search all prompts across your Claude Code sessions',
    href: '/history',
    icon: Search,
  },
  {
    title: 'Tools',
    description: 'Reference guide for all internal tools',
    href: '/claude-code',
    icon: Wrench,
  },
  {
    title: 'MCP',
    description: 'View and manage Model Context Protocol servers',
    href: '/mcp',
    icon: Plug,
  },
]

function App() {
  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Motochō Dashboard</h1>
          <p className="text-muted-foreground">
            View and analyze your AI agents sessions, transcripts, and usage statistics.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <link.icon className="h-5 w-5 text-chart-1" />
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                  </div>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
