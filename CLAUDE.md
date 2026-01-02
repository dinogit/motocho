# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Important
- ALL instructions within this document MUST BE FOLLOWED, these are not optional unless explicitly stated.
- ASK FOR CLARIFICATION If you are uncertain of any of thing within the document.
- DO NOT edit more code than you have to.
- DO NOT WASTE TOKENS, be succinct and concise.
- NEVER WRITE A BARREL FILE. This is a code smell.

## Task Estimation (ALWAYS)
Before starting any non-trivial task, ALWAYS provide:
1. **Estimated complexity**: Simple / Medium / Complex
2. **Estimated token cost**: Low (~5K) / Medium (~15K) / High (~30K+)
3. **Files to modify**: List the files you expect to touch
4. **Approach summary**: 1-2 sentences on your plan

If you are unsure of these, ask for clarification.

Example:
```
Complexity: Medium
Est. tokens: ~15K
Files: types.ts, parser.ts (new), server-functions.ts
Approach: Create parser module with categorization logic, integrate with existing instruction extractor.
```


## React
When working on React code, try avoid using useEffect. Use event handlers, props, and state instead wherever possible.