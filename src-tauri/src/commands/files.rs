/**
 * Files service commands
 *
 * Extracts Write/Edit tool calls from session transcripts to track file modifications
 * Supports aggregation by file, session, and change lookup
 */

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tokio::io::{AsyncBufReadExt, BufReader};

// ============================================================================
// Type Definitions - Match TypeScript interfaces
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChange {
    pub hash: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "type")]
    pub change_type: String, // "write" or "edit"
    pub timestamp: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "oldContent")]
    pub old_content: Option<String>,
    #[serde(rename = "messageUuid")]
    pub message_uuid: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHistory {
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "changeCount")]
    pub change_count: usize,
    #[serde(rename = "sessionIds")]
    pub session_ids: Vec<String>,
    #[serde(rename = "lastChange")]
    pub last_change: FileChange,
    pub changes: Vec<FileChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHistoryStats {
    #[serde(rename = "totalFiles")]
    pub total_files: usize,
    #[serde(rename = "totalChanges")]
    pub total_changes: usize,
    #[serde(rename = "totalLinesWritten")]
    pub total_lines_written: usize,
    #[serde(rename = "topFiles")]
    pub top_files: Vec<TopFile>,
    #[serde(rename = "sessionCount")]
    pub session_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopFile {
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "changeCount")]
    pub change_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionFileInfo {
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub changes: Vec<FileChange>,
    #[serde(rename = "changeCount")]
    pub change_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionFileChanges {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "projectName")]
    pub project_name: String,
    pub timestamp: String,
    pub summary: String,
    pub files: Vec<SessionFileInfo>,
    #[serde(rename = "changeCount")]
    pub change_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub timestamp: String,
    #[serde(rename = "type")]
    pub diff_type: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "oldContent")]
    pub old_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "previousContent")]
    pub previous_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "previousHash")]
    pub previous_hash: Option<String>,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_projects_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home_dir.join(".claude").join("projects"))
}

fn calculate_hash(content: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn get_filename(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(path)
        .to_string()
}

/// Extract file changes from a message's content blocks
fn extract_file_changes_from_message(
    message_uuid: &str,
    content: &Value,
    timestamp: &str,
    session_id: &str,
    project_id: &str,
) -> Vec<FileChange> {
    let mut changes = Vec::new();

    if let Value::Array(blocks) = content {
        for block in blocks {
            // Look for tool_use blocks that are Write or Edit operations
            if block.get("type").and_then(|v| v.as_str()) == Some("tool_use") {
                if let Some(tool_name) = block.get("name").and_then(|v| v.as_str()) {
                    if tool_name == "Write" || tool_name == "Edit" {
                        if let Some(input) = block.get("input") {
                            let file_path = input.get("file_path").and_then(|v| v.as_str());

                            if tool_name == "Write" {
                                if let (Some(file_path_str), Some(content_str)) =
                                    (file_path, input.get("content").and_then(|v| v.as_str()))
                                {
                                    let hash = calculate_hash(content_str);
                                    changes.push(FileChange {
                                        hash,
                                        session_id: session_id.to_string(),
                                        project_id: project_id.to_string(),
                                        file_path: file_path_str.to_string(),
                                        change_type: "write".to_string(),
                                        timestamp: timestamp.to_string(),
                                        content: content_str.to_string(),
                                        old_content: None,
                                        message_uuid: message_uuid.to_string(),
                                    });
                                }
                            } else if tool_name == "Edit" {
                                if let (Some(file_path_str), Some(new_str), Some(old_str)) =
                                    (file_path, input.get("new_string").and_then(|v| v.as_str()),
                                     input.get("old_string").and_then(|v| v.as_str()))
                                {
                                    let hash = calculate_hash(new_str);
                                    changes.push(FileChange {
                                        hash,
                                        session_id: session_id.to_string(),
                                        project_id: project_id.to_string(),
                                        file_path: file_path_str.to_string(),
                                        change_type: "edit".to_string(),
                                        timestamp: timestamp.to_string(),
                                        content: new_str.to_string(),
                                        old_content: Some(old_str.to_string()),
                                        message_uuid: message_uuid.to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    changes
}

/// Read session JSONL and extract all file changes
async fn get_changes_from_session(
    session_path: &Path,
    session_id: &str,
    project_id: &str,
) -> Result<Vec<FileChange>, String> {
    let file = tokio::fs::File::open(session_path)
        .await
        .map_err(|e| format!("Failed to open session file: {}", e))?;

    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    let mut changes = Vec::new();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| format!("Error reading line: {}", e))?
    {
        if line.trim().is_empty() {
            continue;
        }

        if let Ok(entry) = serde_json::from_str::<serde_json::Value>(&line) {
            if let (Some(uuid), Some(timestamp), Some(content)) = (
                entry.get("uuid").and_then(|v| v.as_str()),
                entry.get("timestamp").and_then(|v| v.as_str()),
                entry.get("message").and_then(|v| v.get("content")),
            ) {
                let file_changes = extract_file_changes_from_message(
                    uuid,
                    content,
                    timestamp,
                    session_id,
                    project_id,
                );
                changes.extend(file_changes);
            }
        }
    }

    // Sort by timestamp descending (newest first)
    changes.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(changes)
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all file changes across all sessions
#[tauri::command]
pub async fn get_all_file_changes() -> Result<Vec<FileChange>, String> {
    let projects_dir = get_projects_dir()?;

    if !projects_dir.exists() {
        return Ok(Vec::new());
    }

    let mut all_changes = Vec::new();

    // Iterate through projects
    for project_entry in fs::read_dir(&projects_dir)
        .map_err(|e| format!("Failed to read projects: {}", e))?
    {
        let project_entry = project_entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let project_path = project_entry.path();

        if !project_path.is_dir() {
            continue;
        }

        let project_id = project_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Iterate through sessions
        for session_entry in fs::read_dir(&project_path)
            .map_err(|e| format!("Failed to read sessions: {}", e))?
        {
            let session_entry = session_entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let session_path = session_entry.path();

            if session_path.is_file()
                && session_path
                    .extension()
                    .map(|ext| ext == "jsonl")
                    .unwrap_or(false)
            {
                let session_id = session_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|s| s.trim_end_matches(".jsonl").to_string())
                    .unwrap_or_default();

                match get_changes_from_session(&session_path, &session_id, &project_id).await {
                    Ok(changes) => all_changes.extend(changes),
                    Err(e) => {
                        log::warn!("Failed to extract changes from session: {}", e);
                    }
                }
            }
        }
    }

    // Sort by timestamp descending
    all_changes.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(all_changes)
}

/// Get file history stats
#[tauri::command]
pub async fn get_file_history_stats() -> Result<FileHistoryStats, String> {
    let all_changes = get_all_file_changes().await?;

    let mut file_counts: HashMap<String, usize> = HashMap::new();
    let mut session_ids: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut total_lines = 0;

    for change in &all_changes {
        *file_counts.entry(change.file_path.clone()).or_insert(0) += 1;
        session_ids.insert(change.session_id.clone());
        total_lines += change.content.lines().count();
    }

    let mut top_files: Vec<TopFile> = file_counts
        .into_iter()
        .map(|(file_path, change_count)| TopFile {
            file_path,
            change_count,
        })
        .collect();

    top_files.sort_by(|a, b| b.change_count.cmp(&a.change_count));
    top_files.truncate(10);

    Ok(FileHistoryStats {
        total_files: top_files.len(),
        total_changes: all_changes.len(),
        total_lines_written: total_lines,
        top_files,
        session_count: session_ids.len(),
    })
}

/// Get file histories grouped by file
#[tauri::command]
pub async fn get_file_histories() -> Result<Vec<FileHistory>, String> {
    let all_changes = get_all_file_changes().await?;

    let mut files_map: HashMap<String, Vec<FileChange>> = HashMap::new();

    for change in all_changes {
        files_map
            .entry(change.file_path.clone())
            .or_insert_with(Vec::new)
            .push(change);
    }

    let mut histories = Vec::new();

    for (file_path, mut changes) in files_map {
        if changes.is_empty() {
            continue;
        }

        // Sort by timestamp descending
        changes.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        let session_ids: std::collections::HashSet<String> =
            changes.iter().map(|c| c.session_id.clone()).collect();

        let last_change = changes.first().unwrap().clone();

        histories.push(FileHistory {
            file_path: file_path.clone(),
            display_name: get_filename(&file_path),
            change_count: changes.len(),
            session_ids: session_ids.into_iter().collect(),
            last_change,
            changes,
        });
    }

    // Sort by change count descending
    histories.sort_by(|a, b| b.change_count.cmp(&a.change_count));

    Ok(histories)
}

/// Get all sessions that have file changes
#[tauri::command]
pub async fn get_sessions_with_file_changes() -> Result<Vec<SessionFileChanges>, String> {
    let projects_dir = get_projects_dir()?;

    if !projects_dir.exists() {
        return Ok(Vec::new());
    }

    let mut result = Vec::new();

    // Iterate through projects
    for project_entry in fs::read_dir(&projects_dir)
        .map_err(|e| format!("Failed to read projects: {}", e))?
    {
        let project_entry = project_entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let project_path = project_entry.path();

        if !project_path.is_dir() {
            continue;
        }

        let project_id = project_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let project_name = project_id.clone();

        // Iterate through sessions
        for session_entry in fs::read_dir(&project_path)
            .map_err(|e| format!("Failed to read sessions: {}", e))?
        {
            let session_entry = session_entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let session_path = session_entry.path();

            if session_path.is_file()
                && session_path
                    .extension()
                    .map(|ext| ext == "jsonl")
                    .unwrap_or(false)
            {
                let session_id = session_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|s| s.trim_end_matches(".jsonl").to_string())
                    .unwrap_or_default();

                // Get summary if possible
                let mut summary = String::new();
                let mut first_user_message = String::new();
                if let Ok(file) = fs::File::open(&session_path) {
                    use std::io::{BufRead, BufReader};
                    let reader = BufReader::new(file);
                    for line in reader.lines().flatten() {
                        if line.contains("\"type\":\"summary\"") {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                                if let Some(s) = val.get("summary").and_then(|v| v.as_str()) {
                                    summary = s.to_string();
                                    break;
                                }
                            }
                        }
                        if summary.is_empty() && first_user_message.is_empty() && line.contains("\"type\":\"user\"") {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                                if let Some(message) = val.get("message") {
                                    if let Some(content) = message.get("content") {
                                        match content {
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
                            }
                        }
                    }
                }
                if summary.is_empty() {
                    summary = first_user_message;
                }

                match get_changes_from_session(&session_path, &session_id, &project_id).await {
                    Ok(changes) if !changes.is_empty() => {
                        // Group changes by file
                        let mut files_map: HashMap<String, Vec<FileChange>> = HashMap::new();

                        for change in changes {
                            files_map
                                .entry(change.file_path.clone())
                                .or_insert_with(Vec::new)
                                .push(change);
                        }

                        let mut files = Vec::new();
                        let mut total_changes = 0;

                        for (file_path, file_changes) in files_map {
                            total_changes += file_changes.len();
                            files.push(SessionFileInfo {
                                file_path: file_path.clone(),
                                display_name: get_filename(&file_path),
                                change_count: file_changes.len(),
                                changes: file_changes,
                            });
                        }

                        if !files.is_empty() {
                            result.push(SessionFileChanges {
                                session_id,
                                project_id: project_id.clone(),
                                project_name: project_name.clone(),
                                timestamp: session_path
                                    .metadata()
                                    .ok()
                                    .and_then(|m| m.modified().ok())
                                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                                    .map(|d| d.as_millis().to_string())
                                    .unwrap_or_default(),
                                summary,
                                files,
                                change_count: total_changes,
                            });
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    // Sort by timestamp descending
    result.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(result)
}

/// Get file changes for a specific session
#[tauri::command]
pub async fn get_session_file_changes(
    project_id: String,
    session_id: String,
) -> Result<SessionFileChanges, String> {
    let projects_dir = get_projects_dir()?;
    let session_path = projects_dir
        .join(&project_id)
        .join(format!("{}.jsonl", session_id));

    if !session_path.exists() {
        return Err("Session not found".to_string());
    }

    let changes = get_changes_from_session(&session_path, &session_id, &project_id).await?;

    // Get summary if possible
    let mut summary = String::new();
    let mut first_user_message = String::new();
    if let Ok(file) = fs::File::open(&session_path) {
        use std::io::{BufRead, BufReader};
        let reader = BufReader::new(file);
        for line in reader.lines().flatten() {
            if line.contains("\"type\":\"summary\"") {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                    if let Some(s) = val.get("summary").and_then(|v| v.as_str()) {
                        summary = s.to_string();
                        break;
                    }
                }
            }
            if summary.is_empty() && first_user_message.is_empty() && line.contains("\"type\":\"user\"") {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                    if let Some(message) = val.get("message") {
                        if let Some(content) = message.get("content") {
                            match content {
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
                }
            }
        }
    }
    if summary.is_empty() {
        summary = first_user_message;
    }

    // Group by file
    let mut files_map: HashMap<String, Vec<FileChange>> = HashMap::new();

    for change in changes {
        files_map
            .entry(change.file_path.clone())
            .or_insert_with(Vec::new)
            .push(change);
    }

    let mut files = Vec::new();
    let mut total_changes = 0;

    for (file_path, file_changes) in files_map {
        total_changes += file_changes.len();
        files.push(SessionFileInfo {
            file_path: file_path.clone(),
            display_name: get_filename(&file_path),
            change_count: file_changes.len(),
            changes: file_changes,
        });
    }

    Ok(SessionFileChanges {
        session_id,
        project_name: project_id.clone(),
        project_id,
        timestamp: session_path
            .metadata()
            .ok()
            .and_then(|m: std::fs::Metadata| m.modified().ok())
            .and_then(|t: std::time::SystemTime| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d: std::time::Duration| d.as_millis().to_string())
            .unwrap_or_default(),
        summary,
        files,
        change_count: total_changes,
    })
}

/// Get a specific file change by hash
#[tauri::command]
pub async fn get_file_change_by_hash(
    project_id: String,
    session_id: String,
    hash: String,
) -> Result<FileDiff, String> {
    let projects_dir = get_projects_dir()?;
    let session_path = projects_dir
        .join(&project_id)
        .join(format!("{}.jsonl", session_id));

    let changes = get_changes_from_session(&session_path, &session_id, &project_id).await?;

    let change = changes
        .into_iter()
        .find(|c| c.hash == hash)
        .ok_or_else(|| "Change not found".to_string())?;

    Ok(FileDiff {
        file_path: change.file_path,
        session_id: change.session_id,
        project_id: change.project_id,
        timestamp: change.timestamp,
        diff_type: change.change_type,
        content: change.content,
        old_content: change.old_content,
        previous_content: None,
        previous_hash: None,
    })
}
