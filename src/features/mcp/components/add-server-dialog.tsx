/**
 * Add MCP Server Dialog
 *
 * Form dialog for adding a new MCP server to a project.
 * Supports HTTP, SSE, and stdio server types.
 */

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { addMcpServer } from '@/shared/services/mcp/server-functions'
import type { McpServerConfig } from '@/shared/services/mcp/types'

interface ProjectOption {
  path: string
  name: string
}

interface AddServerDialogProps {
  allProjects: ProjectOption[]
  onSuccess?: () => void
}

type ServerType = 'http' | 'sse' | 'stdio'

export function AddServerDialog({ allProjects, onSuccess }: AddServerDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [projectPath, setProjectPath] = useState('')
  const [serverName, setServerName] = useState('')
  const [serverType, setServerType] = useState<ServerType>('http')
  const [url, setUrl] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [headers, setHeaders] = useState('')
  const [env, setEnv] = useState('')

  function resetForm() {
    setProjectPath('')
    setServerName('')
    setServerType('http')
    setUrl('')
    setCommand('')
    setArgs('')
    setHeaders('')
    setEnv('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!projectPath || !serverName) {
      toast.error('Please select a project and enter a server name')
      return
    }

    // Validate based on server type
    if ((serverType === 'http' || serverType === 'sse') && !url) {
      toast.error('URL is required for HTTP/SSE servers')
      return
    }

    if (serverType === 'stdio' && !command) {
      toast.error('Command is required for stdio servers')
      return
    }

    // Build server config
    const serverConfig: McpServerConfig = { type: serverType }

    if (serverType === 'http' || serverType === 'sse') {
      serverConfig.url = url
    }

    if (serverType === 'http' && headers.trim()) {
      try {
        serverConfig.headers = JSON.parse(headers)
      } catch {
        toast.error('Invalid JSON for headers')
        return
      }
    }

    if (serverType === 'stdio') {
      serverConfig.command = command
      if (args.trim()) {
        serverConfig.args = args.split(',').map(a => a.trim()).filter(Boolean)
      }
      if (env.trim()) {
        try {
          serverConfig.env = JSON.parse(env)
        } catch {
          toast.error('Invalid JSON for environment variables')
          return
        }
      }
    }

    setIsSubmitting(true)

    try {
      const result = await addMcpServer({
        data: { projectPath, serverName, serverConfig },
      })

      if (result.success) {
        toast.success(`Added "${serverName}" to project`)
        resetForm()
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to add server')
      }
    } catch {
      toast.error('Failed to add server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add MCP Server
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
            <DialogDescription>
              Add a new MCP server to a project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Project selection */}
            <div className="grid gap-2">
              <Label htmlFor="project">Project</Label>
              <Select value={projectPath} onValueChange={setProjectPath}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {allProjects.map((project) => (
                    <SelectItem key={project.path} value={project.path}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Server name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                value={serverName}
                onChange={(e) => setServerName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="my-server"
              />
            </div>

            {/* Server type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={serverType} onValueChange={(v) => setServerType(v as ServerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP (REST API)</SelectItem>
                  <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                  <SelectItem value="stdio">stdio (Local Process)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL for HTTP/SSE */}
            {(serverType === 'http' || serverType === 'sse') && (
              <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://mcp.example.com/mcp"
                />
              </div>
            )}

            {/* Headers for HTTP */}
            {serverType === 'http' && (
              <div className="grid gap-2">
                <Label htmlFor="headers">Headers (JSON, optional)</Label>
                <Input
                  id="headers"
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder='{"Authorization": "Bearer ..."}'
                />
              </div>
            )}

            {/* Command for stdio */}
            {serverType === 'stdio' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="command">Command</Label>
                  <Input
                    id="command"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="node"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="args">Arguments (comma-separated)</Label>
                  <Input
                    id="args"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="server.js, --port, 3000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="env">Environment (JSON, optional)</Label>
                  <Input
                    id="env"
                    value={env}
                    onChange={(e) => setEnv(e.target.value)}
                    placeholder='{"NODE_ENV": "production"}'
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Server
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
