'use client'

import { ArrowLeft, AlertCircle, CheckCircle, Shield, Code2, Zap, Copy, Webhook } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Route } from '@/routes/hooks/$id'
import { useState } from 'react'
import {
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageHeaderSeparator,
  PageTitle
} from "@/shared/components/page/page-header.tsx";

export function HookDetailPage() {
  const { hook } = Route.useLoaderData()
  const [copiedExample, setCopiedExample] = useState<number | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedExample(idx)
    setTimeout(() => setCopiedExample(null), 2000)
  }

  const supportsCommand = hook.supportsCommandHooks !== false
  const supportsPrompt = hook.supportsPromptHooks

  return (
    <div>
      {/* Back Button */}
      {/*<div className="flex items-center gap-2">*/}
      {/*  <Link to="/hooks">*/}
      {/*    <Button variant="ghost" size="sm" className="gap-2">*/}
      {/*      <ArrowLeft className="h-4 w-4" />*/}
      {/*      Back to Hooks*/}
      {/*    </Button>*/}
      {/*  </Link>*/}
      {/*</div>*/}

      {/*/!* Header *!/*/}
      {/*<div className="space-y-2">*/}
      {/*  <div className="flex items-center gap-3">*/}
      {/*    <h1 className="text-4xl font-bold">{hook.name}</h1>*/}
      {/*    <Badge variant="secondary" className="text-base px-3 py-1">*/}
      {/*      {hook.event}*/}
      {/*    </Badge>*/}
      {/*  </div>*/}
      {/*  <p className="text-lg text-muted-foreground">{hook.trigger}</p>*/}
      {/*</div>*/}
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>{hook.name}</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            {hook.trigger}
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>

      <div className="space-y-6 p-6">

        {/* Purpose & Description */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{hook.purpose}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{hook.description}</p>
            </CardContent>
          </Card>
        </div>

        {/* Hook Type Support */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Hook Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {supportsCommand && (
                <Badge className="gap-2 px-3 py-1.5 text-sm">
                  <Code2 className="h-4 w-4" />
                  Command Hooks
                </Badge>
              )}
              {supportsPrompt && (
                <Badge variant="outline" className="gap-2 px-3 py-1.5 text-sm">
                  <Zap className="h-4 w-4" />
                  Prompt Hooks
                </Badge>
              )}
              {!supportsCommand && !supportsPrompt && (
                <p className="text-sm text-muted-foreground">No specific hook types</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supported Matchers */}
        {hook.supportedMatchers && (
          <Card>
            <CardHeader>
              <CardTitle>Supported Matchers</CardTitle>
              <CardDescription>
                Use these patterns in your hooks configuration to match specific tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {hook.supportedMatchers.map((matcher) => (
                  <div key={matcher} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code className="font-mono text-sm flex-1">{matcher}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(matcher, -1)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Input Schema */}
        {hook.inputSchema && (
          <Card>
            <CardHeader>
              <CardTitle>Input Fields</CardTitle>
              <CardDescription>
                Data available in your hook script's stdin (JSON format)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hook.inputSchema.commonFields.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Common Fields (All Hooks)</h4>
                  <div className="space-y-1">
                    {hook.inputSchema.commonFields.map((field) => (
                      <div
                        key={field}
                        className="p-2 bg-muted rounded font-mono text-xs flex items-center justify-between"
                      >
                        <span>{field}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(field, -1)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hook.inputSchema.eventSpecific.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Event Specific Fields</h4>
                  <div className="space-y-1">
                    {hook.inputSchema.eventSpecific.map((field) => (
                      <div
                        key={field}
                        className="p-2 bg-muted rounded font-mono text-xs flex items-center justify-between"
                      >
                        <span>{field}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(field, -1)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Output Schema */}
        {hook.outputSchema && (
          <Card>
            <CardHeader>
              <CardTitle>Output Fields</CardTitle>
              <CardDescription>
                Return this JSON structure from your hook script (exit code 0 for success)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hook.outputSchema.commonFields.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Common Fields</h4>
                  <div className="space-y-1">
                    {hook.outputSchema.commonFields.map((field) => (
                      <div
                        key={field}
                        className="p-2 bg-muted rounded font-mono text-xs flex items-center justify-between"
                      >
                        <span>{field}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(field, -1)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hook.outputSchema.eventSpecific.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Event Specific Fields</h4>
                  <div className="space-y-1">
                    {hook.outputSchema.eventSpecific.map((field) => (
                      <div
                        key={field}
                        className="p-2 bg-muted rounded font-mono text-xs flex items-center justify-between"
                      >
                        <span>{field}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(field, -1)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Examples */}
        {hook.examples && hook.examples.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>
                Practical implementations showing how to use this hook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hook.examples.map((example, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{example.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(example.code, idx)}
                    >
                      <Copy className="h-4 w-4" />
                      {copiedExample === idx ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded border overflow-auto max-h-96 text-xs">
                    <code>{example.code}</code>
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Best Practices */}
        {hook.bestPractices && hook.bestPractices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {hook.bestPractices.map((practice, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-muted-foreground">{practice}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Security Considerations */}
        {hook.securityConsiderations && hook.securityConsiderations.length > 0 && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>Security Considerations</AlertTitle>
            <AlertDescription>
              <ul className="mt-3 space-y-2">
                {hook.securityConsiderations.map((consideration, idx) => (
                  <li key={idx} className="flex gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{consideration}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Template */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Template</CardTitle>
            <CardDescription>
              Add this to your .claude/settings.json to use this hook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded border overflow-auto text-xs">
                <code>{`{
    "hooks": {
      "${hook.event}": [
        {
          "matcher": "YourToolName",
          "hooks": [
            {
              "type": "command",
              "command": "/path/to/your/hook-script.sh",
              "timeout": 60
            }
          ]
        }
      ]
    }
  }`}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `{
    "hooks": {
      "${hook.event}": [
        {
          "matcher": "YourToolName",
          "hooks": [
            {
              "type": "command",
              "command": "/path/to/your/hook-script.sh",
              "timeout": 60
            }
          ]
        }
      ]
    }
  }`,
                    -1
                  )
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}