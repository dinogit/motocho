# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Important
- ALL instructions within this document MUST BE FOLLOWED, these are not optional unless explicitly stated.
- ASK FOR CLARIFICATION If you are uncertain of any of thing within the document.
- DO NOT edit more code than you have to.
- DO NOT WASTE TOKENS, be succinct and concise.
- NEVER WRITE A BARREL FILE. This is a code smell.
- USE SHADCN UI components ALWAYS first.

Task Estimation (ALWAYS)
Before starting any non-trivial task, ALWAYS provide:

Estimated complexity: Simple / Medium / Complex
Estimated token cost: Low (~5K) / Medium (~15K) / High (~30K+)
Files to modify: List the files you expect to touch
Approach summary: 1-2 sentences on your plan
If you are unsure of these, ask for clarification.

Example:

Complexity: Medium
Est. tokens: ~15K
Files: types.ts, parser.ts (new), server-functions.ts
Approach: Create parser module with categorization logic, integrate with existing instruction extractor.

# Project Context

## Decision-Making Protocol
IMPORTANT: Before implementing ANY new feature or component, you MUST:
1. Ask clarifying questions about implementation approach
2. Present options for libraries/patterns to use
3. Wait for explicit user choice
4. Document the choice in this file for future reference

## Unknown Preferences
When implementing features where preferences aren't documented:
- STOP and ask before coding
- Present 2-3 common approaches
- Ask which one to use
- Add the answer to this document

## Component Preferences
### Forms
- [ ] NOT YET DEFINED - ASK USER
  Options: Plain HTML, React Hook Form, Tanstack Form, Formik

### State Management
- [ ] NOT YET DEFINED - ASK USER
  Options: useState, Context, Zustand, Redux

### Styling
- [ ] NOT YET DEFINED - ASK USER
  Options: Tailwind, CSS Modules, Styled Components

## React
When working on React code, try avoid using useEffect. Use event handlers, props, and state instead wherever possible.