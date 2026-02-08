# Motocho

A desktop dashboard for analyzing and reporting on Claude Code activity. Browse session transcripts, track token usage and costs, manage MCP servers, and generate reports — all from a single interface that reads directly from your local `~/.claude/` data.

## What It Does

Motocho reads the JSONL session transcripts and stats that Claude Code stores locally on your machine, then presents them as an organized, searchable dashboard with analytics and reporting capabilities. Think of it as a control center for everything Claude Code does across your projects.

### Key Features

- **Analytics Dashboard** — Track sessions, messages, tool calls, token usage, and costs over time. Includes daily activity charts, hourly heatmaps, model usage breakdowns, and source-aware tracking (Claude Code vs. Codex).
- **Session Transcripts** — Browse and search full conversation transcripts organized by project. View messages, tool calls, thinking blocks, and images with pagination for large sessions.
- **Report Generation** — Generate reports for specific date ranges with AI-powered summaries of what was accomplished.
- **History Search** — Search across all prompts and sessions, filtered by project or globally.
- **MCP Server Management** — View, add, and manage Model Context Protocol servers (global and per-project). Includes a marketplace for discovering plugins.
- **Skills & Instructions** — Browse `CLAUDE.md` files across projects, manage custom skills, and bulk-copy skills between projects.
- **Settings** — Configure global and project-specific Claude model settings, thinking mode, and other preferences.
- **Hooks Reference** — Interactive reference guide for Claude Code lifecycle hooks.
- **Documentation Generator** — Wizard-based docs generation from selected projects and sessions.

## Architecture

```
~/.claude/projects/           Claude Code's local JSONL transcripts & config
        |
        v
┌─────────────────────┐
│   Tauri Backend      │      Rust — file I/O, JSONL parsing, stats processing
│   (src-tauri/)       │      Exposes commands via Tauri IPC
└────────┬────────────┘
         |  invoke()
         v
┌─────────────────────┐
│  Service Layer       │      TypeScript — bridges Tauri commands to React
│  (src/shared/        │      Handles parsing, cost calculation, type mapping
│   services/)         │
└────────┬────────────┘
         |
         v
┌─────────────────────┐
│  React UI            │      TanStack Router pages + feature components
│  (src/routes/,       │      shadcn/ui + Recharts for visualization
│   src/features/)     │
└─────────────────────┘
```

### How Transcripts Are Parsed

1. The Rust backend reads JSONL files from `~/.claude/projects/{projectId}/sessions/{sessionId}.jsonl`
2. Each line is a JSON entry — `user`, `assistant`, `tool_use`, `tool_result`, `progress`, or `summary`
3. The TypeScript service layer maps raw entries into structured `Message` objects with content blocks, token usage, and timestamps
4. Cost is calculated per-message using model-specific pricing (Opus, Sonnet, Haiku)
5. Session stats (duration, message count, total cost) are computed and displayed

### How Analytics Work

- **Primary source**: `~/.claude/stats-cache.json` — pre-computed daily/hourly activity, model usage, and token counts
- **Secondary source**: Session transcripts parsed on-the-fly for detailed breakdowns
- **V2 analytics**: Splits metrics by source (Claude Code vs. Codex) with per-model token and cost tracking

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri 2.9 |
| Backend | Rust (tokio, serde, chrono) |
| Frontend | React 19, TypeScript 5.7 |
| Routing | TanStack Router (file-based) |
| UI Components | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |
| Build | Vite 7, pnpm |

## Project Structure

```
src/
├── features/          Feature modules by domain
│   ├── analytics/       Usage dashboard & charts
│   ├── transcripts/     Session transcript viewer
│   ├── history/         Prompt history search
│   ├── reports/         Report generation
│   ├── mcp/             MCP server management
│   ├── skills/          Skills & instructions
│   ├── settings/        Configuration UI
│   ├── hooks/           Hooks reference
│   ├── docs/            Documentation wizard
│   ├── files/           File change tracking
│   └── claude-code/     Tool reference
├── routes/            TanStack Router file-based pages
├── shared/
│   ├── services/        Tauri IPC client bridges
│   ├── types/           TypeScript interfaces
│   ├── components/      Reusable UI (shadcn, navigation, layout)
│   ├── hooks/           Custom React hooks
│   └── lib/             Utilities
src-tauri/
├── src/
│   ├── commands/        Rust command handlers (transcripts, analytics, MCP, etc.)
│   ├── docs/            Documentation generation logic
│   └── lib.rs           Tauri app setup
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development (frontend + Tauri)
pnpm tauri:dev

# Build for production
pnpm tauri:build

# Mac universal binary
pnpm tauri:build:mac

# Windows
pnpm tauri:build:windows
```

## License

Private
