# Claude Code Dashboard

## Project Vision

A desktop-style application to browse, review, and learn from all Claude Code conversations.

## Goals

1. **View All Conversations** - Display complete conversation history including:
   - User prompts
   - Assistant responses with thinking blocks
   - Tool calls (Bash, Read, Write, Edit, Grep, Glob, etc.)
   - Tool results
   - Costs and timing

2. **Rate Conversations** - Allow users to rate conversations and individual messages:
   - Star/score individual prompts and responses
   - Mark particularly good or bad interactions
   - Add notes explaining what worked or didn't

3. **Learn from Ratings** - Use ratings and notes to improve Claude Code:
   - Export rated examples for fine-tuning
   - Generate preference data for RLHF
   - Create a personal knowledge base of effective prompts

## Data Source

Reads from `~/.claude/projects/` where Claude Code stores JSONL session files.

## Key Features

- Browse projects and sessions
- Full transcript viewing with pagination
- Session statistics (prompts, messages, tool calls, cost)
- Search across conversations
- Filter by date, project, or rating
- Export functionality

## Tech Stack

- TanStack Start (React + Vite)
- TanStack Router (file-based routing)
- Tailwind CSS + shadcn/ui components
- Server functions for file system access

## Learning Claude Code Tools

The `/claude-code` page serves as a reference guide for understanding how Claude Code works internally. Use this alongside your conversation transcripts to learn effective patterns.

### Tool Categories

1. **Core Tools** - File operations and command execution
   - `Read` before `Edit` or `Write` - always understand before changing
   - `Glob` for finding files, `Grep` for searching content
   - `Bash` for git, npm, and system commands

2. **Planning Tools** - Structure complex tasks
   - `TodoWrite` breaks work into trackable steps
   - `EnterPlanMode` for architectural decisions before coding
   - `AskUserQuestion` when requirements are unclear

3. **Sub-Agents** - Autonomous specialized workers
   - `Explore` agent for codebase discovery
   - `Plan` agent for implementation design
   - Run in background for parallel work

### Effective Prompting Patterns

**Be Specific:**
```
Bad:  "Fix the bug"
Good: "Fix the login error in src/auth/login.ts where users get 401 on valid credentials"
```

**Provide Context:**
```
Bad:  "Add a button"
Good: "Add a delete button to the user profile card that calls the /api/users/:id DELETE endpoint"
```

**Chain Tasks:**
```
"First search for all usages of getUserById, then update them to use the new async version, and run the tests"
```

### Reading Your Transcripts

When reviewing past conversations, look for:
- **Thinking blocks** - See Claude's reasoning process
- **Tool sequences** - Learn the order of operations (Glob → Read → Edit)
- **Error recovery** - How mistakes were identified and fixed
- **Clarifying questions** - When Claude asked for more info vs. made assumptions

### Rating Guidelines

When rating conversations for learning:
- ⭐⭐⭐⭐⭐ Perfect execution, clear thinking, efficient tool use
- ⭐⭐⭐⭐ Good result with minor inefficiencies
- ⭐⭐⭐ Completed but with unnecessary steps or confusion
- ⭐⭐ Required multiple corrections or missed requirements
- ⭐ Failed or produced incorrect results

Add notes explaining:
- What made the prompt effective or ineffective
- Which tool patterns worked well
- What context was missing that caused issues