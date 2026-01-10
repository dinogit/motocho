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
        })
        .collect();

    // Sort by count descending
    projects.sort_by(|a, b| b.count.cmp(&a.count));

    Ok(projects)
}
