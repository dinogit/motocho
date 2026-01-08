/**
 * Core file system utilities for all Tauri commands
 *
 * This module provides the foundation for all file operations:
 * - Reading/writing files
 * - Directory operations
 * - JSONL file handling (optimized for large transcript files)
 * - Path resolution
 */

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use tokio::io::{AsyncBufReadExt, BufReader};

// ============================================================================
// Type Definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub path: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
    pub modified: u64, // Unix timestamp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

// ============================================================================
// Core File Operations
// ============================================================================

/// Read entire file as string
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

/// Write string to file
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
    }

    fs::write(&path, &content)
        .await
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

/// Read file as bytes
#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path)
        .await
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

/// Get file metadata
#[tauri::command]
pub async fn get_file_stat(path: String) -> Result<FileMetadata, String> {
    let metadata = fs::metadata(&path)
        .await
        .map_err(|e| format!("Failed to stat file '{}': {}", path, e))?;

    Ok(FileMetadata {
        path: path.clone(),
        is_dir: metadata.is_dir(),
        is_file: metadata.is_file(),
        size: metadata.len(),
        modified: metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0),
    })
}

// ============================================================================
// Directory Operations
// ============================================================================

/// List directory contents
#[tauri::command]
pub async fn read_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let mut entries = Vec::new();
    let mut dir = fs::read_dir(&path)
        .await
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

    while let Some(entry) = dir
        .next_entry()
        .await
        .map_err(|e| format!("Error reading directory entries: {}", e))?
    {
        let metadata = entry
            .metadata()
            .await
            .map_err(|e| format!("Failed to get metadata: {}", e))?;

        let file_name = entry.file_name();
        let name = file_name.to_string_lossy().to_string();
        let entry_path = entry.path();
        let entry_path_str = entry_path.to_string_lossy().to_string();

        entries.push(DirEntry {
            name,
            path: entry_path_str,
            is_dir: metadata.is_dir(),
        });
    }

    // Sort by name for consistent results
    entries.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(entries)
}

/// Check if file/directory exists
#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    match fs::try_exists(&path).await {
        Ok(exists) => Ok(exists),
        Err(e) => Err(format!("Failed to check if file exists: {}", e)),
    }
}

/// Create directory
#[tauri::command]
pub async fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path)
        .await
        .map_err(|e| format!("Failed to create directory '{}': {}", path, e))
}

/// Delete file
#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path)
        .await
        .map_err(|e| format!("Failed to delete file '{}': {}", path, e))
}

/// Delete directory (recursive)
#[tauri::command]
pub async fn delete_dir(path: String) -> Result<(), String> {
    fs::remove_dir_all(&path)
        .await
        .map_err(|e| format!("Failed to delete directory '{}': {}", path, e))
}

/// Copy file
#[tauri::command]
pub async fn copy_file(src: String, dest: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&dest).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
    }

    fs::copy(&src, &dest)
        .await
        .map_err(|e| format!("Failed to copy file from '{}' to '{}': {}", src, dest, e))?;

    Ok(())
}

/// Rename/move file
#[tauri::command]
pub async fn rename_file(from: String, to: String) -> Result<(), String> {
    fs::rename(&from, &to)
        .await
        .map_err(|e| format!("Failed to rename file from '{}' to '{}': {}", from, to, e))
}

// ============================================================================
// JSONL File Operations (Optimized for Large Transcripts)
// ============================================================================

/// Read JSONL file (newline-delimited JSON) as array of JSON objects
/// This is optimized for large files by reading line-by-line
#[tauri::command]
pub async fn read_jsonl(path: String) -> Result<Vec<serde_json::Value>, String> {
    let file = fs::File::open(&path)
        .await
        .map_err(|e| format!("Failed to open file '{}': {}", path, e))?;

    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let mut results = Vec::new();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| format!("Error reading line: {}", e))?
    {
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<serde_json::Value>(&line) {
            Ok(json) => results.push(json),
            Err(e) => {
                // Log parsing error but continue processing
                log::warn!("Failed to parse JSONL line: {}", e);
            }
        }
    }

    Ok(results)
}

/// Read JSONL file with pagination (for large files)
/// Returns a specific range of lines
#[tauri::command]
pub async fn read_jsonl_paginated(
    path: String,
    offset: usize,
    limit: usize,
) -> Result<Vec<serde_json::Value>, String> {
    let file = fs::File::open(&path)
        .await
        .map_err(|e| format!("Failed to open file '{}': {}", path, e))?;

    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let mut results = Vec::new();
    let mut current_line = 0;

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| format!("Error reading line: {}", e))?
    {
        if line.trim().is_empty() {
            continue;
        }

        if current_line >= offset && current_line < offset + limit {
            match serde_json::from_str::<serde_json::Value>(&line) {
                Ok(json) => results.push(json),
                Err(e) => {
                    log::warn!("Failed to parse JSONL line: {}", e);
                }
            }
        }

        if current_line >= offset + limit {
            break;
        }

        current_line += 1;
    }

    Ok(results)
}

// ============================================================================
// Path Operations
// ============================================================================

/// Get the user's home directory
#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())
        .map(|p| p.to_string_lossy().to_string())
}

/// Join path segments
#[tauri::command]
pub fn path_join(parts: Vec<String>) -> Result<String, String> {
    if parts.is_empty() {
        return Err("No path parts provided".to_string());
    }

    let mut path = PathBuf::from(&parts[0]);
    for part in &parts[1..] {
        path.push(part);
    }

    Ok(path.to_string_lossy().to_string())
}

/// Get the directory name from a path
#[tauri::command]
pub fn path_dirname(path: String) -> Result<String, String> {
    PathBuf::from(&path)
        .parent()
        .ok_or_else(|| "No parent directory".to_string())
        .map(|p| p.to_string_lossy().to_string())
}

/// Get the file name from a path
#[tauri::command]
pub fn path_basename(path: String) -> Result<String, String> {
    PathBuf::from(&path)
        .file_name()
        .ok_or_else(|| "No file name in path".to_string())
        .map(|n| n.to_string_lossy().to_string())
}

/// Normalize a path
#[tauri::command]
pub fn path_normalize(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    Ok(p.canonicalize()
        .unwrap_or(p)
        .to_string_lossy()
        .to_string())
}
