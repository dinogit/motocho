/**
 * AI Tool Definitions
 *
 * Tools that Claude can call during chat interactions.
 * These are used with TanStack AI for the transcript chat feature.
 */

import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'

/**
 * Tool to save content to the project's skill library
 */
export const saveToLibraryTool = toolDefinition({
  name: 'saveToLibrary',
  description: 'Save the current content as a reusable skill/snippet to the project library. Use this when the user asks to save, remember, or store something for later.',
  inputSchema: z.object({
    name: z.string().describe('A short, descriptive name for the skill (e.g., "auth-middleware", "error-handling-pattern")'),
    description: z.string().describe('A brief description of what this skill does or why it\'s useful'),
    tags: z.array(z.string()).describe('Tags for categorization (e.g., ["react", "auth", "patterns"])'),
    notes: z.string().optional().describe('Optional additional notes from the user'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    skillId: z.string().optional(),
    message: z.string(),
  }),
})

/**
 * Tool to list saved skills in the project library
 */
export const listLibraryTool = toolDefinition({
  name: 'listLibrary',
  description: 'List skills saved in the project library. Use this when the user asks what they have saved, or wants to see their library.',
  inputSchema: z.object({
    query: z.string().optional().describe('Optional search query to filter skills'),
    tags: z.array(z.string()).optional().describe('Optional tags to filter by'),
    limit: z.number().optional().describe('Maximum number of results to return'),
  }),
  outputSchema: z.object({
    skills: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      createdAt: z.string(),
    })),
    total: z.number(),
  }),
})

/**
 * Tool to search the project library
 */
export const searchLibraryTool = toolDefinition({
  name: 'searchLibrary',
  description: 'Search for specific skills in the project library. Use this when the user is looking for something they saved previously.',
  inputSchema: z.object({
    query: z.string().describe('Search query to find relevant skills'),
  }),
  outputSchema: z.object({
    skills: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      relevance: z.string().describe('Why this skill matches the query'),
    })),
  }),
})

/**
 * All available tools
 */
export const allTools = [saveToLibraryTool, listLibraryTool, searchLibraryTool]