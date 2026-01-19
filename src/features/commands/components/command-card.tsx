import { ChevronDown, Copy, ExternalLink, BookOpen, Lightbulb } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import type { Command } from '@/shared/types/commands'
import { getColorConfig } from '../lib/colors'

interface CommandCardProps {
  command: Command
  isExpanded: boolean
  onToggle: () => void
  delay?: number
  mounted?: boolean
}

export function CommandCard({
  command,
  isExpanded,
  onToggle,
  delay = 0,
  mounted = true,
}: CommandCardProps) {
  const config = getColorConfig(command.color)

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div
      className={`border rounded-lg transition-all duration-300 opacity-0 translate-y-4 ${
        isExpanded
          ? 'border-sky-500/50 bg-sky-500/5'
          : 'border-border hover:border-sky-500/30 hover:bg-sky-500/3'
      } ${config.glow}`}
      style={{
        animation: mounted ? `slideUp 0.6s ease-out ${delay}ms forwards` : 'none',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-start justify-between hover:opacity-75 transition-opacity"
      >
        <div className="flex items-start gap-4 flex-1">
          <div
            className={`p-2 rounded-lg border ${config.bg} ${config.border} ${config.text}`}
          />
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-lg font-bold font-mono text-foreground">
                {command.name}
              </code>
              {command.available && (
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                >
                  Available
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{command.description}</p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t px-6 py-4 space-y-6 bg-muted/30">
          {/* Full Description */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              Description
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {command.fullDescription}
            </p>
          </div>

          {/* Usage */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Usage</h4>
            <div className="bg-background rounded-md p-3 border border-border relative group">
              <code className="text-sm font-mono text-foreground">{command.usage}</code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleCopy(command.usage)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Parameters */}
          {command.parameters && command.parameters.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3">Parameters</h4>
              <div className="space-y-3">
                {command.parameters.map((param, idx) => (
                  <div key={idx} className="border border-border rounded-md p-3 bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono text-foreground">{param.name}</code>
                      <Badge
                        variant="outline"
                        className="text-xs bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400"
                      >
                        {param.type}
                      </Badge>
                      {param.required && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400"
                        >
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{param.description}</p>
                    {param.example && (
                      <p className="text-xs font-mono text-muted-foreground">
                        Example: <span className="text-foreground">{param.example}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Examples</h4>
            <div className="space-y-3">
              {command.examples.map((example, idx) => (
                <div key={idx} className="border border-border rounded-md p-3 bg-background">
                  <h5 className="text-sm font-semibold mb-1 text-foreground">
                    {example.title}
                  </h5>
                  <p className="text-xs text-muted-foreground mb-2">{example.description}</p>
                  <div className="bg-muted rounded p-2 relative group mb-2">
                    <code className="text-xs font-mono text-foreground block break-all">
                      {example.command}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCopy(example.command)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  {example.expectedOutput && (
                    <p className="text-xs font-mono text-muted-foreground">
                      Output:{' '}
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {example.expectedOutput}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Use Cases */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              When to Use
            </h4>
            <div className="space-y-2">
              {command.useCases.map((useCase, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-md"
                >
                  <p className="text-sm font-semibold text-foreground mb-1">{useCase.title}</p>
                  <p className="text-xs text-muted-foreground">{useCase.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-foreground font-semibold">When:</span> {useCase.when}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          {command.requirements && command.requirements.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Requirements</h4>
              <ul className="space-y-1">
                {command.requirements.map((req, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Commands */}
          {command.relatedCommands && command.relatedCommands.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Related Commands</h4>
              <div className="flex flex-wrap gap-2">
                {command.relatedCommands.map((cmdId, idx) => (
                  <Badge key={idx} variant="secondary" className="font-mono">
                    /{cmdId}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {command.links && Object.keys(command.links).length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Resources</h4>
              <div className="flex flex-wrap gap-2">
                {command.links.documentation && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(command.links?.documentation, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Documentation
                  </Button>
                )}
                {command.links.github && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(command.links?.github, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    GitHub
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
