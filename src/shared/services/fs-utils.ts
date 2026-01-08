/**
 * TypeScript client for fs_utils Tauri commands
 *
 * This module provides type-safe access to all filesystem operations
 * exposed by the Rust backend via Tauri commands.
 */

import { invoke } from '@tauri-apps/api/core'

// ============================================================================
// Type Definitions
// ============================================================================

export interface FileMetadata {
  path: string
  is_dir: boolean
  is_file: boolean
  size: number // bytes
  modified: number // Unix timestamp in seconds
}

export interface DirEntry {
  name: string
  path: string
  is_dir: boolean
}

// ============================================================================
// Core File Operations
// ============================================================================

/**
 * Read entire file as UTF-8 string
 */
export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path })
}

/**
 * Write string to file (creates file if it doesn't exist, overwrites if it does)
 */
export async function writeFile(path: string, content: string): Promise<void> {
  return invoke<void>('write_file', { path, content })
}

/**
 * Read file as bytes
 */
export async function readFileBytes(path: string): Promise<number[]> {
  return invoke<number[]>('read_file_bytes', { path })
}

/**
 * Get file metadata (size, modified time, etc.)
 */
export async function getFileStat(path: string): Promise<FileMetadata> {
  return invoke<FileMetadata>('get_file_stat', { path })
}

// ============================================================================
// Directory Operations
// ============================================================================

/**
 * List directory contents
 * Returns sorted array of directory entries
 */
export async function readDir(path: string): Promise<DirEntry[]> {
  return invoke<DirEntry[]>('read_dir', { path })
}

/**
 * Check if file or directory exists
 */
export async function fileExists(path: string): Promise<boolean> {
  return invoke<boolean>('file_exists', { path })
}

/**
 * Create directory (creates parent directories as needed)
 */
export async function createDir(path: string): Promise<void> {
  return invoke<void>('create_dir', { path })
}

/**
 * Delete file
 */
export async function deleteFile(path: string): Promise<void> {
  return invoke<void>('delete_file', { path })
}

/**
 * Delete directory (recursively removes all contents)
 */
export async function deleteDir(path: string): Promise<void> {
  return invoke<void>('delete_dir', { path })
}

/**
 * Copy file from src to dest
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  return invoke<void>('copy_file', { src, dest })
}

/**
 * Rename/move file
 */
export async function renameFile(from: string, to: string): Promise<void> {
  return invoke<void>('rename_file', { from, to })
}

// ============================================================================
// JSONL File Operations (Optimized for Large Transcripts)
// ============================================================================

/**
 * Read JSONL file (newline-delimited JSON) as array of JSON objects
 * Optimized for large files - reads line by line
 *
 * Example file:
 * {"id": 1, "name": "foo"}
 * {"id": 2, "name": "bar"}
 *
 * Returns: [{"id": 1, "name": "foo"}, {"id": 2, "name": "bar"}]
 */
export async function readJsonl(path: string): Promise<Record<string, unknown>[]> {
  const lines = await invoke<Record<string, unknown>[]>('read_jsonl', { path })
  return lines
}

/**
 * Read JSONL file with pagination
 * Useful for large transcripts - returns only a specific range of lines
 *
 * @param path - Path to JSONL file
 * @param offset - Starting line number
 * @param limit - Maximum number of lines to return
 */
export async function readJsonlPaginated(
  path: string,
  offset: number,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const lines = await invoke<Record<string, unknown>[]>('read_jsonl_paginated', {
    path,
    offset,
    limit,
  })
  return lines
}

// ============================================================================
// Path Operations
// ============================================================================

/**
 * Get the user's home directory
 * E.g., /Users/dinokljuco on macOS, C:\Users\dinokljuco on Windows
 */
export async function getHomeDir(): Promise<string> {
  return invoke<string>('get_home_dir', {})
}

/**
 * Join path segments
 * Platform-aware (uses / on Unix, \ on Windows)
 */
export async function pathJoin(parts: string[]): Promise<string> {
  return invoke<string>('path_join', { parts })
}

/**
 * Get directory name from a path
 * E.g., /home/user/file.txt -> /home/user
 */
export async function pathDirname(path: string): Promise<string> {
  return invoke<string>('path_dirname', { path })
}

/**
 * Get file name from a path
 * E.g., /home/user/file.txt -> file.txt
 */
export async function pathBasename(path: string): Promise<string> {
  return invoke<string>('path_basename', { path })
}

/**
 * Normalize a path (resolve . and .., etc.)
 */
export async function pathNormalize(path: string): Promise<string> {
  return invoke<string>('path_normalize', { path })
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Read JSON file and parse it
 */
export async function readJson<T = unknown>(path: string): Promise<T> {
  const content = await readFile(path)
  return JSON.parse(content) as T
}

/**
 * Write object as JSON file
 */
export async function writeJson<T = unknown>(path: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2)
  return writeFile(path, content)
}

/**
 * Build a path and ensure it exists
 * E.g., buildPath(['~', '.claude', 'projects'])
 */
export async function buildPath(parts: string[]): Promise<string> {
  // Handle ~ expansion
  let expandedParts = parts
  if (parts[0] === '~') {
    const home = await getHomeDir()
    expandedParts = [home, ...parts.slice(1)]
  }

  return pathJoin(expandedParts)
}
