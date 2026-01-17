/**
 * Agent Editor Page
 *
 * Visual editor for editing user agents
 */

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Route } from '@/routes/agents.$name'

interface Agent {
  name: string
  description: string
  tools: string[]
  skills: string[]
  mcpServers: string[]
  model: string
  content: string
  path: string
  agentType: 'user' | 'plugin' | 'builtin'
  pluginName?: string
}
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
} from '@/shared/components/page/page-header'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'

const MODEL_OPTIONS = [
  { value: 'opus', label: 'Opus' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'haiku', label: 'Haiku' },
  { value: 'inherit', label: 'Inherit' },
  { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet (Latest)' },
  { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Latest)' },
]

const AVAILABLE_TOOLS = [
  'Bash', 'Glob', 'Grep', 'Read', 'Write', 'Edit', 'WebFetch', 'WebSearch',
  'TodoWrite', 'KillShell', 'BashOutput', 'LS', 'NotebookRead', 'NotebookEdit',
]

export function Page() {
  const navigate = useNavigate()
  const agent = Route.useLoaderData() as Agent | null

  if (!agent) {
    return (
      <div className="p-6">
        <p>Agent not found</p>
      </div>
    )
  }

  const [formData, setFormData] = useState({
    name: agent.name,
    description: agent.description,
    model: agent.model,
    tools: agent.tools,
    skills: agent.skills,
    mcpServers: agent.mcpServers,
    content: agent.content,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [newTool, setNewTool] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [newMcpServer, setNewMcpServer] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await invoke<void>('update_agent', {
        name: formData.name,
        description: formData.description,
        tools: formData.tools,
        skills: formData.skills,
        mcpServers: formData.mcpServers,
        model: formData.model,
        content: formData.content,
      })

      toast.success('Agent updated successfully')
      navigate({ to: '/agents' })
    } catch (error) {
      console.error('Failed to update agent:', error)
      toast.error('Failed to update agent')
    } finally {
      setIsSaving(false)
    }
  }

  const addTool = (tool: string) => {
    if (tool && !formData.tools.includes(tool)) {
      setFormData({ ...formData, tools: [...formData.tools, tool] })
      setNewTool('')
    }
  }

  const removeTool = (tool: string) => {
    setFormData({ ...formData, tools: formData.tools.filter(t => t !== tool) })
  }

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: [...formData.skills, skill] })
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) })
  }

  const addMcpServer = (server: string) => {
    if (server && !formData.mcpServers.includes(server)) {
      setFormData({ ...formData, mcpServers: [...formData.mcpServers, server] })
      setNewMcpServer('')
    }
  }

  const removeMcpServer = (server: string) => {
    setFormData({ ...formData, mcpServers: formData.mcpServers.filter(s => s !== server) })
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: '/agents' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <PageTitle>Edit: {agent.name}</PageTitle>
              <PageDescription>Modify agent configuration and prompt</PageDescription>
            </div>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Configuration</CardTitle>
            <CardDescription>Basic agent settings and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled
              />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData({ ...formData, model: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resources Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>Configure tools, skills, and MCP servers</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tools" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tools">Tools</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="mcp">MCP</TabsTrigger>
              </TabsList>

              {/* Tools Tab */}
              <TabsContent value="tools" className="space-y-4">
                <div className="space-y-2">
                  <Label>Available Tools</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TOOLS.filter(t => !formData.tools.includes(t)).map((tool) => (
                      <Badge
                        key={tool}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => addTool(tool)}
                      >
                        + {tool}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assigned Tools</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tools.map((tool) => (
                      <Badge
                        key={tool}
                        className="cursor-pointer"
                        onClick={() => removeTool(tool)}
                      >
                        {tool} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tool..."
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTool(newTool)
                      }
                    }}
                  />
                  <Button onClick={() => addTool(newTool)}>Add</Button>
                </div>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <div className="space-y-2">
                  <Label>Assigned Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.length === 0 && (
                      <p className="text-sm text-muted-foreground">No skills assigned</p>
                    )}
                    {formData.skills.map((skill) => (
                      <Badge
                        key={skill}
                        className="cursor-pointer"
                        onClick={() => removeSkill(skill)}
                      >
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill(newSkill)
                      }
                    }}
                  />
                  <Button onClick={() => addSkill(newSkill)}>Add</Button>
                </div>
              </TabsContent>

              {/* MCP Tab */}
              <TabsContent value="mcp" className="space-y-4">
                <div className="space-y-2">
                  <Label>Assigned MCP Servers</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.mcpServers.length === 0 && (
                      <p className="text-sm text-muted-foreground">No MCP servers assigned</p>
                    )}
                    {formData.mcpServers.map((server) => (
                      <Badge
                        key={server}
                        className="cursor-pointer"
                        onClick={() => removeMcpServer(server)}
                      >
                        {server} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add MCP server..."
                    value={newMcpServer}
                    onChange={(e) => setNewMcpServer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addMcpServer(newMcpServer)
                      }
                    }}
                  />
                  <Button onClick={() => addMcpServer(newMcpServer)}>Add</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Body/Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>Body (Markdown)</CardTitle>
            <CardDescription>Agent system prompt and instructions</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={20}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: '/agents' })}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}