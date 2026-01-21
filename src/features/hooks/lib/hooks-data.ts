/**
 * Claude Code Hooks Reference Data
 *
 * Comprehensive documentation of all available hook types,
 * when they fire, and how to use them
 */

export interface HookType {
  id: string
  name: string
  event: string
  trigger: string
  purpose: string
  description: string
  supportedMatchers?: string[]
  inputSchema?: {
    commonFields: string[]
    eventSpecific: string[]
  }
  outputSchema?: {
    commonFields: string[]
    eventSpecific: string[]
  }
  supportsPromptHooks?: boolean
  supportsCommandHooks?: boolean
  examples?: Array<{
    title: string
    type: 'command' | 'prompt'
    code: string
    language: string
  }>
  bestPractices?: string[]
  securityConsiderations?: string[]
}

export const HOOK_TYPES: HookType[] = [
  {
    id: 'pre-tool-use',
    name: 'PreToolUse',
    event: 'PreToolUse',
    trigger: 'Before a tool executes',
    purpose: 'Validate/approve/deny/modify tool calls',
    description:
      'Fires before any tool is executed. Allows you to validate the tool call, modify its input, block execution, or require approval before proceeding.',
    supportedMatchers: [
      'Bash',
      'Read',
      'Write',
      'Edit',
      'Glob',
      'Grep',
      'WebFetch',
      'WebSearch',
      'Task',
      'mcp__*',
    ],
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: ['tool_name', 'tool_input', 'tool_use_id'],
    },
    outputSchema: {
      commonFields: ['continue', 'stopReason', 'suppressOutput', 'systemMessage'],
      eventSpecific: ['permissionDecision', 'permissionDecisionReason', 'updatedInput', 'additionalContext'],
    },
    supportsPromptHooks: false,
    supportsCommandHooks: true,
    examples: [
      {
        title: 'Block dangerous bash commands',
        type: 'command',
        language: 'python',
        code: `#!/usr/bin/env python3
import json
import re
import sys

DANGEROUS_PATTERNS = [
    (r'rm\\s+-rf\\s+/', 'Blocking recursive deletion of root'),
    (r'DROP\\s+TABLE', 'Blocking SQL DROP commands'),
]

input_data = json.load(sys.stdin)
tool_name = input_data.get("tool_name")
command = input_data.get("tool_input", {}).get("command", "")

if tool_name != "Bash":
    sys.exit(0)

for pattern, reason in DANGEROUS_PATTERNS:
    if re.search(pattern, command, re.IGNORECASE):
        print(reason, file=sys.stderr)
        sys.exit(2)  # Block

sys.exit(0)`,
      },
      {
        title: 'Enforce tool usage patterns',
        type: 'command',
        language: 'bash',
        code: `#!/bin/bash
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')

# Suggest rg instead of grep
if [[ "$TOOL" == "Bash" ]]; then
  CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
  if [[ "$CMD" =~ grep ]]; then
    echo "Consider using 'rg' instead of 'grep' for better performance" >&2
    exit 1  # Non-blocking warning
  fi
fi

exit 0`,
      },
    ],
    bestPractices: [
      'Keep validation logic fast (timeout: 60s)',
      'Only block on security concerns, not style preferences',
      'Use updatedInput to fix small issues automatically',
      'Provide clear error messages in stderr',
    ],
    securityConsiderations: [
      'Hooks execute arbitrary shell commands',
      'Validate and sanitize all input from stdin',
      'Always quote shell variables',
      'Check for path traversal attempts',
    ],
  },
  {
    id: 'permission-request',
    name: 'PermissionRequest',
    event: 'PermissionRequest',
    trigger: 'When user shown permission dialog',
    purpose: 'Allow/deny permissions automatically',
    description:
      'Fires when Claude Code requests permission to execute a tool. Allows automatic approval/denial based on custom logic, bypassing the user dialog.',
    supportedMatchers: [
      'Bash',
      'Read',
      'Write',
      'Edit',
      'Glob',
      'Grep',
      'WebFetch',
      'WebSearch',
    ],
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name', 'permission_mode'],
      eventSpecific: ['tool_name', 'tool_input'],
    },
    outputSchema: {
      commonFields: ['continue'],
      eventSpecific: ['permissionDecision', 'permissionDecisionReason'],
    },
    supportsPromptHooks: false,
    supportsCommandHooks: true,
    bestPractices: [
      'Use in CI/CD with restrictive rules',
      'Combine with PreToolUse for defense in depth',
      'Log all automatic approvals',
    ],
  },
  {
    id: 'post-tool-use',
    name: 'PostToolUse',
    event: 'PostToolUse',
    trigger: 'After tool completes successfully',
    purpose: 'Validate results, provide feedback',
    description:
      'Fires after a tool executes successfully. Allows you to validate the results, block execution if output is problematic, or provide additional context to Claude.',
    supportedMatchers: [
      'Bash',
      'Read',
      'Write',
      'Edit',
      'Glob',
      'Grep',
      'WebFetch',
      'WebSearch',
    ],
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: ['tool_name', 'tool_input', 'tool_response'],
    },
    outputSchema: {
      commonFields: ['continue'],
      eventSpecific: ['decision', 'reason', 'additionalContext'],
    },
    supportsPromptHooks: false,
    supportsCommandHooks: true,
    bestPractices: [
      'Validate output safety before allowing',
      'Add context to help Claude understand results',
      'Block only on critical issues',
    ],
  },
  {
    id: 'user-prompt-submit',
    name: 'UserPromptSubmit',
    event: 'UserPromptSubmit',
    trigger: 'User submits a prompt',
    purpose: 'Validate prompts, add context',
    description:
      'Fires when user submits a prompt. Allows validation, blocking unsafe prompts, or adding automatic context/instructions.',
    supportedMatchers: undefined,
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: ['user_message'],
    },
    outputSchema: {
      commonFields: [],
      eventSpecific: ['decision', 'reason', 'additionalContext'],
    },
    supportsPromptHooks: false,
    supportsCommandHooks: true,
    bestPractices: [
      'Add context from environment or codebase',
      'Validate prompt format',
      'Block only on clear safety issues',
    ],
  },
  {
    id: 'stop',
    name: 'Stop',
    event: 'Stop',
    trigger: 'Main agent finishes',
    purpose: 'Decide if Claude should continue',
    description:
      'Fires when the main Claude Code agent is about to finish. Allows you to evaluate if the work is complete or if Claude should continue.',
    supportedMatchers: undefined,
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: [],
    },
    outputSchema: {
      commonFields: [],
      eventSpecific: ['decision', 'reason'],
    },
    supportsPromptHooks: true,
    supportsCommandHooks: true,
    bestPractices: [
      'Use LLM evaluation for complex decisions',
      'Check for incomplete tasks before stopping',
      'Provide clear reasons for blocking',
    ],
  },
  {
    id: 'subagent-stop',
    name: 'SubagentStop',
    event: 'SubagentStop',
    trigger: 'Subagent finishes',
    purpose: 'Decide if subagent should continue',
    description:
      'Fires when a subagent (launched via Task tool) finishes. Allows evaluation of subagent work and decision to continue or stop.',
    supportedMatchers: undefined,
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: ['agent_type'],
    },
    outputSchema: {
      commonFields: [],
      eventSpecific: ['decision', 'reason'],
    },
    supportsPromptHooks: true,
    supportsCommandHooks: true,
  },
  {
    id: 'session-start',
    name: 'SessionStart',
    event: 'SessionStart',
    trigger: 'Session begins/resumes',
    purpose: 'Load context, setup environment',
    description:
      'Fires when a Claude Code session starts or resumes. Allows setup of environment variables, loading of context, and session initialization.',
    supportedMatchers: undefined,
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: [],
    },
    outputSchema: {
      commonFields: [],
      eventSpecific: [],
    },
    supportsPromptHooks: false,
    supportsCommandHooks: true,
    examples: [
      {
        title: 'Load environment from .env',
        type: 'command',
        language: 'bash',
        code: `#!/bin/bash

if [ -n "$CLAUDE_ENV_FILE" ]; then
  if [ -f .env ]; then
    grep -v '^#' .env >> "$CLAUDE_ENV_FILE"
  fi
fi

exit 0`,
      },
    ],
    bestPractices: [
      'Use CLAUDE_ENV_FILE to persist environment variables',
      'Load project-specific context and credentials',
      'Keep initialization fast',
    ],
    securityConsiderations: [
      'Never hardcode secrets in hooks',
      'Use CLAUDE_ENV_FILE for sensitive env vars (created in secure temp location)',
      'Validate paths to prevent injection',
    ],
  },
  {
    id: 'session-end',
    name: 'SessionEnd',
    event: 'SessionEnd',
    trigger: 'Session ends',
    purpose: 'Cleanup tasks, logging',
    description:
      'Fires when a Claude Code session ends. Allows cleanup tasks, logging session results, and resource cleanup.',
    supportedMatchers: undefined,
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: [],
    },
    outputSchema: {
      commonFields: [],
      eventSpecific: [],
    },
    supportsPromptHooks: false,
    supportsCommandHooks: true,
    bestPractices: ['Log session results', 'Cleanup temporary resources', 'Archive transcripts if needed'],
  },
  {
    id: 'notification',
    name: 'Notification',
    event: 'Notification',
    trigger: 'Claude Code sends notifications',
    purpose: 'Custom notification handling',
    description:
      'Fires when Claude Code wants to send a notification. Allows custom notification handling, filtering, or routing.',
    supportedMatchers: undefined,
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: ['notification_data'],
    },
    outputSchema: {
      commonFields: [],
      eventSpecific: ['handled'],
    },
    supportsPromptHooks: false,
    supportsCommandHooks: true,
  },
  {
    id: 'pre-compact',
    name: 'PreCompact',
    event: 'PreCompact',
    trigger: 'Before context compaction',
    purpose: 'Pre-compaction logic',
    description:
      'Fires before Claude Code compacts the conversation context. Allows cleanup or optimization before compaction.',
    supportedMatchers: undefined,
    inputSchema: {
      commonFields: ['session_id', 'transcript_path', 'cwd', 'hook_event_name'],
      eventSpecific: [],
    },
    outputSchema: {
      commonFields: [],
      eventSpecific: [],
    },
    supportsPromptHooks: false,
    supportsCommandHooks: true,
  },
]

export const HOOK_CONFIGURATION_PATHS = [
  '~/.claude/settings.json - User settings',
  '.claude/settings.json - Project settings',
  '.claude/settings.local.json - Local project settings (not committed)',
  'Plugin hooks in hooks/hooks.json',
  'Skills/agents via frontmatter',
]

export const HOOK_COMMANDS = [
  {
    command: 'claude --debug',
    description: 'Enable debug output to see hook execution',
  },
  {
    command: '/hooks',
    description: 'Display all registered hooks',
  },
]

export const HOOK_ENVIRONMENT_VARIABLES = [
  {
    name: 'CLAUDE_PROJECT_DIR',
    description: 'Project root (absolute path)',
  },
  {
    name: 'CLAUDE_ENV_FILE',
    description: 'SessionStart only, persist env vars here',
  },
  {
    name: 'CLAUDE_CODE_REMOTE',
    description: 'Set to "true" if web, unset if CLI',
  },
]