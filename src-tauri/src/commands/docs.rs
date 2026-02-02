/**
 * Documentation Generator Command
 *
 * Intent-First Architecture:
 *
 * Stage 1: Raw Data Collection (Rust)
 *   - Read CLAUDE.md from project (verbatim)
 *   - Extract user messages from sessions (verbatim)
 *   - NO keyword matching, NO pattern extraction
 *
 * Stage 2: Artifact Indexing (Rust, Deterministic)
 *   - Extract files from Write/Edit tool calls
 *   - Extract public symbols (full signatures)
 *   - No categorization, no guessing
 *
 * Stage 3: Intent Distillation + Writing (AI)
 *   - AI distills intent from raw data (goals, constraints, scope)
 *   - AI uses distilled intent as PRIMARY document structure
 *   - Code artifacts serve as EVIDENCE, not drivers
 */

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};

use crate::docs::{
    ArtifactExtractor, ArtifactIndex, ChangeType, FileArtifact,
    DocumentationWriter, DataCollector, WriterInput,
    read_claude_md,
};

// ============================================================================
// Result Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentationResult {
    #[serde(rename = "projectName")]
    pub project_name: String,
    pub markdown: String,
    #[serde(rename = "sessionCount")]
    pub session_count: usize,
    #[serde(rename = "fileCount")]
    pub file_count: usize,
    /// Status of the generation
    pub status: GenerationStatus,
    /// Debug info (in development)
    #[serde(rename = "debugInfo", skip_serializing_if = "Option::is_none")]
    pub debug_info: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GenerationStatus {
    /// Successfully generated with AI
    Success,
    /// No files found in sessions
    NoFilesFound,
    /// AI generation failed, using fallback
    FallbackUsed,
    /// Generated but with weak/no intent data (AI handled gracefully)
    WeakIntent,
}

// ============================================================================
// Session Log Types
// ============================================================================

#[derive(Debug, Deserialize)]
struct RawLogEntry {
    #[serde(rename = "type")]
    entry_type: String,
    message: Option<RawMessage>,
    cwd: Option<String>,
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

fn resolve_project_name(project_path: &Path) -> String {
    if let Some(name) = resolve_from_git_remote(project_path) {
        return name;
    }
    if let Some(name) = resolve_from_package_json(project_path) {
        return name;
    }
    project_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown Project")
        .to_string()
}

fn resolve_from_git_remote(project_path: &Path) -> Option<String> {
    let dir_entries = std::fs::read_dir(project_path).ok()?;
    for entry in dir_entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                for line in content.lines().take(20) {
                    if let Ok(json) = serde_json::from_str::<Value>(line) {
                        if let Some(cwd) = json.get("cwd").and_then(|v| v.as_str()) {
                            let output = Command::new("git")
                                .args(["remote", "get-url", "origin"])
                                .current_dir(cwd)
                                .output()
                                .ok()?;
                            if output.status.success() {
                                let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
                                return extract_repo_name(&url);
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

fn extract_repo_name(url: &str) -> Option<String> {
    if url.contains(':') && url.contains('@') {
        let parts: Vec<&str> = url.split(':').collect();
        if parts.len() == 2 {
            let repo_path = parts[1].trim_end_matches(".git");
            if let Some(name) = repo_path.split('/').last() {
                return Some(name.to_string());
            }
        }
    }
    if url.starts_with("http") {
        let trimmed = url.trim_end_matches(".git");
        if let Some(name) = trimmed.split('/').last() {
            return Some(name.to_string());
        }
    }
    None
}

fn resolve_from_package_json(project_path: &Path) -> Option<String> {
    let dir_entries = std::fs::read_dir(project_path).ok()?;
    for entry in dir_entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                for line in content.lines().take(20) {
                    if let Ok(json) = serde_json::from_str::<Value>(line) {
                        if let Some(cwd) = json.get("cwd").and_then(|v| v.as_str()) {
                            let pkg_path = Path::new(cwd).join("package.json");
                            if let Ok(pkg_content) = std::fs::read_to_string(&pkg_path) {
                                if let Ok(pkg_json) = serde_json::from_str::<Value>(&pkg_content) {
                                    if let Some(name) = pkg_json.get("name").and_then(|n| n.as_str()) {
                                        return Some(name.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

/// Get project working directory from session entries
fn get_project_cwd(entries: &[RawLogEntry]) -> Option<PathBuf> {
    for entry in entries.iter().take(20) {
        if let Some(cwd) = &entry.cwd {
            return Some(PathBuf::from(cwd));
        }
    }
    None
}

fn is_documentable_file(path: &str) -> bool {
    let ext = path.rsplit('.').next().unwrap_or("");
    matches!(
        ext,
        "ts" | "tsx" | "js" | "jsx" | "rs" | "py" | "go" | "json" | "yaml" | "yml" | "toml"
            | "css" | "scss" | "md" | "mdx"
    )
}

// ============================================================================
// Session Reading
// ============================================================================

async fn read_session_entries(session_path: &Path) -> Result<Vec<RawLogEntry>, String> {
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

// ============================================================================
// Stage 1: Intent Extraction Helpers
// ============================================================================

/// Extract user messages (verbatim) from session entries
fn extract_user_messages(entries: &[RawLogEntry]) -> Vec<String> {
    let mut messages = Vec::new();

    for entry in entries {
        if entry.entry_type != "user" {
            continue;
        }

        if let Some(message) = &entry.message {
            match &message.content {
                Value::String(text) => {
                    let trimmed = text.trim();
                    if !trimmed.is_empty() && trimmed.len() > 5 {
                        messages.push(trimmed.to_string());
                    }
                }
                Value::Array(arr) => {
                    for block in arr {
                        if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                            let trimmed = text.trim();
                            if !trimmed.is_empty() && trimmed.len() > 5 {
                                messages.push(trimmed.to_string());
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    // First 10 messages per session
    messages.truncate(10);
    messages
}

// ============================================================================
// Stage 2: Artifact Extraction Helpers
// ============================================================================

/// Extract file artifacts from session entries
fn extract_file_artifacts(entries: &[RawLogEntry]) -> Vec<(String, String, ChangeType)> {
    let mut artifacts: HashMap<String, (String, ChangeType)> = HashMap::new();

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
                    let input = block.get("input");

                    match tool_name {
                        "Write" => {
                            if let (Some(path), Some(content)) = (
                                input.and_then(|i| i.get("file_path")).and_then(|p| p.as_str()),
                                input.and_then(|i| i.get("content")).and_then(|c| c.as_str()),
                            ) {
                                if is_documentable_file(path) {
                                    artifacts.insert(
                                        path.to_string(),
                                        (content.to_string(), ChangeType::Created),
                                    );
                                }
                            }
                        }
                        "Edit" => {
                            if let Some(path) =
                                input.and_then(|i| i.get("file_path")).and_then(|p| p.as_str())
                            {
                                if is_documentable_file(path) && !artifacts.contains_key(path) {
                                    // Try to read current content from disk
                                    if let Ok(content) = std::fs::read_to_string(path) {
                                        artifacts.insert(
                                            path.to_string(),
                                            (content, ChangeType::Modified),
                                        );
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

    artifacts
        .into_iter()
        .map(|(path, (content, change_type))| (path, content, change_type))
        .collect()
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Generate documentation using the three-stage architecture
#[tauri::command]
pub async fn generate_documentation(
    project_id: String,
    session_ids: Vec<String>,
    use_ai: Option<bool>,
    audience: Option<String>,
    custom_prompt: Option<String>,
) -> Result<DocumentationResult, String> {
    let use_ai_generation = use_ai.unwrap_or(true);
    let audience_str = audience.unwrap_or_else(|| "engineer".to_string());
    let projects_dir = get_projects_dir()?;
    let project_path = projects_dir.join(&project_id);

    if !project_path.exists() {
        return Err(format!("Project not found: {}", project_id));
    }

    let project_name = resolve_project_name(&project_path);

    // ========================================================================
    // Collect data from all sessions
    // ========================================================================
    let mut all_user_messages: Vec<String> = Vec::new();
    let mut all_file_artifacts: Vec<(String, String, ChangeType)> = Vec::new();
    let mut project_cwd: Option<PathBuf> = None;

    for session_id in &session_ids {
        let session_path = project_path.join(format!("{}.jsonl", session_id));
        if !session_path.exists() {
            continue;
        }

        let entries = match read_session_entries(&session_path).await {
            Ok(data) => data,
            Err(_) => continue,
        };

        // Get project cwd (for reading CLAUDE.md)
        if project_cwd.is_none() {
            project_cwd = get_project_cwd(&entries);
        }

        // Extract user messages (Stage 1 input)
        let messages = extract_user_messages(&entries);
        all_user_messages.extend(messages);

        // Extract file artifacts (Stage 2 input)
        let artifacts = extract_file_artifacts(&entries);
        all_file_artifacts.extend(artifacts);
    }

    // ========================================================================
    // Stage 1: Raw Data Collection (NO INTERPRETATION)
    // ========================================================================
    eprintln!("[Stage 1] Collecting raw intent data...");

    // Read CLAUDE.md if available (verbatim, no extraction)
    let claude_md_content = project_cwd.as_ref().and_then(|cwd| read_claude_md(cwd));

    // Limit user messages to first 15 total (more context for AI to distill)
    all_user_messages.truncate(15);

    // Collect raw data - NO interpretation happens here
    let raw_intent = DataCollector::collect(
        claude_md_content,
        all_user_messages,
        session_ids.len(),
    );

    eprintln!(
        "[Stage 1] Raw data collected: {}",
        raw_intent.summary()
    );

    // Track if we have weak intent (for status reporting)
    let has_weak_intent = !raw_intent.has_sufficient_data();

    // ========================================================================
    // Stage 2: Artifact Indexing (DETERMINISTIC, NO AI)
    // ========================================================================
    eprintln!("[Stage 2] Indexing artifacts...");

    // Deduplicate artifacts by path (keep last version)
    let mut unique_artifacts: HashMap<String, (String, ChangeType)> = HashMap::new();
    for (path, content, change_type) in all_file_artifacts {
        unique_artifacts.insert(path, (content, change_type));
    }

    // Build FileArtifact objects with public symbol extraction
    let file_artifacts: Vec<FileArtifact> = unique_artifacts
        .into_iter()
        .map(|(path, (content, change_type))| {
            ArtifactExtractor::create_artifact(path, content, change_type)
        })
        .collect();

    if file_artifacts.is_empty() {
        return Ok(DocumentationResult {
            project_name,
            markdown: "# Documentation\n\nNo documentable files found in the selected sessions.".to_string(),
            session_count: session_ids.len(),
            file_count: 0,
            status: GenerationStatus::NoFilesFound,
            debug_info: None,
        });
    }

    let artifact_index = ArtifactIndex::new(file_artifacts);
    let file_count = artifact_index.total_files;

    eprintln!(
        "[Stage 2] Indexed {} files with {} total symbols",
        artifact_index.total_files,
        artifact_index.files.iter().map(|f| f.public_symbols.len()).sum::<usize>()
    );

    // ========================================================================
    // Stage 3: Intent Distillation + Writing (AI ONLY)
    // ========================================================================
    eprintln!("[Stage 3] AI distilling intent and writing documentation...");

    let writer_input = WriterInput {
        project_name: project_name.clone(),
        audience: audience_str,
        raw_intent,
        artifacts: artifact_index,
        session_count: session_ids.len(),
    };

    // Debug info for development
    let debug_info = if cfg!(debug_assertions) {
        writer_input.to_json().ok()
    } else {
        None
    };

    let output = if use_ai_generation {
        DocumentationWriter::write(writer_input, custom_prompt.as_deref())
            .map_err(|e| format!("Writer failed: {}", e))?
    } else {
        DocumentationWriter::write_without_ai(writer_input)
    };

    // Determine status based on AI success and intent quality
    let status = if !output.ai_generated {
        GenerationStatus::FallbackUsed
    } else if has_weak_intent {
        GenerationStatus::WeakIntent
    } else {
        GenerationStatus::Success
    };

    eprintln!(
        "[Stage 3] Documentation generated (ai={}, status={:?})",
        output.ai_generated,
        status
    );

    Ok(DocumentationResult {
        project_name,
        markdown: output.markdown,
        session_count: session_ids.len(),
        file_count,
        status,
        debug_info,
    })
}

/// Get the intent and artifact data for preview
#[tauri::command]
pub async fn get_documentation_prompt(
    project_id: String,
    session_ids: Vec<String>,
    audience: Option<String>,
) -> Result<String, String> {
    let audience_str = audience.unwrap_or_else(|| "engineer".to_string());
    let projects_dir = get_projects_dir()?;
    let project_path = projects_dir.join(&project_id);

    if !project_path.exists() {
        return Err(format!("Project not found: {}", project_id));
    }

    let project_name = resolve_project_name(&project_path);

    // Collect data
    let mut all_user_messages: Vec<String> = Vec::new();
    let mut all_file_artifacts: Vec<(String, String, ChangeType)> = Vec::new();
    let mut project_cwd: Option<PathBuf> = None;

    for session_id in &session_ids {
        let session_path = project_path.join(format!("{}.jsonl", session_id));
        if !session_path.exists() {
            continue;
        }

        let entries = match read_session_entries(&session_path).await {
            Ok(data) => data,
            Err(_) => continue,
        };

        if project_cwd.is_none() {
            project_cwd = get_project_cwd(&entries);
        }

        let messages = extract_user_messages(&entries);
        all_user_messages.extend(messages);

        let artifacts = extract_file_artifacts(&entries);
        all_file_artifacts.extend(artifacts);
    }

    // Stage 1: Collect raw data (no interpretation)
    let claude_md_content = project_cwd.as_ref().and_then(|cwd| read_claude_md(cwd));
    all_user_messages.truncate(15);

    let raw_intent = DataCollector::collect(
        claude_md_content,
        all_user_messages,
        session_ids.len(),
    );

    // Stage 2: Index artifacts
    let mut unique_artifacts: HashMap<String, (String, ChangeType)> = HashMap::new();
    for (path, content, change_type) in all_file_artifacts {
        unique_artifacts.insert(path, (content, change_type));
    }

    let file_artifacts: Vec<FileArtifact> = unique_artifacts
        .into_iter()
        .map(|(path, (content, change_type))| {
            ArtifactExtractor::create_artifact(path, content, change_type)
        })
        .collect();

    let artifact_index = ArtifactIndex::new(file_artifacts);

    // Build writer input and return as JSON
    let writer_input = WriterInput {
        project_name,
        audience: audience_str,
        raw_intent,
        artifacts: artifact_index,
        session_count: session_ids.len(),
    };

    writer_input
        .to_json()
        .map_err(|e| format!("Failed to serialize: {}", e))
}
