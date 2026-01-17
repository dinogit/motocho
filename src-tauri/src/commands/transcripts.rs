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
use tokio::io::{AsyncBufReadExt, BufReader};
use uuid::Uuid;

// ============================================================================
// Constants
// ============================================================================

const MESSAGES_PER_PAGE: usize = 20;

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
    #[serde(rename = "gitBranch")]
    pub git_branch: Option<String>,
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
#[serde(tag = "type")]
enum RawEntry {
    #[serde(rename = "summary")]
    Summary(RawSummaryEntry),
    #[serde(other)]
    Other,
}

#[derive(Debug, Deserialize)]
struct LogEntryType {
    #[serde(rename = "type")]
    entry_type: String,
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
    uuid: Option<String>,
    #[serde(rename = "type")]
    entry_type: String,
    message: Option<RawMessage>,
    timestamp: String,
    #[serde(rename = "costUsd")]
    cost_usd: Option<f64>,
    #[serde(rename = "durationMs")]
    duration_ms: Option<u64>,
    #[serde(flatten)]
    _extra: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct RawMessage {
    role: String,
    content: serde_json::Value, // Can be string or array
    model: Option<String>,
    usage: Option<RawUsage>,
    #[serde(flatten)]
    _extra: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct RawUsage {
    input_tokens: u32,
    #[serde(default)]
    output_tokens: u32,
    #[serde(default)]
    cache_creation_input_tokens: u32,
    #[serde(default)]
    cache_read_input_tokens: u32,
    #[serde(rename = "costUsd")]
    cost_usd: Option<f64>,
    #[serde(flatten)]
    _extra: serde_json::Value,
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

fn decode_project_name(encoded_name: &str) -> String {
    // Decode encoded project names: replace dashes with slashes and extract last 2 path parts
    // e.g., "-path-to-project" becomes "path/to/project" -> "to/project"
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let decoded = encoded_name
            .chars()
            .enumerate()
            .map(|(_, c)| if c == '-' { '/' } else { c })
            .collect::<String>();

        let parts: Vec<&str> = decoded.split('/').filter(|s| !s.is_empty()).collect();
        if parts.len() >= 2 {
            format!("{}/{}", parts[parts.len() - 2], parts[parts.len() - 1])
        } else if parts.len() == 1 {
            parts[0].to_string()
        } else {
            encoded_name.to_string()
        }
    })) {
        Ok(result) => result,
        Err(_) => encoded_name.to_string(),
    }
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

async fn read_session_data(session_path: &Path) -> Result<(Vec<RawLogEntry>, String), String> {
    let file = tokio::fs::File::open(session_path)
        .await
        .map_err(|e| format!("Failed to open session file: {}", e))?;

    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let mut entries = Vec::new();
    let mut summary = String::new();
    let mut first_user_message = String::new();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| format!("Error reading line: {}", e))?
    {
        if line.trim().is_empty() {
            continue;
        }

        // Try to parse as RawEntry (tagged) first to catch Summary
        if let Ok(entry) = serde_json::from_str::<RawEntry>(&line) {
            match entry {
                RawEntry::Summary(s) => {
                    summary = s.summary;
                    continue;
                }
                RawEntry::Other => {} // Fall through to try parsing as Log
            }
        }

        // Try to parse as RawLogEntry (resilient)
        match serde_json::from_str::<RawLogEntry>(&line) {
            Ok(log_entry) => {
                // If we don't have a summary yet, try to capture the first user message as a fallback
                if summary.is_empty() && first_user_message.is_empty() && log_entry.entry_type == "user" {
                    if let Some(message) = &log_entry.message {
                        match &message.content {
                            Value::String(s) => {
                                first_user_message = s.chars().take(100).collect();
                            }
                            Value::Array(arr) => {
                                for block in arr {
                                    if block.get("type").and_then(|v| v.as_str()) == Some("text") {
                                        if let Some(text) = block.get("text").and_then(|v| v.as_str()) {
                                            first_user_message = text.chars().take(100).collect();
                                            break;
                                        }
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }
                entries.push(log_entry);
            }
            Err(e) => {
                // Only log if it's a type we expect to parse but failed
                if let Ok(type_check) = serde_json::from_str::<LogEntryType>(&line) {
                    if type_check.entry_type == "user" || type_check.entry_type == "assistant" {
                        log::warn!("Failed to parse {} entry: {}. Line: {}", type_check.entry_type, e, line);
                    }
                }
            }
        }
    }

    // Use first user message if summary is missing
    if summary.is_empty() && !first_user_message.is_empty() {
        summary = first_user_message;
    }

    Ok((entries, summary))
}

async fn read_session_entries(session_path: &Path) -> Result<Vec<RawLogEntry>, String> {
    let (entries, _) = read_session_data(session_path).await?;
    Ok(entries)
}

fn transform_message(entry: &RawLogEntry) -> Message {
    let content = if let Some(message) = &entry.message {
        match &message.content {
            Value::String(s) => {
                vec![serde_json::json!({ "type": "text", "text": s })]
            }
            Value::Array(arr) => arr.clone(),
            _ => vec![],
        }
    } else {
        vec![]
    };

    let usage = entry.message.as_ref().and_then(|m| m.usage.as_ref()).map(|u| TokenUsage {
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_creation_tokens: u.cache_creation_input_tokens,
        cache_read_tokens: u.cache_read_input_tokens,
        total_tokens: u.input_tokens + u.output_tokens,
        cost_usd: entry.cost_usd.unwrap_or(0.0),
    });

    Message {
        uuid: entry.uuid.clone().unwrap_or_default(),
        msg_type: entry.entry_type.clone(),
        timestamp: entry.timestamp.clone(),
        content,
        model: entry.message.as_ref().and_then(|m| m.model.clone()),
        usage,
    }
}

fn sum_session_metrics(entries: &[RawLogEntry]) -> (f64, u64) {
    let mut total_cost = 0.0;
    let mut total_duration = 0;

    for entry in entries {
        let mut entry_cost = 0.0;
        let mut has_cost = false;

        if let Some(cost) = entry.cost_usd {
            entry_cost = cost;
            has_cost = true;
        } else if let Some(message) = &entry.message {
            if let Some(usage) = &message.usage {
                if let Some(cost) = usage.cost_usd {
                    entry_cost = cost;
                    has_cost = true;
                }
            }
        }

        // Fallback to manual calculation if cost is not provided in the log
        if !has_cost {
            if let Some(message) = &entry.message {
                if let Some(usage) = &message.usage {
                    if let Some(model) = &message.model {
                        entry_cost = calculate_manual_cost(model, usage);
                    }
                }
            }
        }

        total_cost += entry_cost;

        if let Some(duration) = entry.duration_ms {
            total_duration += duration;
        }
    }

    (total_cost, total_duration)
}

fn calculate_manual_cost(model: &str, usage: &RawUsage) -> f64 {
    // Anthropic pricing per million tokens
    // Using current Claude 3.5/4 prices
    let (input_rate, output_rate, cache_write_rate, cache_read_rate) = match model {
        m if m.contains("opus") => (15.0, 75.0, 18.75, 1.5),
        m if m.contains("sonnet") => (3.0, 15.0, 3.75, 0.3),
        m if m.contains("haiku") => (0.25, 1.25, 0.3125, 0.03),
        _ => (3.0, 15.0, 3.75, 0.3), // Default to Sonnet pricing
    };

    let input_cost = (usage.input_tokens as f64 / 1_000_000.0) * input_rate;
    let output_cost = (usage.output_tokens as f64 / 1_000_000.0) * output_rate;
    let cache_write_cost = (usage.cache_creation_input_tokens as f64 / 1_000_000.0) * cache_write_rate;
    let cache_read_cost = (usage.cache_read_input_tokens as f64 / 1_000_000.0) * cache_read_rate;

    input_cost + output_cost + cache_write_cost + cache_read_cost
}

fn extract_agent_id(value: &Value) -> Option<String> {
    match value {
        Value::String(s) => {
            // Regex-like manual scan for agent-([a-f0-9]+)
            if let Some(pos) = s.find("agent-") {
                let start = pos;
                let mut end = start + 6;
                while end < s.len() && s.as_bytes()[end].is_ascii_hexdigit() {
                    end += 1;
                }
                if end > start + 6 {
                    return Some(s[start..end].to_string());
                }
            }
            // Check for Agent ID: XXXX
            if let Some(pos) = s.to_lowercase().find("agent id") {
                let s_after = &s[pos + 8..];
                let hex_start = s_after.find(|c: char| c.is_ascii_hexdigit())?;
                let mut end = hex_start;
                while end < s_after.len() && s_after.as_bytes()[end].is_ascii_hexdigit() {
                    end += 1;
                }
                if end > hex_start {
                    let id = &s_after[hex_start..end];
                    return Some(if id.starts_with("agent-") { id.to_string() } else { format!("agent-{}", id) });
                }
            }
            None
        }
        Value::Object(map) => {
            if let Some(Value::String(id)) = map.get("agentId").or(map.get("agent_id")) {
                return Some(if id.starts_with("agent-") { id.clone() } else { format!("agent-{}", id) });
            }
            // Recursive deep scan
            for val in map.values() {
                if let Some(id) = extract_agent_id(val) {
                    return Some(id);
                }
            }
            None
        }
        Value::Array(arr) => {
            for val in arr {
                if let Some(id) = extract_agent_id(val) {
                    return Some(id);
                }
            }
            None
        }
        _ => None,
    }
}

fn calculate_session_stats(entries: &[RawLogEntry], total_cost: f64) -> SessionStats {
    let mut prompt_count = 0;
    let mut tool_call_count = 0;
    let mut first_timestamp: Option<DateTime<Utc>> = None;
    let mut last_timestamp: Option<DateTime<Utc>> = None;
    let mut git_branch: Option<String> = None;

    for entry in entries {
        // Extract git branch from first entry that has it
        if git_branch.is_none() {
            if let Some(branch) = entry._extra.get("gitBranch").and_then(|v| v.as_str()) {
                git_branch = Some(branch.to_string());
            }
        }

        // Track timestamps for duration
        if let Ok(ts) = DateTime::parse_from_rfc3339(&entry.timestamp) {
            let ts_utc = ts.with_timezone(&Utc);
            if first_timestamp.is_none() || ts_utc < first_timestamp.unwrap() {
                first_timestamp = Some(ts_utc);
            }
            if last_timestamp.is_none() || ts_utc > last_timestamp.unwrap() {
                last_timestamp = Some(ts_utc);
            }
        }

        if entry.entry_type == "user" {
            prompt_count += 1;
        }

        // Count tool_use blocks in content
        if let Some(message) = &entry.message {
            if let Value::Array(arr) = &message.content {
                for block in arr {
                    if let Some("tool_use") = block.get("type").and_then(|v| v.as_str()) {
                        tool_call_count += 1;
                    }
                }
            }
        }
    }

    let duration_ms = if let (Some(first), Some(last)) = (first_timestamp, last_timestamp) {
        last.signed_duration_since(first).num_milliseconds().max(0) as u64
    } else {
        0
    };

    let message_count = entries.iter().filter(|e| e.message.is_some()).count();
    let total_pages = (message_count + MESSAGES_PER_PAGE - 1) / MESSAGES_PER_PAGE;

    let start_timestamp = first_timestamp.map(|ts| ts.to_rfc3339());
    let end_timestamp = last_timestamp.map(|ts| ts.to_rfc3339());

    SessionStats {
        prompt_count,
        message_count,
        tool_call_count,
        total_cost_usd: total_cost,
        total_pages,
        duration_ms,
        start_timestamp,
        end_timestamp,
        git_branch,
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
            let display_name = decode_project_name(&project_id);

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

    eprintln!("[get_project_sessions] project_id: {}", project_id);
    eprintln!("[get_project_sessions] project_path: {:?}", project_path);
    eprintln!("[get_project_sessions] exists: {}", project_path.exists());

    if !project_path.exists() {
        eprintln!("[get_project_sessions] Project directory not found at: {:?}", project_path);
        return Err(format!("Project not found: {}", project_id));
    }

    let mut sessions = Vec::new();

    match fs::read_dir(&project_path) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        eprintln!("[get_project_sessions] Found entry: {:?}", path);

                        if path.is_file() && path.extension().map(|ext| ext == "jsonl").unwrap_or(false) {
                            let filename = path.file_name().unwrap().to_string_lossy().to_string();
                            let session_id = parse_session_id(&filename);
                            eprintln!("[get_project_sessions] Found session file: {}", filename);

                            // Load session data for summary and stats
                            if let Ok((entries, summary)) = read_session_data(&path).await {
                                let (total_cost, _) = sum_session_metrics(&entries);
                                let stats = calculate_session_stats(&entries, total_cost);
                                let last_modified = get_file_modified_time(&path);

                                sessions.push(Session {
                                    id: session_id,
                                    project_id: project_id.clone(),
                                    file_path: path.to_string_lossy().to_string(),
                                    last_modified,
                                    message_count: stats.message_count,
                                    summary,
                                    stats: Some(stats),
                                });
                            } else {
                                // Fallback if file can't be read fully
                                let last_modified = get_file_modified_time(&path);
                                sessions.push(Session {
                                    id: session_id,
                                    project_id: project_id.clone(),
                                    file_path: path.to_string_lossy().to_string(),
                                    last_modified,
                                    message_count: 0,
                                    summary: String::new(),
                                    stats: None,
                                });
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[get_project_sessions] Failed to read entry: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("[get_project_sessions] Failed to read sessions dir: {}", e);
            return Err(format!("Failed to read sessions: {}", e));
        }
    }

    eprintln!("[get_project_sessions] Found {} sessions", sessions.len());

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

    let (entries, summary) = read_session_data(&session_path).await?;
    let (total_cost, _) = sum_session_metrics(&entries);
    let stats = calculate_session_stats(&entries, total_cost);

    // Multi-pass parsing to link agent IDs
    let mut messages: Vec<Message> = Vec::new();
    let mut tool_use_map: HashMap<String, usize> = HashMap::new(); // tool_use_id -> message index

    for entry in entries {
        // We only care about user, assistant, and agent_progress for the transcript
        if entry.entry_type != "user" && entry.entry_type != "assistant" && entry.entry_type != "agent_progress" {
            continue;
        }

        let mut msg = transform_message(&entry);
        
        // Populate agentId from metadata if available
        if entry.entry_type == "assistant" {
           for block in &mut msg.content {
               if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                   if let Some(id) = block.get("id").and_then(|i| i.as_str()) {
                       tool_use_map.insert(id.to_string(), messages.len());
                       // Early check for agentId in input
                       let subagent_id = block.get("input")
                           .and_then(|i| i.get("subagent_type"))
                           .and_then(|s| s.as_str())
                           .and_then(|s| if s.contains(':') { s.split(':').nth(1).map(|id| id.to_string()) } else { None });

                       if let Some(id) = subagent_id {
                           block.as_object_mut().unwrap().insert("agentId".to_string(), Value::String(id));
                       }
                   }
               }
           }
        } else if entry.entry_type == "user" {
            // Check tool_result for agentIds
            for block in &msg.content {
                if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                    if let Some(tool_use_id) = block.get("tool_use_id").and_then(|i| i.as_str()) {
                        if let Some(&msg_idx) = tool_use_map.get(tool_use_id) {
                            if let Some(agent_id) = extract_agent_id(block.get("content").unwrap_or(&Value::Null)) {
                                // Link back to tool_use block
                                for tool_block in &mut messages[msg_idx].content {
                                    if tool_block.get("id").and_then(|i: &Value| i.as_str()) == Some(tool_use_id) {
                                        tool_block.as_object_mut().unwrap().insert("agentId".to_string(), Value::String(agent_id.clone()));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if entry.entry_type == "agent_progress" {
            // Convert to progress message
            msg.msg_type = "progress".to_string();
            if let Some(data) = entry._extra.get("data") {
                 let prompt = data.get("prompt").and_then(|p| p.as_str()).unwrap_or("");
                 let agent_id = data.get("agentId")
                     .and_then(|a| a.as_str().map(|s| s.to_string()))
                     .or_else(|| extract_agent_id(data));
                 // parentToolUseID is at top level, not inside data
                 let parent_id = entry._extra.get("parentToolUseID").and_then(|p| p.as_str());

                 msg.content = vec![serde_json::json!({
                     "type": "progress",
                     "text": prompt,
                     "agentId": agent_id,
                 })];

                 if let (Some(pid), Some(ref aid)) = (parent_id, agent_id) {
                     if let Some(&msg_idx) = tool_use_map.get(pid) {
                         for tool_block in &mut messages[msg_idx].content {
                             if tool_block.get("id").and_then(|i: &Value| i.as_str()) == Some(pid) {
                                 tool_block.as_object_mut().unwrap().insert("agentId".to_string(), Value::String(aid.clone()));
                             }
                         }
                     }
                 }
            }
        }

        messages.push(msg);
    }

    // Sort newest first
    messages.sort_by(|a, b| {
        let a_ts = DateTime::parse_from_rfc3339(&a.timestamp).ok();
        let b_ts = DateTime::parse_from_rfc3339(&b.timestamp).ok();
        b_ts.cmp(&a_ts)
    });

    let page_num = page.unwrap_or(1).saturating_sub(1);
    let start_idx = page_num * MESSAGES_PER_PAGE;
    let end_idx = (start_idx + MESSAGES_PER_PAGE).min(messages.len());

    let paginated_messages = messages[start_idx..end_idx].to_vec();
    let message_count = messages.len();
    let last_modified = get_file_modified_time(&session_path);

    Ok(SessionDetails {
        id: session_id,
        project_id,
        file_path: session_path.to_string_lossy().to_string(),
        last_modified,
        message_count,
        summary,
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
    
    // Use the same robust multi-pass logic as get_session_details
    let mut messages: Vec<Message> = Vec::new();
    let mut tool_use_map: HashMap<String, usize> = HashMap::new();

    for entry in entries {
        if entry.entry_type != "user" && entry.entry_type != "assistant" && entry.entry_type != "agent_progress" {
            continue;
        }

        let mut msg = transform_message(&entry);
        
        if entry.entry_type == "assistant" {
           for block in &mut msg.content {
               if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                   if let Some(id) = block.get("id").and_then(|i| i.as_str()) {
                       tool_use_map.insert(id.to_string(), messages.len());
                       if block.get("name").and_then(|n| n.as_str()) == Some("Task") {
                           let subagent_id = block.get("input")
                               .and_then(|i| i.get("subagent_type"))
                               .and_then(|s| s.as_str())
                               .and_then(|s| if s.contains(':') { s.split(':').nth(1).map(|id| id.to_string()) } else { None });

                           if let Some(id) = subagent_id {
                               block.as_object_mut().unwrap().insert("agentId".to_string(), Value::String(id));
                           }
                       }
                   }
               }
           }
        } else if entry.entry_type == "user" {
            for block in &msg.content {
                if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                    if let Some(tool_use_id) = block.get("tool_use_id").and_then(|i| i.as_str()) {
                        if let Some(&msg_idx) = tool_use_map.get(tool_use_id) {
                            if let Some(agent_id) = extract_agent_id(block.get("content").unwrap_or(&Value::Null)) {
                                for tool_block in &mut messages[msg_idx].content {
                                    if tool_block.get("id").and_then(|i: &Value| i.as_str()) == Some(tool_use_id) {
                                        tool_block.as_object_mut().unwrap().insert("agentId".to_string(), Value::String(agent_id.clone()));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if entry.entry_type == "agent_progress" {
            msg.msg_type = "progress".to_string();
            if let Some(data) = entry._extra.get("data") {
                 let prompt = data.get("prompt").and_then(|p| p.as_str()).unwrap_or("");
                 let agent_id = data.get("agentId")
                     .and_then(|a| a.as_str().map(|s| s.to_string()))
                     .or_else(|| extract_agent_id(data));
                 // parentToolUseID is at top level, not inside data
                 let parent_id = entry._extra.get("parentToolUseID").and_then(|p| p.as_str());

                 msg.content = vec![serde_json::json!({
                     "type": "progress",
                     "text": prompt,
                     "agentId": agent_id,
                 })];

                 if let (Some(pid), Some(ref aid)) = (parent_id, agent_id) {
                     if let Some(&msg_idx) = tool_use_map.get(pid) {
                         for tool_block in &mut messages[msg_idx].content {
                             if tool_block.get("id").and_then(|i: &Value| i.as_str()) == Some(pid) {
                                 tool_block.as_object_mut().unwrap().insert("agentId".to_string(), Value::String(aid.clone()));
                             }
                         }
                     }
                 }
            }
        }
        messages.push(msg);
    }

    // Sort newest first
    messages.sort_by(|a, b| {
        let a_ts = DateTime::parse_from_rfc3339(&a.timestamp).ok();
        let b_ts = DateTime::parse_from_rfc3339(&b.timestamp).ok();
        b_ts.cmp(&a_ts)
    });

    let total_messages = messages.len();
    let total_pages = (total_messages + MESSAGES_PER_PAGE - 1) / MESSAGES_PER_PAGE;
    let page_num = page.unwrap_or(1).saturating_sub(1);

    if page_num >= total_pages && total_messages > 0 {
        return Err("Page out of range".to_string());
    }

    let start_idx = page_num * MESSAGES_PER_PAGE;
    let end_idx = (start_idx + MESSAGES_PER_PAGE).min(total_messages);

    Ok(PaginatedMessages {
        messages: messages[start_idx..end_idx].to_vec(),
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
    let mut lines_written = 0;
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
                
                // Track date range (once per session file is enough)
                let modified = get_file_modified_time(&path);
                if first_session.is_none() || modified < first_session.unwrap() {
                    first_session = Some(modified);
                }
                if last_session.is_none() || modified > last_session.unwrap() {
                    last_session = Some(modified);
                }

                let (session_cost, _) = sum_session_metrics(&entries);
                total_cost += session_cost;

                let mut session_first_ts: Option<DateTime<Utc>> = None;
                let mut session_last_ts: Option<DateTime<Utc>> = None;

                for entry in &entries {
                    // Track timestamps for project duration
                    if let Ok(ts) = DateTime::parse_from_rfc3339(&entry.timestamp) {
                        let ts_utc = ts.with_timezone(&Utc);
                        if session_first_ts.is_none() || ts_utc < session_first_ts.unwrap() {
                            session_first_ts = Some(ts_utc);
                        }
                        if session_last_ts.is_none() || ts_utc > session_last_ts.unwrap() {
                            session_last_ts = Some(ts_utc);
                        }
                    }

                    if entry.message.is_some() {
                        total_messages += 1;
                    }

                    if let Some(message) = &entry.message {
                        if let Value::Array(arr) = &message.content {
                            for block in arr {
                                if let Some(type_str) = block.get("type").and_then(|v| v.as_str()) {
                                    if type_str == "tool_use" {
                                        total_tool_calls += 1;

                                        // Count lines written
                                        if let Some(tool_name) = block.get("name").and_then(|v| v.as_str()) {
                                            if tool_name == "write_to_file" || tool_name == "Write" {
                                                if let Some(content) = block.get("input").and_then(|i| i.get("content")).and_then(|c| c.as_str()) {
                                                    lines_written += content.lines().count();
                                                }
                                            } else if tool_name == "replace_in_file" || tool_name == "Edit" {
                                                // For edits, we count the new lines being added
                                                if let Some(new_string) = block.get("input").and_then(|i| i.get("new_string")).and_then(|s| s.as_str()) {
                                                    lines_written += new_string.lines().count();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if let (Some(first), Some(last)) = (session_first_ts, session_last_ts) {
                    total_time_ms += last.signed_duration_since(first).num_milliseconds().max(0) as u64;
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
        lines_written,
        time_spent_ms: total_time_ms,
        session_count,
        total_messages,
        total_tool_calls,
        first_session: first_session_str,
        last_session: last_session_str,
    })
}


/// Get agent workshop activity - shows what the agent was doing
#[tauri::command]
pub async fn get_agent_transcript(project_id: String, session_id: String, agent_id: String) -> Result<Vec<Message>, String> {
    let projects_dir = get_projects_dir()?;
    let session_path = projects_dir.join(&project_id).join(format!("{}.jsonl", session_id));

    if !session_path.exists() {
        return Err(format!("Session not found: {}", session_id));
    }

    let (entries, _) = read_session_data(&session_path).await?;

    eprintln!("[get_agent_transcript] Looking for agent: {}", agent_id);
    eprintln!("[get_agent_transcript] Total entries: {}", entries.len());

    let mut messages: Vec<Message> = Vec::new();
    let mut progress_count = 0;

    // Find all agent_progress entries, then correlate with agent via tool_use_id mapping
    let mut agent_progress_entries: Vec<(&RawLogEntry, Option<String>)> = Vec::new();

    // First pass: collect all agent progress entries
    for entry in &entries {
        if entry.entry_type == "progress" {
            if let Some(data) = entry._extra.get("data") {
                if let Some(data_type) = data.get("type") {
                    if data_type.as_str() == Some("agent_progress") {
                        progress_count += 1;
                        // parentToolUseID is a top-level field, not inside data
                        let parent_tool_id = entry._extra.get("parentToolUseID")
                            .and_then(|p| p.as_str())
                            .map(|s| s.to_string());
                        eprintln!("[get_agent_transcript] Found agent_progress with parentToolUseID: {:?}", parent_tool_id);
                        agent_progress_entries.push((entry, parent_tool_id));
                    }
                }
            }
        }
    }

    eprintln!("[get_agent_transcript] Found {} progress entries", progress_count);

    // Second pass: find tool_use blocks matching our agent_id by subagent_type
    let mut matching_tool_ids: Vec<String> = Vec::new();
    for entry in &entries {
        if entry.entry_type == "assistant" {
            if let Some(message) = &entry.message {
                if let Value::Array(content) = &message.content {
                    for block in content {
                        if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                            if let Some(tool_name) = block.get("name").and_then(|n| n.as_str()) {
                                if tool_name == "Task" {
                                    if let Some(input) = block.get("input") {
                                        if let Some(subagent_type) = input.get("subagent_type").and_then(|s| s.as_str()) {
                                            // Match subagent_type (e.g., "code-simplifier" or "feature-dev:code-reviewer")
                                            let matches = if agent_id.contains(':') {
                                                subagent_type == &agent_id
                                            } else {
                                                // For single names, also match plugin:name format
                                                subagent_type == &agent_id || subagent_type.ends_with(&format!(":{}", agent_id))
                                            };

                                            if matches {
                                                if let Some(tool_id) = block.get("id").and_then(|i| i.as_str()) {
                                                    eprintln!("[get_agent_transcript] Found matching tool_use: {} with id: {}", subagent_type, tool_id);
                                                    matching_tool_ids.push(tool_id.to_string());
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    eprintln!("[get_agent_transcript] Found {} matching tool_use blocks", matching_tool_ids.len());

    // Third pass: extract messages from progress entries that match our tool IDs
    for (entry, parent_tool_id) in agent_progress_entries {
        if let Some(ref parent_id) = parent_tool_id {
            if matching_tool_ids.contains(parent_id) {
                eprintln!("[get_agent_transcript] Processing matching progress entry");

                if let Some(data) = entry._extra.get("data") {
                    // Extract the initial message (user request to the agent)
                    if let Some(message_obj) = data.get("message") {
                        if let Some(nested_msg) = message_obj.get("message") {
                            let mut message = Message {
                                uuid: entry.uuid.clone().unwrap_or_default(),
                                msg_type: "user".to_string(),
                                timestamp: entry.timestamp.clone(),
                                content: vec![],
                                model: None,
                                usage: None,
                            };

                            if let Some(content) = nested_msg.get("content") {
                                match content {
                                    Value::String(s) => {
                                        message.content = vec![serde_json::json!({
                                            "type": "text",
                                            "text": s
                                        })];
                                    }
                                    Value::Array(arr) => {
                                        message.content = arr.clone();
                                    }
                                    _ => {}
                                }
                            }

                            messages.push(message);
                        }
                    }

                    // Extract the agent's responses (normalizedMessages)
                    if let Some(normalized) = data.get("normalizedMessages") {
                        if let Some(arr) = normalized.as_array() {
                            for norm_msg in arr {
                                if let Some(msg_obj) = norm_msg.get("message") {
                                    let mut message = Message {
                                        uuid: Uuid::new_v4().to_string(),
                                        msg_type: "assistant".to_string(),
                                        timestamp: entry.timestamp.clone(),
                                        content: vec![],
                                        model: None,
                                        usage: None,
                                    };

                                    if let Some(content) = msg_obj.get("content") {
                                        match content {
                                            Value::String(s) => {
                                                message.content = vec![serde_json::json!({
                                                    "type": "text",
                                                    "text": s
                                                })];
                                            }
                                            Value::Array(arr) => {
                                                message.content = arr.clone();
                                            }
                                            _ => {}
                                        }
                                    }

                                    if let Some(model) = msg_obj.get("model") {
                                        if let Some(model_str) = model.as_str() {
                                            message.model = Some(model_str.to_string());
                                        }
                                    }

                                    messages.push(message);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    eprintln!("[get_agent_transcript] Extracted {} messages", messages.len());

    if messages.is_empty() {
        return Err(format!(
            "No workshop activity found for agent: {}. Debug: progress_entries={}, matching_tool_ids={}",
            agent_id,
            progress_count,
            matching_tool_ids.len()
        ));
    }

    Ok(messages)
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
