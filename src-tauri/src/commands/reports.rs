/**
 * Reports service commands
 *
 * Generates work reports from Claude Code session transcripts.
 * Extracts atomic work items (file changes, commands) rather than summarizing sessions.
 * AI is used only for final clustering/formatting, not inference.
 */

use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri_plugin_dialog::DialogExt;
use tokio::io::{AsyncBufReadExt, BufReader};

// use crate::commands::work_unit_builder::{SummaryEmitter, WorkUnitBuilder};

// ============================================================================
// Type Definitions
// ============================================================================

/// Atomic unit of work extracted from transcripts.
/// Each work item represents a concrete action, not inferred intent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkItem {
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub timestamp: i64, // Unix ms for filtering
    #[serde(rename = "workType")]
    pub work_type: String, // "file_created", "file_modified", "command_executed", "git_operation"
    pub subject: String,   // File path, command, or operation name
    pub details: Option<String>, // Additional context (e.g., command args)
}

/// Grouped work items collapsed into logical units
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkGroup {
    pub subject: String,
    #[serde(rename = "workType")]
    pub work_type: String,
    pub count: usize,
    #[serde(rename = "firstTimestamp")]
    pub first_timestamp: i64,
    #[serde(rename = "lastTimestamp")]
    pub last_timestamp: i64,
    pub sessions: Vec<String>, // Session IDs for traceability
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportData {
    #[serde(rename = "projectName")]
    pub project_name: String,
    #[serde(rename = "dateRange")]
    pub date_range: String,
    #[serde(rename = "workItems")]
    pub work_items: Vec<WorkGroup>,
    pub markdown: String,
    #[serde(rename = "totalFiles")]
    pub total_files: usize,
    #[serde(rename = "totalCommands")]
    pub total_commands: usize,
    #[serde(rename = "totalSessions")]
    pub total_sessions: usize,
}

// Raw types for parsing
#[derive(Debug, Deserialize)]
struct RawLogEntry {
    #[serde(rename = "type")]
    entry_type: String,
    message: Option<RawMessage>,
    #[serde(default)]
    timestamp: String,
    #[serde(flatten)]
    _extra: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct RawMessage {
    content: serde_json::Value,
    #[serde(flatten)]
    _extra: serde_json::Value,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_projects_dir() -> Result<PathBuf, String> {
    let home_dir =
        dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home_dir.join(".claude").join("projects"))
}

/// Resolve project display name from session data (cwd → git/package.json → basename)
fn resolve_project_name(project_dir: &Path) -> String {
    if let Some(cwd) = find_project_cwd(project_dir) {
        if let Some(name) = git_repo_name(&cwd) {
            return name;
        }
        if let Some(name) = package_name(&cwd) {
            return name;
        }
        if let Some(name) = cwd.file_name().and_then(|n| n.to_str()) {
            return name.to_string();
        }
    }
    project_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string()
}

fn find_project_cwd(project_dir: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(project_dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
            let file = fs::File::open(&path).ok()?;
            let reader = std::io::BufReader::new(file);
            use std::io::BufRead;
            if let Some(Ok(line)) = reader.lines().next() {
                if let Ok(json) = serde_json::from_str::<Value>(&line) {
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

fn git_repo_name(cwd: &Path) -> Option<String> {
    let git_config = cwd.join(".git").join("config");
    if !git_config.exists() {
        return None;
    }
    let content = fs::read_to_string(&git_config).ok()?;
    let mut in_origin = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "[remote \"origin\"]" {
            in_origin = true;
            continue;
        }
        if in_origin {
            if trimmed.starts_with('[') {
                break;
            }
            if let Some(url) = trimmed.strip_prefix("url = ") {
                return extract_repo_name(url.trim());
            }
        }
    }
    None
}

fn extract_repo_name(url: &str) -> Option<String> {
    let url = url.trim_end_matches(".git");
    if url.contains(':') && !url.contains("://") {
        return url
            .rsplit(':')
            .next()
            .and_then(|path| path.rsplit('/').next())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());
    }
    url.rsplit('/')
        .next()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn package_name(cwd: &Path) -> Option<String> {
    let package_json = cwd.join("package.json");
    if !package_json.exists() {
        return None;
    }
    let content = fs::read_to_string(&package_json).ok()?;
    let json: Value = serde_json::from_str(&content).ok()?;
    json.get("name")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

async fn read_session_entries(session_path: &Path) -> Result<(Vec<RawLogEntry>, String), String> {
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

        // Try to parse as summary entry first
        if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&line) {
            if map.get("type").and_then(|v| v.as_str()) == Some("summary") {
                if let Some(s) = map.get("summary").and_then(|v| v.as_str()) {
                    summary = s.to_string();
                }
                continue;
            }
        }

        if let Ok(log_entry) = serde_json::from_str::<RawLogEntry>(&line) {
            entries.push(log_entry);
        }
    }

    Ok((entries, summary))
}

// ============================================================================
// Work Item Extraction
// ============================================================================

/// Extract atomic work items from session entries.
/// Only extracts concrete actions, never inferred intent.
fn extract_work_items(
    entries: &[RawLogEntry],
    project_id: &str,
    session_id: &str,
) -> Vec<WorkItem> {
    let mut items = Vec::new();

    for entry in entries {
        if entry.entry_type != "assistant" {
            continue;
        }

        let timestamp = parse_timestamp(&entry.timestamp);

        if let Some(message) = &entry.message {
            if let Value::Array(arr) = &message.content {
                for block in arr {
                    if block.get("type").and_then(|v| v.as_str()) != Some("tool_use") {
                        continue;
                    }

                    let tool_name = block.get("name").and_then(|n| n.as_str()).unwrap_or("");
                    let input = block.get("input");

                    match tool_name {
                        "Write" => {
                            if let Some(path) = input.and_then(|i| i.get("file_path")).and_then(|p| p.as_str()) {
                                items.push(WorkItem {
                                    project_id: project_id.to_string(),
                                    session_id: session_id.to_string(),
                                    timestamp,
                                    work_type: "file_created".to_string(),
                                    subject: normalize_path(path),
                                    details: None,
                                });
                            }
                        }
                        "Edit" => {
                            if let Some(path) = input.and_then(|i| i.get("file_path")).and_then(|p| p.as_str()) {
                                items.push(WorkItem {
                                    project_id: project_id.to_string(),
                                    session_id: session_id.to_string(),
                                    timestamp,
                                    work_type: "file_modified".to_string(),
                                    subject: normalize_path(path),
                                    details: None,
                                });
                            }
                        }
                        "Bash" => {
                            if let Some(cmd) = input.and_then(|i| i.get("command")).and_then(|c| c.as_str()) {
                                if let Some(item) = parse_bash_command(cmd, project_id, session_id, timestamp) {
                                    items.push(item);
                                }
                            }
                        }
                        "NotebookEdit" => {
                            if let Some(path) = input.and_then(|i| i.get("notebook_path")).and_then(|p| p.as_str()) {
                                items.push(WorkItem {
                                    project_id: project_id.to_string(),
                                    session_id: session_id.to_string(),
                                    timestamp,
                                    work_type: "file_modified".to_string(),
                                    subject: normalize_path(path),
                                    details: Some("notebook".to_string()),
                                });
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    items
}

fn parse_timestamp(ts: &str) -> i64 {
    DateTime::parse_from_rfc3339(ts)
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(0)
}

/// Normalize file path for grouping (extract relative path or filename)
fn normalize_path(path: &str) -> String {
    // Keep last 3 path segments for context
    let parts: Vec<&str> = path.split('/').collect();
    if parts.len() > 3 {
        parts[parts.len() - 3..].join("/")
    } else {
        path.to_string()
    }
}

/// Parse bash command into a work item if it represents meaningful work
fn parse_bash_command(cmd: &str, project_id: &str, session_id: &str, timestamp: i64) -> Option<WorkItem> {
    let cmd = cmd.trim();

    // Skip exploration commands (not work)
    let skip_prefixes = ["ls", "cat ", "head ", "tail ", "pwd", "cd ", "echo ", "which ", "type "];
    for prefix in skip_prefixes {
        if cmd.starts_with(prefix) {
            return None;
        }
    }

    // Git operations
    if cmd.starts_with("git ") {
        let git_cmd = &cmd[4..];
        let (work_type, subject) = if git_cmd.starts_with("commit") {
            ("git_commit", extract_git_commit_msg(git_cmd))
        } else if git_cmd.starts_with("push") {
            ("git_push", "pushed changes".to_string())
        } else if git_cmd.starts_with("checkout -b") || git_cmd.starts_with("switch -c") {
            ("git_branch", extract_branch_name(git_cmd))
        } else if git_cmd.starts_with("merge") {
            ("git_merge", extract_branch_name(git_cmd))
        } else {
            return None; // Skip git status, log, diff, etc.
        };

        return Some(WorkItem {
            project_id: project_id.to_string(),
            session_id: session_id.to_string(),
            timestamp,
            work_type: work_type.to_string(),
            subject,
            details: Some(cmd.to_string()),
        });
    }

    // Package manager operations
    if cmd.starts_with("npm ") || cmd.starts_with("pnpm ") || cmd.starts_with("yarn ") {
        let parts: Vec<&str> = cmd.split_whitespace().collect();
        if parts.len() >= 2 {
            let action = parts[1];
            if action == "install" || action == "add" || action == "i" {
                let pkg = parts.get(2).map(|s| s.to_string()).unwrap_or_else(|| "dependencies".to_string());
                return Some(WorkItem {
                    project_id: project_id.to_string(),
                    session_id: session_id.to_string(),
                    timestamp,
                    work_type: "dependency_added".to_string(),
                    subject: pkg,
                    details: Some(cmd.to_string()),
                });
            } else if action == "run" && parts.len() >= 3 {
                let script = parts[2];
                if script == "test" || script == "build" || script == "lint" {
                    return Some(WorkItem {
                        project_id: project_id.to_string(),
                        session_id: session_id.to_string(),
                        timestamp,
                        work_type: format!("npm_{}", script),
                        subject: script.to_string(),
                        details: None,
                    });
                }
            }
        }
    }

    // Cargo operations
    if cmd.starts_with("cargo ") {
        let parts: Vec<&str> = cmd.split_whitespace().collect();
        if parts.len() >= 2 {
            let action = parts[1];
            if action == "test" || action == "build" || action == "check" || action == "clippy" {
                return Some(WorkItem {
                    project_id: project_id.to_string(),
                    session_id: session_id.to_string(),
                    timestamp,
                    work_type: format!("cargo_{}", action),
                    subject: action.to_string(),
                    details: None,
                });
            } else if action == "add" && parts.len() >= 3 {
                return Some(WorkItem {
                    project_id: project_id.to_string(),
                    session_id: session_id.to_string(),
                    timestamp,
                    work_type: "dependency_added".to_string(),
                    subject: parts[2].to_string(),
                    details: Some(cmd.to_string()),
                });
            }
        }
    }

    None
}

fn extract_git_commit_msg(cmd: &str) -> String {
    // Extract message from: commit -m "message" or commit -m 'message'
    if let Some(m_pos) = cmd.find("-m ") {
        let after_m = &cmd[m_pos + 3..];
        let trimmed = after_m.trim();
        if trimmed.starts_with('"') {
            if let Some(end) = trimmed[1..].find('"') {
                return trimmed[1..=end].to_string();
            }
        } else if trimmed.starts_with('\'') {
            if let Some(end) = trimmed[1..].find('\'') {
                return trimmed[1..=end].to_string();
            }
        }
    }
    "committed changes".to_string()
}

fn extract_branch_name(cmd: &str) -> String {
    cmd.split_whitespace()
        .last()
        .map(|s| s.to_string())
        .unwrap_or_else(|| "branch".to_string())
}

// ============================================================================
// Work Item Grouping
// ============================================================================

/// Group work items by subject and type, collapsing multiple edits into logical units
fn group_work_items(items: Vec<WorkItem>) -> Vec<WorkGroup> {
    let mut groups: HashMap<(String, String), WorkGroup> = HashMap::new();

    for item in items {
        let key = (item.subject.clone(), item.work_type.clone());

        groups
            .entry(key)
            .and_modify(|g| {
                g.count += 1;
                g.first_timestamp = g.first_timestamp.min(item.timestamp);
                g.last_timestamp = g.last_timestamp.max(item.timestamp);
                if !g.sessions.contains(&item.session_id) {
                    g.sessions.push(item.session_id.clone());
                }
            })
            .or_insert(WorkGroup {
                subject: item.subject.clone(),
                work_type: item.work_type.clone(),
                count: 1,
                first_timestamp: item.timestamp,
                last_timestamp: item.timestamp,
                sessions: vec![item.session_id],
            });
    }

    let mut result: Vec<WorkGroup> = groups.into_values().collect();

    // Sort by last activity (most recent first)
    result.sort_by(|a, b| b.last_timestamp.cmp(&a.last_timestamp));

    result
}

// ============================================================================
// Markdown Generation
// ============================================================================

fn generate_markdown(title: &str, date_range: &str, groups: &[WorkGroup], summary: &str) -> String {
    let now = Utc::now().format("%Y-%m-%d %H:%M UTC").to_string();

    let mut md = format!(
        r#"# {}

**Period:** {}

---

## Summary

{}

"#,
        title,
        date_range,
        summary
    );

    // Group by work type for detailed breakdown
    let mut by_type: HashMap<&str, Vec<&WorkGroup>> = HashMap::new();
    for group in groups {
        by_type
            .entry(type_to_category(&group.work_type))
            .or_default()
            .push(group);
    }

    // File changes (detailed)
    if let Some(file_items) = by_type.get("Files") {
        md.push_str("## Files Changed\n\n");
        md.push_str("<details>\n<summary>Show all files</summary>\n\n");
        for item in file_items {
            let action = if item.work_type == "file_created" {
                "Created"
            } else {
                "Modified"
            };
            let edit_note = if item.count > 1 {
                format!(" ({} edits)", item.count)
            } else {
                String::new()
            };
            md.push_str(&format!("- {} `{}`{}\n", action, item.subject, edit_note));
        }
        md.push_str("\n</details>\n\n");
    }

    // Git operations
    if let Some(git_items) = by_type.get("Git") {
        md.push_str("## Git Operations\n\n");
        for item in git_items {
            let action = match item.work_type.as_str() {
                "git_commit" => "Committed",
                "git_push" => "Pushed",
                "git_branch" => "Created branch",
                "git_merge" => "Merged",
                _ => "Git",
            };
            md.push_str(&format!("- {} {}\n", action, item.subject));
        }
        md.push('\n');
    }

    // Dependencies
    if let Some(dep_items) = by_type.get("Dependencies") {
        md.push_str("## Dependencies\n\n");
        for item in dep_items {
            md.push_str(&format!("- Added `{}`\n", item.subject));
        }
        md.push('\n');
    }

    // Build/test operations
    if let Some(build_items) = by_type.get("Build") {
        md.push_str("## Build & Test\n\n");
        for item in build_items {
            let action = item.work_type.replace("npm_", "").replace("cargo_", "");
            let count_note = if item.count > 1 {
                format!(" ({}x)", item.count)
            } else {
                String::new()
            };
            md.push_str(&format!("- Ran {}{}\n", action, count_note));
        }
        md.push('\n');
    }

    md.push_str(&format!("---\n*Generated: {}*\n", now));

    md
}

fn type_to_category(work_type: &str) -> &'static str {
    match work_type {
        "file_created" | "file_modified" => "Files",
        "git_commit" | "git_push" | "git_branch" | "git_merge" => "Git",
        "dependency_added" => "Dependencies",
        "npm_test" | "npm_build" | "npm_lint" | "cargo_test" | "cargo_build" | "cargo_check" | "cargo_clippy" => "Build",
        _ => "Other",
    }
}

// ============================================================================
// Local Summary Generation (No AI Required)
// ============================================================================

/// Generate human-readable work summary from work groups without AI.
/// Uses deterministic WorkUnit-based semantic classification.
/// Produces outcome-level summaries instead of operation-level noise.
/// Generate human-readable work summary from work groups and session summaries.
/// Strictly factual, lists summaries and explicit operations.
fn generate_work_summary(groups: &[WorkGroup], session_summaries: &[String]) -> String {
    let mut result = String::from("Work completed in this period:\n");

    // Add session summaries first as the primary context
    for summary in session_summaries {
        if !summary.is_empty() {
            result.push_str(&format!("- {}\n", summary));
        }
    }

    // Add git operations (explicit actions)
    let git_bullets = extract_git_bullets(groups);
    for bullet in git_bullets {
        result.push_str(&format!("- {}\n", bullet));
    }

    // Add dependencies
    let dep_bullets = extract_dependency_bullets(groups);
    for bullet in dep_bullets {
        result.push_str(&format!("- {}\n", bullet));
    }

    // If everything is empty, return placeholder
    if result == "Work completed in this period:\n" {
        return "No significant work items found in this period.".to_string();
    }

    result
}

/// Extract explicit git operation bullets
fn extract_git_bullets(groups: &[WorkGroup]) -> Vec<String> {
    let mut bullets = Vec::new();

    for group in groups {
        match group.work_type.as_str() {
            "git_commit" => {
                if group.subject != "committed changes" {
                    bullets.push(format!("Committed: {}", group.subject));
                }
            }
            "git_push" => {
                bullets.push("Pushed changes to remote".to_string());
            }
            "git_branch" => {
                bullets.push(format!("Created branch {}", group.subject));
            }
            "git_merge" => {
                bullets.push(format!("Merged {}", group.subject));
            }
            _ => {}
        }
    }

    bullets
}

/// Extract dependency addition bullets
fn extract_dependency_bullets(groups: &[WorkGroup]) -> Vec<String> {
    let mut bullets = Vec::new();

    for group in groups {
        if group.work_type == "dependency_added" {
            bullets.push(format!("Added dependency: {}", group.subject));
        }
    }

    bullets
}



// ============================================================================
// AI Formatting (Optional)
// ============================================================================

/// Get OAuth access token from macOS Keychain
fn get_oauth_token() -> Option<String> {
    let username = whoami::username();

    let output = Command::new("security")
        .args([
            "find-generic-password",
            "-s", "Claude Code-credentials",
            "-a", &username,
            "-w",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let credentials_json = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let json: Value = serde_json::from_str(&credentials_json).ok()?;

    json.get("claudeAiOauth")
        .and_then(|o| o.get("accessToken"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
}

/// Use AI (Sonnet) to convert work groups into clean bullet points.
/// AI only clusters and formats - it must not infer work not present in input.
async fn ai_format_work_items(groups: &[WorkGroup], _project_name: &str) -> Option<String> {
    let token = get_oauth_token()?;

    // Build structured work item list
    let mut input_lines = Vec::new();
    for group in groups.iter().take(50) {
        let work_type = match group.work_type.as_str() {
            "file_created" | "file_modified" => "file_change",
            "git_commit" | "git_push" | "git_branch" | "git_merge" => "command",
            "dependency_added" => "feature",
            t if t.starts_with("npm_") || t.starts_with("cargo_") => "command",
            _ => "file_change",
        };

        let edits = if group.count > 1 {
            format!(", edits: {}", group.count)
        } else {
            String::new()
        };

        input_lines.push(format!(
            "- type: {}, subject: {}{}",
            work_type, group.subject, edits
        ));
    }

    let input = input_lines.join("\n");

    let client = Client::new();

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("Authorization", format!("Bearer {}", token))
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&json!({
            "model": "claude-3-5-sonnet-latest",
            "max_tokens": 500,
            "messages": [{
                "role": "user",
                "content": format!(
r#"You are given a structured list of project Work Items. Each item has:
- type: file_change | feature | refactor | command | decision
- subject: file path, feature name, or concept
- edits: number of edits (optional)

Your task:
1. Produce a concise human-readable bullet list summarizing the work completed.
2. USE ONLY the provided session summaries and work items.
3. DO NOT invent, infer, or group multiple unrelated changes.
4. DO NOT rephrase technical actions into vague statements (e.g., keep file paths and commit messages as they are).
5. If something is unclear, omit it.
6. Start the list with: Work completed in this period:
7. Output only the bullet list.

Work Items:
{}
"#,
                    input
                )
            }]
        }))
        .send()
        .await
        .ok()?;

    if !response.status().is_success() {
        return None;
    }

    let json: Value = response.json().await.ok()?;

    json.get("content")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|block| block.get("text"))
        .and_then(|t| t.as_str())
        .map(|s| s.trim().to_string())
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Generate a work report for a project in a date range.
/// Extracts concrete work items, not session summaries.
#[tauri::command]
pub async fn generate_report(
    project_id: Option<String>,
    start_date: String,
    end_date: String,
    use_ai: Option<bool>,
) -> Result<ReportData, String> {
    let use_ai_formatting = use_ai.unwrap_or(false);
    let projects_dir = get_projects_dir()?;

    if !projects_dir.exists() {
        return Err("Projects directory not found".to_string());
    }

    // Parse date range
    let start_ms = DateTime::parse_from_rfc3339(&format!("{}T00:00:00Z", start_date))
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(0);

    let end_ms = DateTime::parse_from_rfc3339(&format!("{}T23:59:59Z", end_date))
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(i64::MAX);

    // Collect projects to scan
    let project_dirs: Vec<(PathBuf, String, String)> = if let Some(ref pid) = project_id {
        if pid.is_empty() {
            collect_all_projects(&projects_dir)?
        } else {
            let path = projects_dir.join(pid);
            if !path.exists() {
                return Err(format!("Project not found: {}", pid));
            }
            let name = resolve_project_name(&path);
            vec![(path, pid.clone(), name)]
        }
    } else {
        collect_all_projects(&projects_dir)?
    };

    let mut all_work_items: Vec<WorkItem> = Vec::new();
    let mut session_ids: HashSet<String> = HashSet::new();
    let mut session_summaries: Vec<String> = Vec::new();

    // Extract work items from each project
    for (project_path, project_id, _) in &project_dirs {
        let dir_entries = match fs::read_dir(project_path) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in dir_entries.flatten() {
            let path = entry.path();

            if !path.is_file() || path.extension().map(|ext| ext != "jsonl").unwrap_or(true) {
                continue;
            }

            let session_id = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            let (entries, session_summary) = match read_session_entries(&path).await {
                Ok(data) if !data.0.is_empty() => data,
                _ => continue,
            };

            // Extract work items from this session
            let items = extract_work_items(&entries, project_id, &session_id);

            // Filter by date range
            let mut matched = false;
            for item in items {
                if item.timestamp >= start_ms && item.timestamp <= end_ms {
                    session_ids.insert(item.session_id.clone());
                    all_work_items.push(item);
                    matched = true;
                }
            }

            if matched && !session_summary.is_empty() {
                session_summaries.push(session_summary);
            }
        }
    }

    // Group and deduplicate work items
    let work_groups = group_work_items(all_work_items);

    // Count totals
    let total_files = work_groups
        .iter()
        .filter(|g| g.work_type == "file_created" || g.work_type == "file_modified")
        .count();

    let total_commands = work_groups
        .iter()
        .filter(|g| {
            g.work_type.starts_with("git_")
                || g.work_type.starts_with("npm_")
                || g.work_type.starts_with("cargo_")
        })
        .map(|g| g.count)
        .sum();

    // Generate title
    let title = if project_id.as_ref().map(|s| s.is_empty()).unwrap_or(true) {
        "All Projects Report".to_string()
    } else {
        format!(
            "Report: {}",
            project_dirs
                .first()
                .map(|(_, _, n)| n.as_str())
                .unwrap_or("Unknown")
        )
    };

    let date_range = format!("{} to {}", start_date, end_date);

    // Always generate local summary first
    let local_summary = generate_work_summary(&work_groups, &session_summaries);

    // Try AI enhancement if requested, fall back to local summary
    let summary = if use_ai_formatting {
        ai_format_work_items(&work_groups, &title)
            .await
            .unwrap_or(local_summary)
    } else {
        local_summary
    };

    // Generate full markdown with summary
    let markdown = generate_markdown(&title, &date_range, &work_groups, &summary);

    Ok(ReportData {
        project_name: title,
        date_range,
        work_items: work_groups,
        markdown,
        total_files,
        total_commands,
        total_sessions: session_ids.len(),
    })
}

fn collect_all_projects(projects_dir: &PathBuf) -> Result<Vec<(PathBuf, String, String)>, String> {
    let mut result = Vec::new();

    for entry in
        fs::read_dir(projects_dir).map_err(|e| format!("Failed to read projects dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            let project_id = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
            let project_name = resolve_project_name(&path);
            result.push((path, project_id, project_name));
        }
    }

    Ok(result)
}

/// Save report to file with native file dialog
#[tauri::command]
pub async fn save_report(
    app_handle: tauri::AppHandle,
    content: String,
    default_filename: String,
) -> Result<bool, String> {
    use tauri_plugin_dialog::FilePath;

    let file_path = app_handle
        .dialog()
        .file()
        .set_file_name(&default_filename)
        .add_filter("Markdown", &["md"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = match path {
                FilePath::Path(p) => p.to_string_lossy().to_string(),
                FilePath::Url(u) => u.path().to_string(),
            };

            if let Some(parent) = std::path::Path::new(&path_str).parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create directories: {}", e))?;
            }

            fs::write(&path_str, content).map_err(|e| format!("Failed to write file: {}", e))?;

            Ok(true)
        }
        None => Ok(false),
    }
}

/// Generate project documentation from specific session IDs.
/// Reuses report generation logic but follows the documentation format.
#[tauri::command]
pub async fn generate_project_documentation(
    project_id: String,
    session_ids: Vec<String>,
    use_ai: Option<bool>,
) -> Result<ReportData, String> {
    let use_ai_formatting = use_ai.unwrap_or(false);
    let projects_dir = get_projects_dir()?;
    let project_path = projects_dir.join(&project_id);

    if !project_path.exists() {
        return Err(format!("Project not found: {}", project_id));
    }

    let project_name = resolve_project_name(&project_path);
    let mut all_work_items: Vec<WorkItem> = Vec::new();
    let mut session_summaries: Vec<String> = Vec::new();

    for session_id in &session_ids {
        let session_path = project_path.join(format!("{}.jsonl", session_id));
        if !session_path.exists() {
            continue;
        }

        let (entries, session_summary) = match read_session_entries(&session_path).await {
            Ok(data) => data,
            Err(_) => continue,
        };
        let items = extract_work_items(&entries, &project_id, session_id);
        all_work_items.extend(items);

        if !session_summary.is_empty() {
            session_summaries.push(session_summary);
        }
    }

    let work_groups = group_work_items(all_work_items);
    let local_summary = generate_work_summary(&work_groups, &session_summaries);

    let summary = if use_ai_formatting {
        ai_format_work_items(&work_groups, &project_name)
            .await
            .unwrap_or(local_summary)
    } else {
        local_summary
    };

    // Construct documentation-style markdown
    let mut markdown = format!("# Project Documentation: {}\n\n", project_name);
    markdown.push_str("## Summary\n");
    markdown.push_str(&summary);
    markdown.push_str("\n\n## Code Changes\n");
    
    let file_groups: Vec<&WorkGroup> = work_groups.iter()
        .filter(|g| g.work_type == "file_created" || g.work_type == "file_modified")
        .collect();

    if file_groups.is_empty() {
        markdown.push_str("No code changes detected.\n\n");
    } else {
        for group in file_groups {
            let action = if group.work_type == "file_created" { "CREATED" } else { "MODIFIED" };
            markdown.push_str(&format!("### [{}] {}\n", action, group.subject));
            markdown.push_str(&format!("- **Activity**: {} edits across {} sessions\n", group.count, group.sessions.len()));
            markdown.push_str("\n");
        }
    }

    let total_files = total_files_count(&work_groups);
    let total_commands = total_commands_count(&work_groups);

    Ok(ReportData {
        project_name: project_name.clone(),
        date_range: format!("Across {} selected sessions", session_ids.len()),
        work_items: work_groups,
        markdown,
        total_files,
        total_commands,
        total_sessions: session_ids.len(),
    })
}

fn total_files_count(groups: &[WorkGroup]) -> usize {
    groups.iter()
        .filter(|g| g.work_type == "file_created" || g.work_type == "file_modified")
        .count()
}

fn total_commands_count(groups: &[WorkGroup]) -> usize {
    groups.iter()
        .filter(|g| {
            g.work_type.starts_with("git_")
                || g.work_type.starts_with("npm_")
                || g.work_type.starts_with("cargo_")
        })
        .map(|g| g.count)
        .sum()
}