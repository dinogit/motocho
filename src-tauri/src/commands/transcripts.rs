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
    #[serde(rename = "health")]
    pub health: Option<SessionHealth>,
    #[serde(rename = "toolBreakdown")]
    pub tool_breakdown: Option<HashMap<String, usize>>,
    #[serde(rename = "techStack")]
    pub tech_stack: Option<TechStack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechStack {
    pub languages: Vec<LanguageInfo>,
    #[serde(rename = "totalFiles")]
    pub total_files: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageInfo {
    pub name: String,           // "TypeScript", "Rust", "Python", etc.
    pub framework: Option<String>, // "React", "Tauri", "FastAPI", etc.
    #[serde(rename = "fileCount")]
    pub file_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionHealth {
    #[serde(rename = "promptsPerHour")]
    pub prompts_per_hour: f64,
    #[serde(rename = "toolCallsPerPrompt")]
    pub tool_calls_per_prompt: f64,
    #[serde(rename = "assistantMessagesPerPrompt")]
    pub assistant_messages_per_prompt: f64,
    #[serde(rename = "tokensPerMinute")]
    pub tokens_per_minute: f64,
    pub status: String, // "healthy", "stalled", "frantic", "expensive"
    pub verdict: String, // "continue", "constrain", "restart"
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

fn get_codex_sessions_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home_dir.join(".codex").join("sessions"))
}

fn encode_project_id(path: &str) -> String {
    let mut out = String::with_capacity(path.len());
    for b in path.as_bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'.' | b'_' | b'-' => {
                out.push(*b as char);
            }
            _ => {
                out.push('~');
                out.push_str(&format!("{:02X}", b));
            }
        }
    }
    out
}

fn parse_project_id(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string()
}

/// Resolve a human-readable display name for a project.
///
/// Resolution order (strict, stop at first match):
/// 1. Git repository name from remote.origin.url (at the actual project cwd)
/// 2. package.json "name" field (at the actual project cwd)
/// 3. Directory basename of the actual project cwd
/// 4. Opaque folder ID (final fallback)
fn resolve_project_name(project_dir: &Path) -> String {
    // Find the actual project path from session data
    let cwd = match find_project_cwd(project_dir) {
        Some(path) => path,
        None => {
            // No session data available, use opaque ID
            return project_dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
        }
    };

    // 1. Try git remote name
    if let Some(name) = git_repo_name(&cwd) {
        return name;
    }

    // 2. Try package.json name
    if let Some(name) = package_name(&cwd) {
        return name;
    }

    // 3. Use actual project directory basename
    cwd.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string()
}

/// Find the actual project working directory from session files.
/// Reads the first .jsonl file and extracts the "cwd" field.
fn find_project_cwd(project_dir: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(project_dir).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
            // Read first line only
            let file = fs::File::open(&path).ok()?;
            let reader = std::io::BufReader::new(file);
            use std::io::BufRead;
            if let Some(Ok(line)) = reader.lines().next() {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    if let Some(cwd) = json.get("cwd").and_then(|v| v.as_str()) {
                        let cwd_path = PathBuf::from(cwd);
                        if cwd_path.exists() {
                            return Some(cwd_path);
                        }
                    }
                }
            }
        }
    }

    None
}

/// Extract repository name from git remote.origin.url.
/// Reads .git/config directly for determinism.
fn git_repo_name(cwd: &Path) -> Option<String> {
    let git_config = cwd.join(".git").join("config");
    if !git_config.exists() {
        return None;
    }

    let content = fs::read_to_string(&git_config).ok()?;

    // Parse git config to find [remote "origin"] url
    let mut in_origin = false;
    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed == "[remote \"origin\"]" {
            in_origin = true;
            continue;
        }

        if in_origin {
            if trimmed.starts_with('[') {
                break; // Left the section
            }
            if let Some(url) = trimmed.strip_prefix("url = ") {
                return extract_repo_name(url.trim());
            }
        }
    }

    None
}

/// Extract repository name from a git URL.
/// Handles: https://github.com/user/repo.git, git@github.com:user/repo.git
fn extract_repo_name(url: &str) -> Option<String> {
    let url = url.trim_end_matches(".git");

    // SSH format: git@host:user/repo
    if url.contains(':') && !url.contains("://") {
        return url.rsplit(':').next()
            .and_then(|path| path.rsplit('/').next())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());
    }

    // HTTPS format: https://host/user/repo
    url.rsplit('/').next()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

/// Extract name field from package.json.
fn package_name(cwd: &Path) -> Option<String> {
    let package_json = cwd.join("package.json");
    if !package_json.exists() {
        return None;
    }

    let content = fs::read_to_string(&package_json).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;

    json.get("name")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

// ============================================================================
// Codex Session Parsing
// ============================================================================

#[derive(Debug, Clone)]
struct CodexSessionMeta {
    id: Option<String>,
    cwd: Option<String>,
    timestamp: Option<String>,
    git_branch: Option<String>,
}

fn list_codex_session_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let Ok(entries) = fs::read_dir(root) else { return files };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            files.extend(list_codex_session_files(&path));
        } else if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
            files.push(path);
        }
    }

    files
}

fn resolve_project_name_from_cwd(cwd: &str) -> String {
    let path = PathBuf::from(cwd);
    if let Some(name) = git_repo_name(&path) {
        return name;
    }
    if let Some(name) = package_name(&path) {
        return name;
    }
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string()
}

fn read_codex_session_meta(session_path: &Path) -> Result<CodexSessionMeta, String> {
    let file = fs::File::open(session_path)
        .map_err(|e| format!("Failed to open session file: {}", e))?;
    let reader = std::io::BufReader::new(file);
    use std::io::BufRead;

    for line in reader.lines().flatten() {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(value) = serde_json::from_str::<Value>(&line) {
            if value.get("type").and_then(|v| v.as_str()) == Some("session_meta") {
                let payload = value.get("payload").cloned().unwrap_or(Value::Null);
                let id = payload.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
                let cwd = payload.get("cwd").and_then(|v| v.as_str()).map(|s| s.to_string());
                let timestamp = payload.get("timestamp").and_then(|v| v.as_str()).map(|s| s.to_string());
                let git_branch = payload
                    .get("git")
                    .and_then(|g| g.get("branch"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                return Ok(CodexSessionMeta { id, cwd, timestamp, git_branch });
            }
        }
    }

    Ok(CodexSessionMeta {
        id: None,
        cwd: None,
        timestamp: None,
        git_branch: None,
    })
}

fn codex_text_blocks_from_content(role: &str, content: &Value) -> Vec<Value> {
    let mut blocks = Vec::new();

    if let Value::Array(arr) = content {
        for item in arr {
            let item_type = item.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let text = item.get("text").and_then(|v| v.as_str()).unwrap_or("");
            if item_type == "input_text" || item_type == "output_text" {
                let mut text_value = text.to_string();
                if role == "developer" {
                    text_value = format!("[developer] {}", text_value);
                }
                blocks.push(serde_json::json!({ "type": "text", "text": text_value }));
            }
        }
    }

    blocks
}

fn codex_tool_use_block(name: &str, call_id: &str, args: Option<&str>) -> Value {
    let input = args
        .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
        .unwrap_or_else(|| serde_json::json!({ "raw": args.unwrap_or("") }));

    serde_json::json!({
        "type": "tool_use",
        "id": call_id,
        "name": name,
        "input": input
    })
}

fn codex_tool_result_block(call_id: &str, output: &str) -> Value {
    serde_json::json!({
        "type": "tool_result",
        "tool_use_id": call_id,
        "content": output
    })
}

fn codex_thinking_block(summary: &str) -> Value {
    serde_json::json!({
        "type": "thinking",
        "thinking": summary
    })
}

async fn read_codex_session_data(session_path: &Path) -> Result<(Vec<Message>, SessionStats, String, CodexSessionMeta), String> {
    let file = tokio::fs::File::open(session_path)
        .await
        .map_err(|e| format!("Failed to open session file: {}", e))?;

    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let mut messages: Vec<Message> = Vec::new();
    let mut meta = CodexSessionMeta { id: None, cwd: None, timestamp: None, git_branch: None };

    let mut prompt_count = 0;
    let mut tool_call_count = 0;
    let mut tool_counts: HashMap<String, usize> = HashMap::new();
    let mut first_timestamp: Option<DateTime<Utc>> = None;
    let mut last_timestamp: Option<DateTime<Utc>> = None;
    let mut summary: Option<String> = None;

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| format!("Error reading line: {}", e))?
    {
        if line.trim().is_empty() {
            continue;
        }

        let value: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let entry_type = value.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let timestamp = value.get("timestamp").and_then(|v| v.as_str()).map(|s| s.to_string());

        if entry_type == "session_meta" {
            let payload = value.get("payload").cloned().unwrap_or(Value::Null);
            meta.id = payload.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
            meta.cwd = payload.get("cwd").and_then(|v| v.as_str()).map(|s| s.to_string());
            meta.timestamp = payload.get("timestamp").and_then(|v| v.as_str()).map(|s| s.to_string());
            meta.git_branch = payload
                .get("git")
                .and_then(|g| g.get("branch"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            continue;
        }

        if entry_type != "response_item" {
            continue;
        }

        let payload = value.get("payload").cloned().unwrap_or(Value::Null);
        let payload_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");

        let timestamp_str = timestamp.clone().unwrap_or_default();
        if let Ok(ts) = DateTime::parse_from_rfc3339(&timestamp_str) {
            let ts_utc = ts.with_timezone(&Utc);
            if first_timestamp.is_none() || ts_utc < first_timestamp.unwrap() {
                first_timestamp = Some(ts_utc);
            }
            if last_timestamp.is_none() || ts_utc > last_timestamp.unwrap() {
                last_timestamp = Some(ts_utc);
            }
        }

        match payload_type {
            "message" => {
                let role = payload.get("role").and_then(|v| v.as_str()).unwrap_or("assistant");
                let content = payload.get("content").cloned().unwrap_or(Value::Null);
                let blocks = codex_text_blocks_from_content(role, &content);
                if blocks.is_empty() {
                    continue;
                }

                if role == "user" {
                    prompt_count += 1;
                    if summary.is_none() {
                        if let Some(first) = blocks.first() {
                            if let Some(text) = first.get("text").and_then(|v| v.as_str()) {
                                let cleaned = clean_summary(text);
                                if !cleaned.is_empty() && !is_garbage_summary(&cleaned) {
                                    summary = Some(cleaned);
                                }
                            }
                        }
                    }
                }

                let msg_type = if role == "user" { "user" } else { "assistant" };
                messages.push(Message {
                    uuid: Uuid::new_v4().to_string(),
                    msg_type: msg_type.to_string(),
                    timestamp: timestamp.unwrap_or_default(),
                    content: blocks,
                    model: None,
                    usage: None,
                });
            }
            "function_call" => {
                let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("tool");
                let call_id = payload.get("call_id").and_then(|v| v.as_str()).unwrap_or("");
                let args = payload.get("arguments").and_then(|v| v.as_str());

                tool_call_count += 1;
                *tool_counts.entry(name.to_string()).or_insert(0) += 1;

                let block = codex_tool_use_block(name, call_id, args);
                messages.push(Message {
                    uuid: if !call_id.is_empty() { call_id.to_string() } else { Uuid::new_v4().to_string() },
                    msg_type: "tool_use".to_string(),
                    timestamp: timestamp.unwrap_or_default(),
                    content: vec![block],
                    model: None,
                    usage: None,
                });
            }
            "function_call_output" => {
                let call_id = payload.get("call_id").and_then(|v| v.as_str()).unwrap_or("");
                let output = payload.get("output").and_then(|v| v.as_str()).unwrap_or("");
                let block = codex_tool_result_block(call_id, output);
                messages.push(Message {
                    uuid: Uuid::new_v4().to_string(),
                    msg_type: "tool_result".to_string(),
                    timestamp: timestamp.unwrap_or_default(),
                    content: vec![block],
                    model: None,
                    usage: None,
                });
            }
            "reasoning" => {
                let summary_text = payload
                    .get("summary")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|item| item.get("text").and_then(|v| v.as_str()))
                            .collect::<Vec<&str>>()
                            .join("\n")
                    })
                    .unwrap_or_default();

                if !summary_text.is_empty() {
                    let block = codex_thinking_block(&summary_text);
                    messages.push(Message {
                        uuid: Uuid::new_v4().to_string(),
                        msg_type: "assistant".to_string(),
                        timestamp: timestamp.unwrap_or_default(),
                        content: vec![block],
                        model: None,
                        usage: None,
                    });
                }
            }
            _ => {}
        }
    }

    let message_count = messages.len();
    let total_pages = (message_count + MESSAGES_PER_PAGE - 1) / MESSAGES_PER_PAGE;
    let start_timestamp = first_timestamp.map(|ts| ts.to_rfc3339());
    let end_timestamp = last_timestamp.map(|ts| ts.to_rfc3339());

    let duration_ms = if let (Some(first), Some(last)) = (first_timestamp, last_timestamp) {
        last.signed_duration_since(first).num_milliseconds().max(0) as u64
    } else {
        0
    };

    let stats = SessionStats {
        prompt_count,
        message_count,
        tool_call_count,
        total_cost_usd: 0.0,
        total_pages,
        duration_ms,
        start_timestamp,
        end_timestamp,
        git_branch: meta.git_branch.clone(),
        health: None,
        tool_breakdown: Some(tool_counts),
        tech_stack: None,
    };

    let summary_text = summary.unwrap_or_else(|| "Untitled Session".to_string());

    Ok((messages, stats, summary_text, meta))
}

fn find_codex_session_file(project_id: &str, session_id: &str) -> Result<PathBuf, String> {
    let root = get_codex_sessions_dir()?;
    let files = list_codex_session_files(&root);

    for file in files {
        if let Ok(meta) = read_codex_session_meta(&file) {
            if let Some(cwd) = meta.cwd.as_ref() {
                let encoded = encode_project_id(cwd);
                if encoded != project_id {
                    continue;
                }
            } else {
                continue;
            }

            if let Some(id) = meta.id.as_ref() {
                if id == session_id {
                    return Ok(file);
                }
            }
        }
    }

    Err("Session not found".to_string())
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

/// Clean up summary/description text - remove XML tags, commands, truncate
fn clean_summary(text: &str) -> String {
    let mut result = text.to_string();

    // Remove XML-like tags
    let tag_patterns = [
        "<command-message>", "</command-message>",
        "<command-name>", "</command-name>",
        "<local-command-caveat>", "</local-command-caveat>",
        "<system-reminder>", "</system-reminder>",
    ];
    for pattern in tag_patterns {
        result = result.replace(pattern, "");
    }

    // Remove lines that are just commands or noise
    let lines: Vec<&str> = result
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.starts_with('/') &&
            !trimmed.starts_with('<') &&
            !trimmed.starts_with("Caveat:") &&
            !trimmed.is_empty()
        })
        .collect();

    result = lines.join(" ");

    // Truncate to first sentence or 100 chars
    let truncated = if let Some(period_pos) = result.find(". ") {
        if period_pos < 100 {
            result[..=period_pos].to_string()
        } else {
            format!("{}...", result.chars().take(100).collect::<String>().trim())
        }
    } else if result.len() > 100 {
        format!("{}...", result.chars().take(100).collect::<String>().trim())
    } else {
        result
    };

    truncated.trim().to_string()
}

/// Check if summary is garbage (error messages, vague responses, etc)
fn is_garbage_summary(text: &str) -> bool {
    let lower = text.to_lowercase().trim().to_string();

    // Error/system messages
    let garbage_patterns = [
        "hit your limit", "rate limit", "resets", "timed out",
        "caveat:", "<command", "<local-command", "<system-reminder",
        "pnpm", "npm", "cargo", "error:", "warning:",
    ];
    for pattern in garbage_patterns {
        if lower.contains(pattern) {
            return true;
        }
    }

    // Vague/useless starts
    let bad_starts = [
        "yes", "no", "ok", "sure", "please", "thanks", "i want",
        "can you", "could you", "would you", "first", "but ", "and ",
        "dont", "don't", "do not",
    ];
    for start in bad_starts {
        if lower.starts_with(start) {
            return true;
        }
    }

    text.trim().len() < 15
}

async fn read_session_data(session_path: &Path) -> Result<(Vec<RawLogEntry>, String), String> {
    let file = tokio::fs::File::open(session_path)
        .await
        .map_err(|e| format!("Failed to open session file: {}", e))?;

    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let mut entries = Vec::new();
    let mut summary = String::new();
    let mut best_user_message = String::new();
    let mut best_score = 0;

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
                    // Only use summary if it's not garbage
                    if !is_garbage_summary(&s.summary) {
                        summary = clean_summary(&s.summary);
                    }
                    continue;
                }
                RawEntry::Other => {}
            }
        }

        // Try to parse as RawLogEntry (resilient)
        match serde_json::from_str::<RawLogEntry>(&line) {
            Ok(log_entry) => {
                // Collect user messages and find the best one
                if log_entry.entry_type == "user" {
                    if let Some(message) = &log_entry.message {
                        let text = match &message.content {
                            Value::String(s) => Some(s.clone()),
                            Value::Array(arr) => {
                                arr.iter()
                                    .find(|block| block.get("type").and_then(|v| v.as_str()) == Some("text"))
                                    .and_then(|block| block.get("text").and_then(|v| v.as_str()))
                                    .map(|s| s.to_string())
                            }
                            _ => None,
                        };

                        if let Some(t) = text {
                            let cleaned = clean_summary(&t);
                            if !cleaned.is_empty() && !is_garbage_summary(&cleaned) {
                                let score = score_user_message(&cleaned);
                                if score > best_score {
                                    best_score = score;
                                    best_user_message = cleaned;
                                }
                            }
                        }
                    }
                }
                entries.push(log_entry);
            }
            Err(e) => {
                if let Ok(type_check) = serde_json::from_str::<LogEntryType>(&line) {
                    if type_check.entry_type == "user" || type_check.entry_type == "assistant" {
                        log::warn!("Failed to parse {} entry: {}. Line: {}", type_check.entry_type, e, line);
                    }
                }
            }
        }
    }

    // Try to generate a better title from files changed
    let file_title = generate_title_from_files(&entries);

    // Priority: 1) Good summary, 2) File-based title, 3) Best user message
    if summary.is_empty() || is_garbage_summary(&summary) {
        if let Some(ft) = file_title {
            summary = ft;
        } else if !best_user_message.is_empty() {
            summary = best_user_message;
        }
    }

    Ok((entries, summary))
}

/// Score a user message for how descriptive it is
fn score_user_message(text: &str) -> i32 {
    let mut score = 0;
    let lower = text.to_lowercase();

    // Prefer messages with action words
    let action_words = ["implement", "add", "create", "fix", "update", "build", "make",
                        "configure", "integrate", "refactor", "improve", "change"];
    for word in action_words {
        if lower.contains(word) {
            score += 10;
        }
    }

    // Prefer medium-length messages
    if text.len() > 20 && text.len() < 100 {
        score += 5;
    }

    // Penalize questions
    if lower.starts_with("can you") || lower.starts_with("how") || lower.starts_with("what") {
        score -= 3;
    }

    score
}

/// Generate a title from files changed in the session
fn generate_title_from_files(entries: &[RawLogEntry]) -> Option<String> {
    let mut files: Vec<String> = Vec::new();

    for entry in entries {
        if entry.entry_type != "assistant" {
            continue;
        }

        if let Some(message) = &entry.message {
            if let Value::Array(arr) = &message.content {
                for block in arr {
                    if block.get("type").and_then(|v| v.as_str()) != Some("tool_use") {
                        continue;
                    }

                    let tool_name = block.get("name").and_then(|n| n.as_str()).unwrap_or("");

                    if tool_name == "Edit" || tool_name == "Write" {
                        if let Some(input) = block.get("input") {
                            if let Some(file_path) = input.get("file_path").and_then(|p| p.as_str()) {
                                // Extract just the filename
                                let filename = file_path.split('/').last().unwrap_or(file_path);
                                if !files.contains(&filename.to_string()) && files.len() < 5 {
                                    files.push(filename.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if files.is_empty() {
        return None;
    }

    // Generate title from file names
    let title = if files.len() == 1 {
        format!("Work on {}", files[0])
    } else if files.len() <= 3 {
        format!("Changes to {}", files.join(", "))
    } else {
        format!("Changes to {} and {} more", files[..2].join(", "), files.len() - 2)
    };

    Some(title)
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

fn transform_hook_message(entry: &RawLogEntry) -> Option<Message> {
    // Check if this is a hook_progress entry
    if entry.entry_type != "progress" {
        return None;
    }

    if let Some(data) = entry._extra.get("data") {
        if data.get("type").and_then(|t| t.as_str()) != Some("hook_progress") {
            return None;
        }

        let hook_event = data.get("hookEvent").and_then(|h| h.as_str()).unwrap_or("unknown");
        let hook_name = data.get("hookName").and_then(|h| h.as_str()).unwrap_or(hook_event);
        let command = data.get("command").and_then(|c| c.as_str()).unwrap_or("");

        let content = vec![serde_json::json!({
            "type": "hook",
            "hookEvent": hook_event,
            "hookName": hook_name,
            "command": command,
        })];

        return Some(Message {
            uuid: entry.uuid.clone().unwrap_or_default(),
            msg_type: "hook".to_string(),
            timestamp: entry.timestamp.clone(),
            content,
            model: None,
            usage: None,
        });
    }

    None
}

fn sum_session_metrics(entries: &[RawLogEntry]) -> (f64, u64, u64) {
    let mut total_cost = 0.0;
    let mut total_duration = 0;
    let mut total_tokens = 0;

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

        if let Some(message) = &entry.message {
            if let Some(usage) = &message.usage {
                total_tokens += (usage.input_tokens + usage.output_tokens) as u64;
            }
        }
    }

    (total_cost, total_duration, total_tokens)
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

/// Map extension to language name and optional framework
fn ext_to_language(ext: &str, ext_counts: &HashMap<String, usize>) -> (String, Option<String>) {
    match ext {
        "ts" | "tsx" => {
            let has_tsx = ext_counts.get("tsx").copied().unwrap_or(0) > 0;
            ("TypeScript".to_string(), if has_tsx { Some("React".to_string()) } else { None })
        }
        "js" | "jsx" => {
            let has_jsx = ext_counts.get("jsx").copied().unwrap_or(0) > 0;
            ("JavaScript".to_string(), if has_jsx { Some("React".to_string()) } else { None })
        }
        "rs" => ("Rust".to_string(), None),
        "py" => ("Python".to_string(), None),
        "go" => ("Go".to_string(), None),
        "cs" => ("C#".to_string(), Some(".NET".to_string())),
        "java" => ("Java".to_string(), None),
        "kt" | "kts" => ("Kotlin".to_string(), None),
        "swift" => ("Swift".to_string(), None),
        "rb" => ("Ruby".to_string(), None),
        "php" => ("PHP".to_string(), None),
        "vue" => ("Vue".to_string(), Some("Vue.js".to_string())),
        "svelte" => ("Svelte".to_string(), Some("Svelte".to_string())),
        "css" | "scss" | "sass" => ("CSS".to_string(), None),
        "html" => ("HTML".to_string(), None),
        "md" | "mdx" => ("Markdown".to_string(), None),
        "json" => ("JSON".to_string(), None),
        "yaml" | "yml" => ("YAML".to_string(), None),
        "toml" => ("TOML".to_string(), None),
        "sql" => ("SQL".to_string(), None),
        "sh" | "bash" | "zsh" => ("Shell".to_string(), None),
        _ => (ext.to_uppercase(), None),
    }
}

/// Detect tech stack from Write/Edit tool calls - returns all languages used
fn detect_tech_stack(entries: &[RawLogEntry]) -> Option<TechStack> {
    let mut ext_counts: HashMap<String, usize> = HashMap::new();

    for entry in entries {
        if entry.entry_type != "assistant" {
            continue;
        }

        if let Some(message) = &entry.message {
            if let Value::Array(arr) = &message.content {
                for block in arr {
                    if block.get("type").and_then(|v| v.as_str()) != Some("tool_use") {
                        continue;
                    }

                    let tool_name = block.get("name").and_then(|n| n.as_str()).unwrap_or("");
                    if tool_name != "Write" && tool_name != "Edit" {
                        continue;
                    }

                    if let Some(file_path) = block
                        .get("input")
                        .and_then(|i| i.get("file_path"))
                        .and_then(|p| p.as_str())
                    {
                        if let Some(ext) = file_path.rsplit('.').next() {
                            let ext_lower = ext.to_lowercase();
                            *ext_counts.entry(ext_lower).or_insert(0) += 1;
                        }
                    }
                }
            }
        }
    }

    if ext_counts.is_empty() {
        return None;
    }

    // Group extensions by language (e.g., ts+tsx = TypeScript)
    let mut lang_counts: HashMap<String, (Option<String>, usize)> = HashMap::new();

    for (ext, count) in &ext_counts {
        let (lang_name, framework) = ext_to_language(ext, &ext_counts);
        let entry = lang_counts.entry(lang_name).or_insert((None, 0));
        entry.1 += count;
        // Keep framework if detected
        if framework.is_some() {
            entry.0 = framework;
        }
    }

    // Convert to sorted vec (by file count descending)
    let mut languages: Vec<LanguageInfo> = lang_counts
        .into_iter()
        .map(|(name, (framework, file_count))| LanguageInfo {
            name,
            framework,
            file_count,
        })
        .collect();

    languages.sort_by(|a, b| b.file_count.cmp(&a.file_count));

    let total_files: usize = languages.iter().map(|l| l.file_count).sum();

    Some(TechStack {
        languages,
        total_files,
    })
}

fn calculate_session_stats(entries: &[RawLogEntry], total_cost: f64, total_tokens: u64) -> SessionStats {
    let mut prompt_count = 0;
    let mut tool_call_count = 0;
    let mut tool_counts: HashMap<String, usize> = HashMap::new();
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
                        if let Some(name) = block.get("name").and_then(|n| n.as_str()) {
                            *tool_counts.entry(name.to_string()).or_insert(0) += 1;
                        }
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

    let health = Some(calculate_session_health(
        prompt_count,
        tool_call_count,
        message_count,
        duration_ms,
        total_cost,
        total_tokens,
    ));

    let tech_stack = detect_tech_stack(entries);

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
        health,
        tool_breakdown: Some(tool_counts),
        tech_stack,
    }
}

fn calculate_session_health(
    prompt_count: usize,
    tool_call_count: usize,
    message_count: usize,
    duration_ms: u64,
    total_cost_usd: f64,
    total_tokens: u64,
) -> SessionHealth {
    // 1. Prompts per Hour
    let duration_hours = (duration_ms as f64) / 1000.0 / 3600.0;
    let prompts_per_hour = if duration_hours > 0.0 {
        prompt_count as f64 / duration_hours
    } else {
        0.0
    };

    // 2. Tool Call Density
    let tool_calls_per_prompt = if prompt_count > 0 {
        tool_call_count as f64 / prompt_count as f64
    } else {
        0.0
    };

    // 3. Message Explosion (Assistant messages per prompt)
    // Assist msgs ~ (message_count - prompt_count)
    let assistant_msgs = message_count.saturating_sub(prompt_count);
    let assistant_messages_per_prompt = if prompt_count > 0 {
        assistant_msgs as f64 / prompt_count as f64
    } else {
        0.0
    };

    // 4. Token Flux (Tokens per minute)
    let duration_minutes = (duration_ms as f64) / 1000.0 / 60.0;
    let tokens_per_minute = if duration_minutes > 0.0 {
        total_tokens as f64 / duration_minutes
    } else {
        0.0
    };

    // 5. Cost Efficiency (Retained for status calculation but metric is replaced)
    let cost_per_minute = if duration_minutes > 0.0 {
        total_cost_usd / duration_minutes
    } else {
        0.0
    };


    // Diagnostics logic
    let mut status = "healthy".to_string();
    let mut verdict = "continue".to_string();

    // Check for "Frantic" or "Stalled" based on Prompts/Hour
    if prompts_per_hour > 20.0 {
        status = "frantic".to_string();
        verdict = "constrain".to_string();
    } else if prompts_per_hour < 2.0 && duration_hours > 1.0 {
        status = "stalled".to_string();
    }

    // Check for "Looping" based on Tool Density
    if tool_calls_per_prompt > 8.0 {
        status = "looping".to_string();
        verdict = "constrain".to_string();
    }

    // Check for "Explosion"
    if assistant_messages_per_prompt > 5.0 {
        status = "exploding".to_string();
        verdict = "restart".to_string();
    }

    // Check for "Expensive" / "Heavy"
    if tokens_per_minute > 50_000.0 {
         status = "heavy".to_string(); // Renamed from expensive
         if prompts_per_hour < 5.0 {
             verdict = "restart".to_string();
         }
    } else if cost_per_minute > 0.50 {
         status = "expensive".to_string();
         if prompts_per_hour < 5.0 {
             verdict = "restart".to_string();
         }
    }

    SessionHealth {
        prompts_per_hour,
        tool_calls_per_prompt,
        assistant_messages_per_prompt,
        tokens_per_minute,
        status,
        verdict,
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
            let display_name = resolve_project_name(&path);
            let resolved_path = find_project_cwd(&path).unwrap_or_else(|| path.clone());

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
                path: resolved_path.to_string_lossy().to_string(),
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
                                let (total_cost, _, total_tokens) = sum_session_metrics(&entries);
                                let stats = calculate_session_stats(&entries, total_cost, total_tokens);
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
    let (total_cost, _, total_tokens) = sum_session_metrics(&entries);
    let stats = calculate_session_stats(&entries, total_cost, total_tokens);

    // Multi-pass parsing to link agent IDs
    let mut messages: Vec<Message> = Vec::new();
    let mut tool_use_map: HashMap<String, usize> = HashMap::new(); // tool_use_id -> message index

    for entry in entries {
        // Try to parse as hook first
        if let Some(hook_msg) = transform_hook_message(&entry) {
            messages.push(hook_msg);
            continue;
        }

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
        // Try to parse as hook first
        if let Some(hook_msg) = transform_hook_message(&entry) {
            messages.push(hook_msg);
            continue;
        }

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

                let (session_cost, _, _) = sum_session_metrics(&entries);
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

/// Get all messages for a session (no pagination)
#[tauri::command]
pub async fn get_all_session_messages(project_id: String, session_id: String) -> Result<Vec<Message>, String> {
    let projects_dir = get_projects_dir()?;
    let session_path = projects_dir.join(&project_id).join(format!("{}.jsonl", session_id));

    if !session_path.exists() {
        return Err("Session not found".to_string());
    }

    let (entries, _) = read_session_data(&session_path).await?;
    
    let mut messages: Vec<Message> = Vec::new();
    let mut tool_use_map: HashMap<String, usize> = HashMap::new(); // tool_use_id -> message index

    for entry in entries {
        // Try to parse as hook first
        if let Some(hook_msg) = transform_hook_message(&entry) {
            messages.push(hook_msg);
            continue;
        }

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

    Ok(messages)
}

// ============================================================================
// Codex Session Commands
// ============================================================================

/// Get all Codex projects from ~/.codex/sessions/
#[tauri::command]
pub async fn get_codex_projects() -> Result<Vec<Project>, String> {
    let sessions_dir = get_codex_sessions_dir()?;
    if !sessions_dir.exists() {
        return Ok(Vec::new());
    }

    let files = list_codex_session_files(&sessions_dir);
    let mut projects: HashMap<String, Project> = HashMap::new();

    for file in files {
        let meta = read_codex_session_meta(&file)?;
        let Some(cwd) = meta.cwd else { continue };

        let project_id = encode_project_id(&cwd);
        let display_name = resolve_project_name_from_cwd(&cwd);
        let last_modified = get_file_modified_time(&file);

        let entry = projects.entry(project_id.clone()).or_insert(Project {
            id: project_id.clone(),
            path: cwd.clone(),
            display_name,
            session_count: 0,
            last_modified,
        });

        entry.session_count += 1;
        if last_modified > entry.last_modified {
            entry.last_modified = last_modified;
        }
    }

    let mut result: Vec<Project> = projects.into_values().collect();
    result.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(result)
}

/// Get all Codex sessions for a project
#[tauri::command]
pub async fn get_codex_project_sessions(project_id: String) -> Result<Vec<Session>, String> {
    let sessions_dir = get_codex_sessions_dir()?;
    if !sessions_dir.exists() {
        return Ok(Vec::new());
    }

    let files = list_codex_session_files(&sessions_dir);
    let mut sessions = Vec::new();

    for file in files {
        let meta = read_codex_session_meta(&file)?;
        let Some(cwd) = meta.cwd else { continue };
        if encode_project_id(&cwd) != project_id {
            continue;
        }

        let last_modified = get_file_modified_time(&file);
        let session_id = meta.id.clone().unwrap_or_else(|| {
            file.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string()
        });

        let (messages, stats, summary, _) = read_codex_session_data(&file).await?;

        sessions.push(Session {
            id: session_id,
            project_id: project_id.clone(),
            file_path: file.to_string_lossy().to_string(),
            last_modified,
            message_count: messages.len(),
            summary,
            stats: Some(stats),
        });
    }

    sessions.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(sessions)
}

/// Get Codex session details with paginated messages
#[tauri::command]
pub async fn get_codex_session_details(project_id: String, session_id: String, page: Option<usize>) -> Result<SessionDetails, String> {
    let session_path = find_codex_session_file(&project_id, &session_id)?;
    let (messages, stats, summary, _) = read_codex_session_data(&session_path).await?;

    let last_modified = get_file_modified_time(&session_path);
    let page_num = page.unwrap_or(1);
    let start = (page_num.saturating_sub(1)) * MESSAGES_PER_PAGE;
    let end = (start + MESSAGES_PER_PAGE).min(messages.len());
    let page_messages = if start < messages.len() {
        messages[start..end].to_vec()
    } else {
        Vec::new()
    };

    Ok(SessionDetails {
        id: session_id,
        project_id,
        file_path: session_path.to_string_lossy().to_string(),
        last_modified,
        message_count: messages.len(),
        summary,
        stats: Some(stats),
        messages: page_messages,
    })
}

/// Get Codex session paginated messages
#[tauri::command]
pub async fn get_codex_session_paginated(project_id: String, session_id: String, page: Option<usize>) -> Result<PaginatedMessages, String> {
    let session_path = find_codex_session_file(&project_id, &session_id)?;
    let (messages, stats, _, _) = read_codex_session_data(&session_path).await?;

    let page_num = page.unwrap_or(1);
    let start = (page_num.saturating_sub(1)) * MESSAGES_PER_PAGE;
    let end = (start + MESSAGES_PER_PAGE).min(messages.len());
    let page_messages = if start < messages.len() {
        messages[start..end].to_vec()
    } else {
        Vec::new()
    };

    Ok(PaginatedMessages {
        messages: page_messages,
        total_pages: stats.total_pages,
        current_page: page_num,
        total_messages: messages.len(),
    })
}

/// Get all Codex session messages (no pagination)
#[tauri::command]
pub async fn get_codex_all_session_messages(project_id: String, session_id: String) -> Result<Vec<Message>, String> {
    let session_path = find_codex_session_file(&project_id, &session_id)?;
    let (messages, _, _, _) = read_codex_session_data(&session_path).await?;
    Ok(messages)
}
