import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'

const contextComponents = [
    { name: 'System prompt', tokens: '~3.2k', percent: '1.6%', control: 'Fixed', controllable: false },
    { name: 'System tools', tokens: '~15.5k', percent: '7.8%', control: 'Fixed', controllable: false },
    { name: 'MCP tools', tokens: '~5k+', percent: '2.5%+', control: '.claude/settings.local.json', controllable: true },
    { name: 'Skills', tokens: '~2-6k', percent: '1-3%', control: '.claude/skills/', controllable: true },
    { name: 'Memory files', tokens: 'varies', percent: 'varies', control: 'CLAUDE.md', controllable: true },
    { name: 'Messages', tokens: 'grows', percent: 'grows', control: 'Autocompact', controllable: false },
]

const optimizationTips = [
    {
        title: 'Remove unused form skills',
        description: 'If using React Hook Form, delete tanstack-form skill (or vice versa)',
        savings: '~2.6k tokens/request',
    },
    {
        title: 'Disable MCP when not needed',
        description: 'Remove shadcn from enabledMcpjsonServers when not adding components',
        savings: '~5k tokens/request',
    },
    {
        title: 'Keep CLAUDE.md lean',
        description: 'Only include essential instructions, not documentation',
        savings: 'varies',
    },
    {
        title: 'Start fresh sessions',
        description: 'Messages accumulate - new session resets to baseline',
        savings: 'resets message tokens',
    },
]

export function ContextOptimizationCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Context Window Optimization</CardTitle>
                <CardDescription>
                    Every request sends the full context. Reduce unused components to save tokens.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="font-medium mb-2">Context Components</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Component</TableHead>
                                <TableHead>Tokens</TableHead>
                                <TableHead>Control</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contextComponents.map((item) => (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.tokens}</TableCell>
                                    <TableCell>
                                        {item.controllable ? (
                                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                {item.control}
                                            </code>
                                        ) : (
                                            <Badge variant="secondary">{item.control}</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div>
                    <h4 className="font-medium mb-2">Quick Wins</h4>
                    <div className="space-y-3">
                        {optimizationTips.map((tip) => (
                            <div key={tip.title} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{tip.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                        {tip.savings}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{tip.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">How to Disable</h4>
                    <div className="space-y-2 text-sm">
                        <div>
                            <strong>Skills:</strong> Delete or rename folder in{' '}
                            <code className="bg-muted px-1 py-0.5 rounded">.claude/skills/</code>
                        </div>
                        <div>
                            <strong>MCP tools:</strong> Edit{' '}
                            <code className="bg-muted px-1 py-0.5 rounded">.claude/settings.local.json</code>
                            {' → remove from '}
                            <code className="bg-muted px-1 py-0.5 rounded">enabledMcpjsonServers</code>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}