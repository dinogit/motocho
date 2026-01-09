/**
 * Transcripts service commands
 *
 * Reads and processes Claude session transcripts from ~/.claude/projects/
 * Supports JSONL parsing with pagination, stats calculation, and file operations
 */

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};

// ============================================================================
// Constants
// ============================================================================

const MESSAGES_PER_PAGE: usize = 5;

// ============================================================================
// Type Definitions - Match TypeScript interfaces
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub path: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "sessionCount")]
    pub session_count: usize,
    #[serde(rename = "lastModified")]
    pub last_modified: i64, // Unix timestamp in ms
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "lastModified")]
    pub last_modified: i64, // Unix timestamp in ms
    #[serde(rename = "messageCount")]
    pub message_count: usize,
    pub summary: String,
    pub stats: Option<SessionStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStats {
    #[serde(rename = "promptCount")]
    pub prompt_count: usize,
    #[serde(rename = "messageCount")]
    pub message_count: usize,
    #[serde(rename = "toolCallCount")]
    pub tool_call_count: usize,
    #[serde(rename = "totalCostUsd")]
    pub total_cost_usd: f64,
    #[serde(rename = "totalPages")]
    pub total_pages: usize,
    #[serde(rename = "durationMs")]
    pub duration_ms: u64,
    #[serde(rename = "startTimestamp")]
    pub start_timestamp: Option<String>,
    #[serde(rename = "endTimestamp")]
    pub end_timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub uuid: String,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub timestamp: String,
    pub content: Vec<serde_json::Value>,
    pub model: Option<String>,
    pub usage: Option<TokenUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    #[serde(rename = "inputTokens")]
    pub input_tokens: u32,
    #[serde(rename = "outputTokens")]
    pub output_tokens: u32,
    #[serde(rename = "cacheCreationTokens")]
    pub cache_creation_tokens: u32,
    #[serde(rename = "cacheReadTokens")]
    pub cache_read_tokens: u32,
    #[serde(rename = "totalTokens")]
    pub total_tokens: u32,
    #[serde(rename = "costUsd")]
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionDetails {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "lastModified")]
    pub last_modified: i64,
    #[serde(rename = "messageCount")]
    pub message_count: usize,
    pub summary: String,
    pub stats: Option<SessionStats>,
    pub messages: Vec<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedMessages {
    pub messages: Vec<Message>,
    #[serde(rename = "totalPages")]
    pub total_pages: usize,
    #[serde(rename = "currentPage")]
    pub current_page: usize,
    #[serde(rename = "totalMessages")]
    pub total_messages: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectStats {
    #[serde(rename = "totalCost")]
    pub total_cost: f64,
    #[serde(rename = "linesWritten")]
    pub lines_written: usize,
    #[serde(rename = "timeSpentMs")]
    pub time_spent_ms: u64,
    #[serde(rename = "sessionCount")]
    pub session_count: usize,
    #[serde(rename = "totalMessages")]
    pub total_messages: usize,
    #[serde(rename = "totalToolCalls")]
    pub total_tool_calls: usize,
    #[serde(rename = "firstSession")]
    pub first_session: Option<String>,
    #[serde(rename = "lastSession")]
    pub last_session: Option<String>,
}

// Raw types for parsing
#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum RawEntry {
    Summary(RawSummaryEntry),
    Log(RawLogEntry),
}

#[derive(Debug, Deserialize)]
struct RawSummaryEntry {
    #[serde(rename = "type")]
    entry_type: String,
    summary: String,
    #[serde(rename = "leafUuid")]
    leaf_uuid: String,
}

#[derive(Debug, Deserialize)]
struct RawLogEntry {
    #[serde(rename = "parentUuid")]
    parent_uuid: Option<String>,
    uuid: String,
    #[serde(rename = "type")]
    entry_type: String,
    message: RawMessage,
    timestamp: String,
    #[serde(rename = "costUsd")]
    cost_usd: Option<f64>,
    #[serde(rename = "durationMs")]
    duration_ms: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct RawMessage {
    role: String,
    content: serde_json::Value, // Can be string or array
    model: Option<String>,
    usage: Option<RawUsage>,
}

#[derive(Debug, Deserialize)]
struct RawUsage {
    input_tokens: u32,
    output_tokens: u32,
    #[serde(default)]
    cache_creation_input_tokens: u32,
    #[serde(default)]
    cache_read_input_tokens: u32,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_projects_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home_dir.join(".claude").join("projects"))
}

fn parse_project_id(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string()
}

fn parse_session_id(filename: &str) -> String {
    filename.trim_end_matches(".jsonl").to_string()
}

fn get_file_modified_time(path: &Path) -> i64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

async fn read_session_entries(session_path: &Path) -> Result<Vec<RawLogEntry>, String> {
    let file = tokio::fs::File::open(session_path)
        .await
        .map_err(|e| format!("Failed to open session file: {}", e))?;

    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let mut entries = Vec::new();
    let mut summary = String::new();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| format!("Error reading line: {}", e))?
    {
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<RawEntry>(&line) {
            Ok(RawEntry::Summary(s)) => {
                summary = s.summary;
            }
            Ok(RawEntry::Log(log_entry)) => {
                entries.push(log_entry);
            }
            Err(e) => {
                log::warn!("Failed to parse entry: {}", e);
            }
        }
    }

    Ok(entries)
}

fn transform_message(entry: &RawLogEntry) -> Message {
    let content = match &entry.message.content {
        Value::String(s) => {
            vec![serde_json::json!({ "type": "text", "text": s })]
        }
        Value::Array(arr) => arr.clone(),
        _ => vec![],
    };

    let usage = entry.message.usage.as_ref().map(|u| TokenUsage {
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_creation_tokens: u.cache_creation_input_tokens,
        cache_read_tokens: u.cache_read_input_tokens,
        total_tokens: u.input_tokens + u.output_tokens,
        cost_usd: entry.cost_usd.unwrap_or(0.0),
    });

    Message {
        uuid: entry.uuid.clone(),
        msg_type: entry.entry_type.clone(),
        timestamp: entry.timestamp.clone(),
        content,
        model: entry.message.model.clone(),
        usage,
    }
}

fn calculate_session_stats(entries: &[RawLogEntry], total_cost: f64, duration_ms: u64) -> SessionStats {
    let mut prompt_count = 0;
    let mut tool_call_count = 0;

    for entry in entries {
        if entry.parent_uuid.is_none() && entry.entry_type == "user" {
            prompt_count += 1;
        }

        // Count tool_use blocks in content
        if let Value::Array(arr) = &entry.message.content {
            for block in arr {
                if let Some("tool_use") = block.get("type").and_then(|v| v.as_str()) {
                    tool_call_count += 1;
                }
            }
        }
    }

    let message_count = entries.len();
    let total_pages = (message_count + MESSAGES_PER_PAGE - 1) / MESSAGES_PER_PAGE;

    let (start_timestamp, end_timestamp) = if !entries.is_empty() {
        (
            Some(entries.first().unwrap().timestamp.clone()),
            Some(entries.last().unwrap().timestamp.clone()),
        )
    } else {
        (None, None)
    };

    SessionStats {
        prompt_count,
        message_count,
        tool_call_count,
        total_cost_usd: total_cost,
        total_pages,
        duration_ms,
        start_timestamp,
        end_timestamp,
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all projects from ~/.claude/projects/
#[tauri::command]
pub async fn get_projects() -> Result<Vec<Project>, String> {
    let projects_dir = get_projects_dir()?;

    if !projects_dir.exists() {
        return Ok(Vec::new());
    }

    let mut projects = Vec::new();

    for entry in fs::read_dir(&projects_dir).map_err(|e| format!("Failed to read projects dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            let project_id = parse_project_id(&path);
            let display_name = project_id.clone();

            // Count sessions
            let session_count = fs::read_dir(&path)
                .ok()
                .map(|entries| {
                    entries
                        .filter_map(|e| {
                            e.ok().and_then(|entry| {
                                let p = entry.path();
                                if p.extension().map(|ext| ext == "jsonl").unwrap_or(false) {
                                    Some(())
                                } else {
                                    None
                                }
                            })
                        })
                        .count()
                })
                .unwrap_or(0);

            let last_modified = get_file_modified_time(&path);

            projects.push(Project {
                id: project_id,
                path: path.to_string_lossy().to_string(),
                display_name,
                session_count,
                last_modified,
            });
        }
    }

    // Sort by last modified descending
    projects.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

    Ok(projects)
}

/// Get all sessions for a project
#[tauri::command]
pub async fn get_project_sessions(project_id: String) -> Result<Vec<Session>, String> {
    let projects_dir = get_projects_dir()?;
    let project_path = projects_dir.join(&project_id);

    if !project_path.exists() {
        return Err(format!("Project not found: {}", project_id));
    }

    let mut sessions = Vec::new();

    for entry in fs::read_dir(&project_path).map_err(|e| format!("Failed to read sessions: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.extension().map(|ext| ext == "jsonl").unwrap_or(false) {
            let filename = path.file_name().unwrap().to_string_lossy().to_string();
            let session_id = parse_session_id(&filename);

            // Quick count of messages
            let message_count = tokio::fs::read_to_string(&path)
                .await
                .ok()
                .map(|content| content.lines().filter(|l| !l.trim().is_empty()).count())
                .unwrap_or(0);

            let last_modified = get_file_modified_time(&path);

            sessions.push(Session {
                id: session_id,
                project_id: project_id.clone(),
                file_path: path.to_string_lossy().to_string(),
                last_modified,
                message_count,
                summary: String::new(),
                stats: None,
            });
        }
    }

    // Sort by last modified descending
    sessions.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

    Ok(sessions)
}

/// Get session details with paginated messages
#[tauri::command]
pub async fn get_session_details(project_id: String, session_id: String, page: Option<usize>) -> Result<SessionDetails, String> {
    let projects_dir = get_projects_dir()?;
    let session_path = projects_dir.join(&project_id).join(format!("{}.jsonl", session_id));

    if !session_path.exists() {
        return Err("Session not found".to_string());
    }

    let entries = read_session_entries(&session_path).await?;

    let mut total_cost = 0.0;
    let mut total_duration = 0u64;

    for entry in &entries {
        if let Some(cost) = entry.cost_usd {
            total_cost += cost;
        }
        if let Some(duration) = entry.duration_ms {
            total_duration += duration;
        }
    }

    let stats = calculate_session_stats(&entries, total_cost, total_duration);
    let page_num = page.unwrap_or(1).saturating_sub(1); // Convert to 0-based
    let start_idx = page_num * MESSAGES_PER_PAGE;
    let end_idx = (start_idx + MESSAGES_PER_PAGE).min(entries.len());

    let paginated_messages: Vec<Message> = entries[start_idx..end_idx]
        .iter()
        .map(transform_message)
        .collect();

    let last_modified = get_file_modified_time(&session_path);

    Ok(SessionDetails {
        id: session_id,
        project_id,
        file_path: session_path.to_string_lossy().to_string(),
        last_modified,
        message_count: entries.len(),
        summary: String::new(),
        stats: Some(stats),
        messages: paginated_messages,
    })
}

/// Get paginated messages for a session
#[tauri::command]
pub async fn get_session_paginated(project_id: String, session_id: String, page: Option<usize>) -> Result<PaginatedMessages, String> {
    let projects_dir = get_projects_dir()?;
    let session_path = projects_dir.join(&project_id).join(format!("{}.jsonl", session_id));

    if !session_path.exists() {
        return Err("Session not found".to_string());
    }

    let entries = read_session_entries(&session_path).await?;
    let total_messages = entries.len();
    let total_pages = (total_messages + MESSAGES_PER_PAGE - 1) / MESSAGES_PER_PAGE;
    let page_num = page.unwrap_or(1).saturating_sub(1);

    if page_num >= total_pages && total_messages > 0 {
        return Err("Page out of range".to_string());
    }

    let start_idx = page_num * MESSAGES_PER_PAGE;
    let end_idx = (start_idx + MESSAGES_PER_PAGE).min(total_messages);

    let messages: Vec<Message> = entries[start_idx..end_idx]
        .iter()
        .map(transform_message)
        .collect();

    Ok(PaginatedMessages {
        messages,
        total_pages,
        current_page: page_num + 1,
        total_messages,
    })
}

/// Get aggregated statistics for a project
#[tauri::command]
pub async fn get_project_stats(project_id: String) -> Result<ProjectStats, String> {
    let projects_dir = get_projects_dir()?;
    let project_path = projects_dir.join(&project_id);

    if !project_path.exists() {
        return Err(format!("Project not found: {}", project_id));
    }

    let mut total_cost = 0.0;
    let mut total_messages = 0;
    let mut total_tool_calls = 0;
    let mut total_time_ms = 0u64;
    let mut session_count = 0;
    let mut first_session: Option<i64> = None;
    let mut last_session: Option<i64> = None;

    for entry in fs::read_dir(&project_path).map_err(|e| format!("Failed to read sessions: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.extension().map(|ext| ext == "jsonl").unwrap_or(false) {
            if let Ok(entries) = read_session_entries(&path).await {
                session_count += 1;
                total_messages += entries.len();

                for entry in &entries {
                    if let Some(cost) = entry.cost_usd {
                        total_cost += cost;
                    }
                    if let Some(duration) = entry.duration_ms {
                        total_time_ms += duration;
                    }

                    // Count tool_use blocks
                    if let Value::Array(arr) = &entry.message.content {
                        for block in arr {
                            if let Some("tool_use") = block.get("type").and_then(|v| v.as_str()) {
                                total_tool_calls += 1;
                            }
                        }
                    }

                    // Track time range
                    let modified = get_file_modified_time(&path);
                    if first_session.is_none() || modified < first_session.unwrap() {
                        first_session = Some(modified);
                    }
                    if last_session.is_none() || modified > last_session.unwrap() {
                        last_session = Some(modified);
                    }
                }
            }
        }
    }

    let first_session_str = first_session.map(|ts| {
        DateTime::<Utc>::from_timestamp(ts / 1000, 0)
            .map(|dt| dt.to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
            .unwrap_or_default()
    });

    let last_session_str = last_session.map(|ts| {
        DateTime::<Utc>::from_timestamp(ts / 1000, 0)
            .map(|dt| dt.to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
            .unwrap_or_default()
    });

    Ok(ProjectStats {
        total_cost,
        lines_written: 0, // TODO: Extract from Write/Edit tool calls
        time_spent_ms: total_time_ms,
        session_count,
        total_messages,
        total_tool_calls,
        first_session: first_session_str,
        last_session: last_session_str,
    })
}

/// Delete a session file
#[tauri::command]
pub async fn delete_session(project_id: String, session_id: String) -> Result<bool, String> {
    let projects_dir = get_projects_dir()?;
    let session_path = projects_dir.join(&project_id).join(format!("{}.jsonl", session_id));

    if !session_path.exists() {
        return Err("Session not found".to_string());
    }

    tokio::fs::remove_file(&session_path)
        .await
        .map_err(|e| format!("Failed to delete session: {}", e))?;

    Ok(true)
}
