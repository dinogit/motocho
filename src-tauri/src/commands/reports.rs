/**
 * Reports service commands
 *
 * Generates markdown reports from Claude Code sessions.
 * Uses Claude Haiku for AI-powered summaries (optional).
 * Focuses on "what was done" - meaningful task descriptions.
 */

use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri_plugin_dialog::DialogExt;
use tokio::io::{AsyncBufReadExt, BufReader};

// ============================================================================
// Type Definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub id: String,
    #[serde(rename = "projectName")]
    pub project_name: String,
    pub timestamp: String,
    pub prompt: String,
    #[serde(rename = "filesChanged")]
    pub files_changed: Vec<FileChange>,
    #[serde(rename = "toolsUsed")]
    pub tools_used: HashMap<String, usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChange {
    pub path: String,
    pub action: String, // "edited" or "created"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportData {
    #[serde(rename = "projectName")]
    pub project_name: String,
    #[serde(rename = "dateRange")]
    pub date_range: String,
    pub sessions: Vec<SessionSummary>,
    pub markdown: String,
    #[serde(rename = "totalSessions")]
    pub total_sessions: usize,
    #[serde(rename = "totalFilesChanged")]
    pub total_files_changed: usize,
    #[serde(rename = "totalToolCalls")]
    pub total_tool_calls: usize,
}

// Raw types for parsing
#[derive(Debug, Deserialize)]
struct RawLogEntry {
    #[serde(rename = "type")]
    entry_type: String,
    message: Option<RawMessage>,
    #[serde(default)]
    timestamp: String,
    #[serde(default)]
    summary: Option<String>,
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

fn decode_project_name(encoded_name: &str) -> String {
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let decoded = encoded_name
            .chars()
            .map(|c| if c == '-' { '/' } else { c })
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

fn get_file_modified_time(path: &std::path::Path) -> i64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

async fn read_session_entries(session_path: &std::path::Path) -> Result<Vec<RawLogEntry>, String> {
    let file = tokio::fs::File::open(session_path)
        .await
        .map_err(|e| format!("Failed to open session file: {}", e))?;

    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let mut entries = Vec::new();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| format!("Error reading line: {}", e))?
    {
        if line.trim().is_empty() {
            continue;
        }

        if let Ok(log_entry) = serde_json::from_str::<RawLogEntry>(&line) {
            entries.push(log_entry);
        }
    }

    Ok(entries)
}

/// Extract session summary or best prompt description
fn extract_session_description(entries: &[RawLogEntry]) -> Option<String> {
    // First, try to find a useful summary entry (Claude Code generates these)
    for entry in entries {
        if entry.entry_type == "summary" {
            if let Some(ref summary) = entry.summary {
                if !summary.is_empty() && is_useful_summary(summary) {
                    return Some(clean_description(summary));
                }
            }
        }
    }

    // Collect all user prompts and find the best one
    let mut best_prompt: Option<String> = None;
    let mut best_score = 0;

    for entry in entries {
        if entry.entry_type == "user" {
            if let Some(message) = &entry.message {
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
                    let cleaned = clean_description(&t);
                    if !cleaned.is_empty() && !is_noise(&cleaned) {
                        let score = score_prompt(&cleaned);
                        if score > best_score {
                            best_score = score;
                            best_prompt = Some(cleaned);
                        }
                    }
                }
            }
        }
    }

    best_prompt
}

/// Score a prompt for how descriptive/useful it is
fn score_prompt(text: &str) -> i32 {
    let mut score = 0;
    let lower = text.to_lowercase();

    // Prefer prompts that describe actions
    let action_words = ["implement", "add", "create", "fix", "update", "build", "make", "set up",
                        "configure", "integrate", "refactor", "improve", "change", "modify"];
    for word in action_words {
        if lower.contains(word) {
            score += 10;
        }
    }

    // Prefer prompts with feature-like words
    let feature_words = ["feature", "component", "function", "api", "endpoint", "validation",
                         "authentication", "form", "page", "button", "modal", "test"];
    for word in feature_words {
        if lower.contains(word) {
            score += 5;
        }
    }

    // Penalize questions (often context-setting, not task description)
    if lower.starts_with("can you") || lower.starts_with("how do") || lower.starts_with("what") {
        score -= 5;
    }

    // Prefer medium-length prompts (not too short, not too long)
    let len = text.len();
    if len > 30 && len < 150 {
        score += 5;
    }

    score
}

/// Check if summary is actually useful (not an error, rate limit, etc)
fn is_useful_summary(summary: &str) -> bool {
    let lower = summary.to_lowercase();

    // Filter out error/system messages
    let garbage_patterns = [
        "hit your limit",
        "rate limit",
        "resets",
        "error",
        "failed to",
        "could not",
        "unable to",
        "try again",
        "timed out",
        "connection",
    ];

    for pattern in garbage_patterns {
        if lower.contains(pattern) {
            return false;
        }
    }

    // Must be reasonably long
    summary.len() > 15
}

/// Clean up description text
fn clean_description(text: &str) -> String {
    let mut result = text.to_string();

    // Remove XML-like tags
    let tag_patterns = ["<command-message>", "</command-message>", "<command-name>", "</command-name>",
                        "<local-command-caveat>", "</local-command-caveat>"];
    for pattern in tag_patterns {
        result = result.replace(pattern, "");
    }

    // Remove lines that are just commands
    let lines: Vec<&str> = result
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.starts_with('/') &&
            !trimmed.starts_with('<') &&
            !trimmed.is_empty()
        })
        .collect();

    result = lines.join(" ");

    // Truncate to first sentence or 150 chars
    let truncated = if let Some(period_pos) = result.find(". ") {
        if period_pos < 150 {
            result[..=period_pos].to_string()
        } else {
            format!("{}...", result.chars().take(150).collect::<String>().trim())
        }
    } else if result.len() > 150 {
        format!("{}...", result.chars().take(150).collect::<String>().trim())
    } else {
        result
    };

    truncated.trim().to_string()
}

/// Check if this is a noise session (just commands, init, etc)
fn is_noise(text: &str) -> bool {
    let lower = text.to_lowercase().trim().to_string();
    lower == "init" ||
    lower == "/init" ||
    lower.starts_with("/") && lower.len() < 20 ||
    lower.len() < 5
}

// ============================================================================
// AI Summarization
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

/// Build context string for AI summarization
fn build_session_context(entries: &[RawLogEntry], files: &[FileChange], tools: &HashMap<String, usize>) -> String {
    let mut context = String::new();

    // Add first user prompt
    for entry in entries.iter().take(10) {
        if entry.entry_type == "user" {
            if let Some(message) = &entry.message {
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
                    // Clean and truncate
                    let cleaned: String = t.lines()
                        .filter(|l| !l.trim().starts_with('<') && !l.trim().starts_with('/'))
                        .take(5)
                        .collect::<Vec<_>>()
                        .join(" ");
                    if !cleaned.trim().is_empty() {
                        context.push_str(&format!("User request: {}\n", cleaned.chars().take(300).collect::<String>()));
                        break;
                    }
                }
            }
        }
    }

    // Add files changed
    if !files.is_empty() {
        let file_list: Vec<&str> = files.iter().take(10).map(|f| f.path.as_str()).collect();
        context.push_str(&format!("Files modified: {}\n", file_list.join(", ")));
    }

    // Add tool summary
    if !tools.is_empty() {
        let tool_summary: Vec<String> = tools.iter()
            .filter(|(name, _)| *name != "Read" && *name != "Glob" && *name != "Grep")
            .map(|(name, count)| format!("{} ({})", name, count))
            .collect();
        if !tool_summary.is_empty() {
            context.push_str(&format!("Actions: {}\n", tool_summary.join(", ")));
        }
    }

    context
}

/// Call Claude Haiku to summarize a session
async fn ai_summarize_session(context: &str) -> Option<String> {
    let token = get_oauth_token()?;

    let client = Client::new();

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("Authorization", format!("Bearer {}", token))
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&json!({
            "model": "claude-3-5-haiku-latest",
            "max_tokens": 100,
            "messages": [{
                "role": "user",
                "content": format!(
                    "Summarize this coding session in one concise sentence (max 15 words). Focus on WHAT was accomplished, not HOW. Start with an action verb.\n\nSession:\n{}\n\nSummary:",
                    context
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

/// Generate a title from files changed
fn generate_title_from_files(files: &[FileChange]) -> Option<String> {
    if files.is_empty() {
        return None;
    }

    let filenames: Vec<&str> = files.iter()
        .take(3)
        .map(|f| f.path.split('/').last().unwrap_or(&f.path))
        .collect();

    let title = if filenames.len() == 1 {
        format!("Work on {}", filenames[0])
    } else if filenames.len() <= 3 {
        format!("Changes to {}", filenames.join(", "))
    } else {
        format!("Changes to {} and {} more", filenames[..2].join(", "), files.len() - 2)
    };

    Some(title)
}

fn extract_session_data(entries: &[RawLogEntry]) -> (Vec<FileChange>, HashMap<String, usize>) {
    let mut files_changed: Vec<FileChange> = Vec::new();
    let mut seen_files: HashSet<String> = HashSet::new();
    let mut tools_used: HashMap<String, usize> = HashMap::new();

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

                    let tool_name = block
                        .get("name")
                        .and_then(|n| n.as_str())
                        .unwrap_or("Unknown");

                    *tools_used.entry(tool_name.to_string()).or_insert(0) += 1;

                    // Extract file paths from Edit/Write tools
                    if tool_name == "Edit" || tool_name == "Write" {
                        if let Some(input) = block.get("input") {
                            if let Some(file_path) = input.get("file_path").and_then(|p| p.as_str())
                            {
                                if !seen_files.contains(file_path) {
                                    seen_files.insert(file_path.to_string());
                                    files_changed.push(FileChange {
                                        path: file_path.to_string(),
                                        action: if tool_name == "Write" {
                                            "created".to_string()
                                        } else {
                                            "edited".to_string()
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    (files_changed, tools_used)
}

fn generate_markdown(title: &str, date_range: &str, sessions: &[SessionSummary]) -> String {
    let now = Utc::now().format("%Y-%m-%d %H:%M UTC").to_string();

    let mut md = format!(
        r#"# {}

**Period:** {}
**Sessions:** {}

---

"#,
        title,
        date_range,
        sessions.len()
    );

    // Group by day
    let mut current_date = String::new();

    for session in sessions {
        let session_date = session.timestamp.split(' ').next().unwrap_or(&session.timestamp);

        if session_date != current_date {
            current_date = session_date.to_string();
            md.push_str(&format!("## {}\n\n", current_date));
        }

        // Just show the task - this is what was worked on
        md.push_str(&format!("- {}\n", session.prompt));
    }

    md.push_str(&format!("\n---\n*Generated: {}*\n", now));

    md
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Generate a markdown report for sessions in a date range
/// project_id is optional - if empty, includes all projects
/// use_ai - if true, uses Claude Haiku for better summaries (~$0.01/report)
#[tauri::command]
pub async fn generate_report(
    project_id: Option<String>,
    start_date: String,
    end_date: String,
    use_ai: Option<bool>,
) -> Result<ReportData, String> {
    let use_ai_summaries = use_ai.unwrap_or(false);
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

    let mut sessions: Vec<SessionSummary> = Vec::new();

    // Determine which project directories to scan
    let project_dirs: Vec<(PathBuf, String)> = if let Some(ref pid) = project_id {
        if pid.is_empty() {
            collect_all_projects(&projects_dir)?
        } else {
            let path = projects_dir.join(pid);
            if !path.exists() {
                return Err(format!("Project not found: {}", pid));
            }
            vec![(path, decode_project_name(pid))]
        }
    } else {
        collect_all_projects(&projects_dir)?
    };

    // Process each project
    for (project_path, project_name) in &project_dirs {
        let dir_entries = match fs::read_dir(project_path) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in dir_entries {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            let path = entry.path();

            if !path.is_file() || path.extension().map(|ext| ext != "jsonl").unwrap_or(true) {
                continue;
            }

            let entries = match read_session_entries(&path).await {
                Ok(e) if !e.is_empty() => e,
                _ => continue,
            };

            // Get session timestamp from first entry
            let (timestamp, session_ms) = entries
                .first()
                .map(|e| {
                    let parsed = DateTime::parse_from_rfc3339(&e.timestamp);
                    let formatted = parsed
                        .as_ref()
                        .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_else(|_| e.timestamp.clone());
                    let ms = parsed.map(|dt| dt.timestamp_millis()).unwrap_or(0);
                    (formatted, ms)
                })
                .unwrap_or_default();

            // Filter by actual session date, not file modification time
            if session_ms < start_ms || session_ms > end_ms {
                continue;
            }

            let (files_changed, tools_used) = extract_session_data(&entries);

            // Get description - use AI if enabled, otherwise fallback chain
            let description = if use_ai_summaries {
                let context = build_session_context(&entries, &files_changed, &tools_used);
                ai_summarize_session(&context).await
                    .or_else(|| extract_session_description(&entries))
                    .or_else(|| generate_title_from_files(&files_changed))
                    .unwrap_or_else(|| "Session activity".to_string())
            } else {
                extract_session_description(&entries)
                    .or_else(|| generate_title_from_files(&files_changed))
                    .unwrap_or_else(|| "Session activity".to_string())
            };

            let session_id = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            sessions.push(SessionSummary {
                id: session_id,
                project_name: project_name.clone(),
                timestamp,
                prompt: description,
                files_changed,
                tools_used,
            });
        }
    }

    // Sort sessions by timestamp
    sessions.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

    let title = if project_id.as_ref().map(|s| s.is_empty()).unwrap_or(true) {
        "All Projects Report".to_string()
    } else {
        format!("Report: {}", project_dirs.first().map(|(_, n)| n.as_str()).unwrap_or("Unknown"))
    };

    let date_range = format!("{} to {}", start_date, end_date);
    let markdown = generate_markdown(&title, &date_range, &sessions);

    let total_files_changed: usize = sessions
        .iter()
        .flat_map(|s| s.files_changed.iter().map(|f| f.path.as_str()))
        .collect::<HashSet<_>>()
        .len();

    let total_tool_calls: usize = sessions
        .iter()
        .map(|s| s.tools_used.values().sum::<usize>())
        .sum();

    Ok(ReportData {
        project_name: title,
        date_range,
        sessions: sessions.clone(),
        markdown,
        total_sessions: sessions.len(),
        total_files_changed,
        total_tool_calls,
    })
}

fn collect_all_projects(projects_dir: &PathBuf) -> Result<Vec<(PathBuf, String)>, String> {
    let mut result = Vec::new();

    for entry in fs::read_dir(projects_dir).map_err(|e| format!("Failed to read projects dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            let project_id = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
            let project_name = decode_project_name(&project_id);
            result.push((path, project_name));
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
