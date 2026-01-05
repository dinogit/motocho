import {
  Terminal,
  FileText,
  FilePen,
  FileEdit,
  FolderSearch,
  Search,
  ListTodo,
  Map,
  CheckCircle,
  Globe,
  Bot,
  Wrench,
  Server,
  Brain,
  Code,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'

interface Tool {
  name: string
  description: string
  icon: React.ElementType
  parameters?: { name: string; type: string; description: string }[]
  example?: string
}

const coreTools: Tool[] = [
  {
    name: 'Bash',
    description: 'Execute shell commands in a persistent session. Used for git, npm, docker, and other terminal operations.',
    icon: Terminal,
    parameters: [
      { name: 'command', type: 'string', description: 'The command to execute' },
      { name: 'timeout', type: 'number', description: 'Optional timeout in ms (max 600000)' },
      { name: 'description', type: 'string', description: 'Short description of what the command does' },
    ],
    example: 'git status && git diff',
  },
  {
    name: 'Read',
    description: 'Read file contents from the filesystem. Supports text files, images, PDFs, and Jupyter notebooks.',
    icon: FileText,
    parameters: [
      { name: 'file_path', type: 'string', description: 'Absolute path to the file' },
      { name: 'offset', type: 'number', description: 'Line number to start from' },
      { name: 'limit', type: 'number', description: 'Number of lines to read' },
    ],
    example: '/Users/project/src/app.tsx',
  },
  {
    name: 'Write',
    description: 'Create or overwrite a file with new content. Must read the file first if it exists.',
    icon: FilePen,
    parameters: [
      { name: 'file_path', type: 'string', description: 'Absolute path to write to' },
      { name: 'content', type: 'string', description: 'Content to write' },
    ],
  },
  {
    name: 'Edit',
    description: 'Perform exact string replacements in files. The old_string must be unique in the file.',
    icon: FileEdit,
    parameters: [
      { name: 'file_path', type: 'string', description: 'Absolute path to the file' },
      { name: 'old_string', type: 'string', description: 'Text to replace (must be unique)' },
      { name: 'new_string', type: 'string', description: 'Replacement text' },
      { name: 'replace_all', type: 'boolean', description: 'Replace all occurrences' },
    ],
  },
  {
    name: 'Glob',
    description: 'Fast file pattern matching. Find files by name patterns like "**/*.tsx" or "src/**/*.ts".',
    icon: FolderSearch,
    parameters: [
      { name: 'pattern', type: 'string', description: 'Glob pattern to match' },
      { name: 'path', type: 'string', description: 'Directory to search in' },
    ],
    example: '**/*.test.ts',
  },
  {
    name: 'Grep',
    description: 'Search file contents using regex patterns. Built on ripgrep for speed.',
    icon: Search,
    parameters: [
      { name: 'pattern', type: 'string', description: 'Regex pattern to search' },
      { name: 'path', type: 'string', description: 'File or directory to search' },
      { name: 'glob', type: 'string', description: 'Filter files by pattern' },
      { name: 'output_mode', type: 'string', description: 'content | files_with_matches | count' },
    ],
    example: 'function\\s+\\w+',
  },
]

const planningTools: Tool[] = [
  {
    name: 'TodoWrite',
    description: 'Create and manage a structured task list. Track progress on complex multi-step tasks.',
    icon: ListTodo,
    parameters: [
      { name: 'todos', type: 'array', description: 'Array of todo items with content, status, and activeForm' },
    ],
    example: '[{ content: "Fix bug", status: "in_progress", activeForm: "Fixing bug" }]',
  },
  {
    name: 'EnterPlanMode',
    description: 'Transition into planning mode for designing implementation approaches before writing code.',
    icon: Map,
  },
  {
    name: 'ExitPlanMode',
    description: 'Signal that planning is complete and ready for user approval to begin implementation.',
    icon: CheckCircle,
  },
  {
    name: 'AskUserQuestion',
    description: 'Ask the user questions during execution to clarify requirements or get decisions.',
    icon: MessageSquare,
    parameters: [
      { name: 'questions', type: 'array', description: 'Array of questions with options (1-4 questions)' },
    ],
  },
]

const webTools: Tool[] = [
  {
    name: 'WebFetch',
    description: 'Fetch and analyze content from URLs. Converts HTML to markdown and processes with AI.',
    icon: Globe,
    parameters: [
      { name: 'url', type: 'string', description: 'URL to fetch content from' },
      { name: 'prompt', type: 'string', description: 'What to extract from the page' },
    ],
  },
  {
    name: 'WebSearch',
    description: 'Search the web for up-to-date information. Returns results with source links.',
    icon: Search,
    parameters: [
      { name: 'query', type: 'string', description: 'Search query' },
      { name: 'allowed_domains', type: 'array', description: 'Only include these domains' },
      { name: 'blocked_domains', type: 'array', description: 'Exclude these domains' },
    ],
  },
]

const subAgents = [
  {
    name: 'general-purpose',
    description: 'Research complex questions, search for code, and execute multi-step tasks autonomously.',
    icon: Bot,
    tools: 'All tools',
  },
  {
    name: 'Explore',
    description: 'Fast codebase exploration. Find files by patterns, search code for keywords, answer questions about architecture.',
    icon: FolderSearch,
    tools: 'All tools',
    levels: ['quick', 'medium', 'very thorough'],
  },
  {
    name: 'Plan',
    description: 'Software architect agent for designing implementation plans. Returns step-by-step plans with architectural trade-offs.',
    icon: Map,
    tools: 'All tools',
  },
  {
    name: 'claude-code-guide',
    description: 'Answer questions about Claude Code features, hooks, slash commands, MCP servers, and the Claude Agent SDK.',
    icon: Code,
    tools: 'Glob, Grep, Read, WebFetch, WebSearch',
  },
]

const mcpInfo = {
  title: 'MCP (Model Context Protocol)',
  description: 'MCP allows Claude Code to connect to external servers that provide additional tools and resources.',
  features: [
    'Connect to custom tool servers',
    'Access databases, APIs, and services',
    'Extend Claude Code with domain-specific capabilities',
    'Share tools across projects via configuration',
  ],
  config: `// .claude/settings.json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./mcp-server.js"]
    }
  }
}`,
}

export function Page() {
  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Claude Code Tools</PageTitle>
          <PageHeaderSeparator  />
          <PageDescription>
            Reference guide for all internal tools
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">

          {/* Core Tools */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Core Tools</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Essential tools for file operations and command execution
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {coreTools.map((tool) => (
                <ToolCard key={tool.name} tool={tool} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Planning Tools */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ListTodo className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Planning Tools</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Tools for task management and structured planning
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {planningTools.map((tool) => (
                <ToolCard key={tool.name} tool={tool} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Web Tools */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Web Tools</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Access web content and search for information
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {webTools.map((tool) => (
                <ToolCard key={tool.name} tool={tool} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Sub-Agents */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Sub-Agents</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Specialized agents launched via the Task tool for autonomous work
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {subAgents.map((agent) => (
                <Card key={agent.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <agent.icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                    </div>
                    <CardDescription>{agent.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Tools: </span>
                      {agent.tools}
                    </div>
                    {agent.levels && (
                      <div className="flex gap-1 mt-2">
                        {agent.levels.map((level) => (
                          <Badge key={level} variant="secondary" className="text-[10px]">
                            {level}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* MCP */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-5 w-5" />
              <h2 className="text-xl font-semibold">{mcpInfo.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{mcpInfo.description}</p>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc list-inside text-sm space-y-1">
                  {mcpInfo.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Configuration Example:</p>
                  <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                    {mcpInfo.config}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Special Tools */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Special Tools</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">NotebookEdit</CardTitle>
                  <CardDescription>
                    Edit Jupyter notebook cells. Replace, insert, or delete cells in .ipynb files.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">KillShell</CardTitle>
                  <CardDescription>
                    Terminate a long-running background shell by its ID.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">TaskOutput</CardTitle>
                  <CardDescription>
                    Retrieve output from a running or completed background task.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Skill</CardTitle>
                  <CardDescription>
                    Execute a skill (slash command) like /commit or /review-pr.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>
      </div>
    </>
  )
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <tool.icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{tool.name}</CardTitle>
        </div>
        <CardDescription>{tool.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tool.parameters && tool.parameters.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Parameters:</p>
            <div className="space-y-1">
              {tool.parameters.map((param) => (
                <div key={param.name} className="text-xs">
                  <code className="bg-muted px-1 rounded">{param.name}</code>
                  <span className="text-muted-foreground"> ({param.type})</span>
                  <span className="text-muted-foreground"> - {param.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tool.example && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Example:</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block">{tool.example}</code>
          </div>
        )}
      </CardContent>
    </Card>
  )
}