/**
 * History service commands
 *
 * Reads and processes command history from ~/.claude/history.jsonl
 */

use chrono::{DateTime, Local, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use tokio::io::{AsyncBufReadExt, BufReader};

// ============================================================================
// Type Definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub display: String,
    pub pasted_contents: HashMap<String, serde_json::Value>,
    pub timestamp: i64, // Unix timestamp in milliseconds
    pub project: String,
    pub session_id: String,
    #[serde(default)]
    pub source: String, // "code" | "codex"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub entry: HistoryEntry,
    pub project_name: String,
    pub formatted_date: String,
    pub formatted_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryStats {
    pub total_prompts: usize,
    pub unique_projects: usize,
    pub unique_sessions: usize,
    pub date_range: DateRange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DateRange {
    pub first: i64,
    pub last: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub path: String,
    pub name: String,
    pub count: usize,
    pub source: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_project_name(project_path: &str) -> String {
    let parts: Vec<&str> = project_path.split('/').filter(|p| !p.is_empty()).collect();
    if parts.len() >= 2 {
        format!("{}/{}", parts[parts.len() - 2], parts[parts.len() - 1])
    } else if !parts.is_empty() {
        parts.last().unwrap_or(&"").to_string()
    } else {
        "Unknown".to_string()
    }
}

fn format_timestamp(timestamp_ms: i64) -> (String, String) {
    let timestamp_s = timestamp_ms / 1000;
    if let Some(datetime) = DateTime::<Utc>::from_timestamp(timestamp_s, 0) {
        let local_datetime = datetime.with_timezone(&Local);
        let date = local_datetime.format("%b %d, %Y").to_string();
        let time = local_datetime.format("%H:%M").to_string();
        (date, time)
    } else {
        ("Unknown".to_string(), "Unknown".to_string())
    }
}

async fn read_history_entries() -> Result<Vec<HistoryEntry>, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let history_path = home_dir.join(".claude").join("history.jsonl");

    let file = tokio::fs::File::open(&history_path)
        .await
        .map_err(|e| format!("Failed to open history file: {}", e))?;

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

        match serde_json::from_str::<HistoryEntry>(&line) {
            Ok(entry) => {
                if !entry.display.is_empty() && entry.timestamp > 0 {
                    let mut entry = entry;
                    entry.source = "code".to_string();
                    entries.push(entry);
                }
            }
            Err(e) => {
                log::warn!("Failed to parse history entry: {}", e);
            }
        }
    }

    // Sort by timestamp descending (newest first)
    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(entries)
}

fn get_codex_sessions_dir() -> Result<std::path::PathBuf, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home_dir.join(".codex").join("sessions"))
}

fn list_codex_session_files(root: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut files = Vec::new();
    let Ok(entries) = std::fs::read_dir(root) else { return files };

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

fn parse_rfc3339_ms(ts: &str) -> Option<i64> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(ts) {
        Some(dt.timestamp_millis())
    } else {
        None
    }
}

async fn read_codex_history_entries() -> Result<Vec<HistoryEntry>, String> {
    let sessions_dir = get_codex_sessions_dir()?;
    if !sessions_dir.exists() {
        return Ok(Vec::new());
    }

    let files = list_codex_session_files(&sessions_dir);
    let mut entries: Vec<HistoryEntry> = Vec::new();

    for file_path in files {
        let file = tokio::fs::File::open(&file_path)
            .await
            .map_err(|e| format!("Failed to open session file: {}", e))?;

        let reader = BufReader::new(file);
        let mut lines = reader.lines();

        let mut session_id: String = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();
        let mut project_path: String = "unknown".to_string();

        while let Some(line) = lines
            .next_line()
            .await
            .map_err(|e| format!("Error reading line: {}", e))?
        {
            if line.trim().is_empty() {
                continue;
            }

            let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) else {
                continue;
            };

            let entry_type = value.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let timestamp = value.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");

            if entry_type == "session_meta" {
                if let Some(payload) = value.get("payload") {
                    if let Some(id) = payload.get("id").and_then(|v| v.as_str()) {
                        session_id = id.to_string();
                    }
                    if let Some(cwd) = payload.get("cwd").and_then(|v| v.as_str()) {
                        project_path = cwd.to_string();
                    }
                }
                continue;
            }

            if entry_type != "response_item" {
                continue;
            }

            let payload = value.get("payload").cloned().unwrap_or(serde_json::Value::Null);
            if payload.get("type").and_then(|v| v.as_str()) != Some("message") {
                continue;
            }

            let role = payload.get("role").and_then(|v| v.as_str()).unwrap_or("");
            if role != "user" {
                continue;
            }

            let content = payload.get("content").cloned().unwrap_or(serde_json::Value::Null);
            let mut text = String::new();
            if let serde_json::Value::Array(arr) = content {
                for item in arr {
                    if item.get("type").and_then(|v| v.as_str()) == Some("input_text") {
                        if let Some(t) = item.get("text").and_then(|v| v.as_str()) {
                            text = t.to_string();
                            break;
                        }
                    }
                }
            }

            if text.trim().is_empty() {
                continue;
            }

            let timestamp_ms = parse_rfc3339_ms(timestamp).unwrap_or(0);
            entries.push(HistoryEntry {
                display: text,
                pasted_contents: HashMap::new(),
                timestamp: timestamp_ms,
                project: project_path.clone(),
                session_id: session_id.clone(),
                source: "codex".to_string(),
            });
        }
    }

    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(entries)
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all history entries with optional limit
#[tauri::command]
pub async fn get_history(limit: Option<usize>) -> Result<Vec<SearchResult>, String> {
    let mut entries = read_history_entries().await?;

    if let Some(l) = limit {
        entries.truncate(l);
    }

    Ok(entries
        .into_iter()
        .map(|entry| {
            let (date, time) = format_timestamp(entry.timestamp);
            let project_name = get_project_name(&entry.project);
            SearchResult {
                entry,
                project_name,
                formatted_date: date,
                formatted_time: time,
            }
        })
        .collect())
}

/// Get all Codex history entries with optional limit
#[tauri::command]
pub async fn get_codex_history(limit: Option<usize>) -> Result<Vec<SearchResult>, String> {
    let mut entries = read_codex_history_entries().await?;

    if let Some(l) = limit {
        entries.truncate(l);
    }

    Ok(entries
        .into_iter()
        .map(|entry| {
            let (date, time) = format_timestamp(entry.timestamp);
            let project_name = get_project_name(&entry.project);
            SearchResult {
                entry,
                project_name,
                formatted_date: date,
                formatted_time: time,
            }
        })
        .collect())
}

/// Search history entries
#[tauri::command]
pub async fn search_history(
    query: String,
    project: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    let entries = read_history_entries().await?;
    let query_lower = query.to_lowercase();

    let mut filtered: Vec<HistoryEntry> = entries
        .into_iter()
        .filter(|entry| {
            let matches_query = entry.display.to_lowercase().contains(&query_lower);
            let matches_project = project
                .as_ref()
                .map(|p| entry.project.contains(p))
                .unwrap_or(true);
            matches_query && matches_project
        })
        .collect();

    if let Some(l) = limit {
        filtered.truncate(l);
    }

    Ok(filtered
        .into_iter()
        .map(|entry| {
            let (date, time) = format_timestamp(entry.timestamp);
            let project_name = get_project_name(&entry.project);
            SearchResult {
                entry,
                project_name,
                formatted_date: date,
                formatted_time: time,
            }
        })
        .collect())
}

/// Search Codex history entries
#[tauri::command]
pub async fn search_codex_history(
    query: String,
    project: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    let entries = read_codex_history_entries().await?;
    let query_lower = query.to_lowercase();

    let mut filtered: Vec<HistoryEntry> = entries
        .into_iter()
        .filter(|entry| {
            let matches_query = entry.display.to_lowercase().contains(&query_lower);
            let matches_project = project
                .as_ref()
                .map(|p| entry.project.contains(p))
                .unwrap_or(true);
            matches_query && matches_project
        })
        .collect();

    if let Some(l) = limit {
        filtered.truncate(l);
    }

    Ok(filtered
        .into_iter()
        .map(|entry| {
            let (date, time) = format_timestamp(entry.timestamp);
            let project_name = get_project_name(&entry.project);
            SearchResult {
                entry,
                project_name,
                formatted_date: date,
                formatted_time: time,
            }
        })
        .collect())
}

/// Get history statistics
#[tauri::command]
pub async fn get_history_stats() -> Result<HistoryStats, String> {
    let entries = read_history_entries().await?;

    if entries.is_empty() {
        return Ok(HistoryStats {
            total_prompts: 0,
            unique_projects: 0,
            unique_sessions: 0,
            date_range: DateRange { first: 0, last: 0 },
        });
    }

    let projects: HashSet<String> = entries.iter().map(|e| e.project.clone()).collect();
    let sessions: HashSet<String> = entries.iter().map(|e| e.session_id.clone()).collect();

    let first_timestamp = entries.last().map(|e| e.timestamp).unwrap_or(0);
    let last_timestamp = entries.first().map(|e| e.timestamp).unwrap_or(0);

    Ok(HistoryStats {
        total_prompts: entries.len(),
        unique_projects: projects.len(),
        unique_sessions: sessions.len(),
        date_range: DateRange {
            first: first_timestamp,
            last: last_timestamp,
        },
    })
}

/// Get Codex history statistics
#[tauri::command]
pub async fn get_codex_history_stats() -> Result<HistoryStats, String> {
    let entries = read_codex_history_entries().await?;

    if entries.is_empty() {
        return Ok(HistoryStats {
            total_prompts: 0,
            unique_projects: 0,
            unique_sessions: 0,
            date_range: DateRange { first: 0, last: 0 },
        });
    }

    let projects: HashSet<String> = entries.iter().map(|e| e.project.clone()).collect();
    let sessions: HashSet<String> = entries.iter().map(|e| e.session_id.clone()).collect();

    let first_timestamp = entries.iter().map(|e| e.timestamp).min().unwrap_or(0);
    let last_timestamp = entries.iter().map(|e| e.timestamp).max().unwrap_or(0);

    Ok(HistoryStats {
        total_prompts: entries.len(),
        unique_projects: projects.len(),
        unique_sessions: sessions.len(),
        date_range: DateRange {
            first: first_timestamp,
            last: last_timestamp,
        },
    })
}

/// Get unique projects from history
#[tauri::command]
pub async fn get_history_projects() -> Result<Vec<ProjectInfo>, String> {
    let entries = read_history_entries().await?;

    let mut project_counts: HashMap<String, usize> = HashMap::new();
    for entry in entries {
        *project_counts.entry(entry.project.clone()).or_insert(0) += 1;
    }

    let mut projects: Vec<ProjectInfo> = project_counts
        .into_iter()
        .map(|(path, count)| ProjectInfo {
            name: get_project_name(&path),
            path,
            count,
            source: "code".to_string(),
        })
        .collect();

    // Sort by count descending
    projects.sort_by(|a, b| b.count.cmp(&a.count));

    Ok(projects)
}

/// Get unique Codex projects from history
#[tauri::command]
pub async fn get_codex_history_projects() -> Result<Vec<ProjectInfo>, String> {
    let entries = read_codex_history_entries().await?;

    let mut project_counts: HashMap<String, usize> = HashMap::new();
    for entry in entries {
        *project_counts.entry(entry.project.clone()).or_insert(0) += 1;
    }

    let mut projects: Vec<ProjectInfo> = project_counts
        .into_iter()
        .map(|(path, count)| ProjectInfo {
            name: get_project_name(&path),
            path,
            count,
            source: "codex".to_string(),
        })
        .collect();

    projects.sort_by(|a, b| b.count.cmp(&a.count));
    Ok(projects)
}
