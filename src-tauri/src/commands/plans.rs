/**
 * Plans service commands
 *
 * Reads and processes Claude Code plan files from ~/.claude/plans/
 * Supports markdown parsing, title/overview extraction
 */

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ============================================================================
// Type Definitions - Match TypeScript interfaces
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    /// Plan ID (filename without extension)
    pub id: String,
    /// Plan title extracted from first heading
    pub title: String,
    /// Overview/description extracted from content
    pub overview: String,
    /// Full markdown content
    pub content: String,
    /// File path
    #[serde(rename = "filePath")]
    pub file_path: String,
    /// Last modified timestamp in ms
    #[serde(rename = "lastModified")]
    pub last_modified: i64,
    /// File size in bytes
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanSummary {
    /// Plan ID (filename without extension)
    pub id: String,
    /// Plan title extracted from first heading
    pub title: String,
    /// Overview/description extracted from content
    pub overview: String,
    /// Last modified timestamp in ms
    #[serde(rename = "lastModified")]
    pub last_modified: i64,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_plans_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home_dir.join(".claude").join("plans"))
}

fn get_file_modified_time(path: &std::path::Path) -> i64 {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Extract title from markdown content (first H1 or H2 heading)
fn extract_title(content: &str) -> String {
    // Try to find H1 heading
    if let Some(line) = content.lines().find(|l| l.starts_with("# ")) {
        return line.trim_start_matches("# ").trim().to_string();
    }

    // Try to find H2 heading
    if let Some(line) = content.lines().find(|l| l.starts_with("## ")) {
        return line.trim_start_matches("## ").trim().to_string();
    }

    "Untitled Plan".to_string()
}

/// Extract overview from markdown content
/// Looks for content after the title and before the first section
fn extract_overview(content: &str) -> String {
    // Remove the title line (first # or ##)
    let mut lines: Vec<&str> = content.lines().collect();

    // Find and remove the title line
    if let Some(pos) = lines.iter().position(|l| l.starts_with("# ") || l.starts_with("## ")) {
        lines.remove(pos);
    }

    // Collect lines before the next heading, rule, or code block
    let mut overview_lines = Vec::new();
    for line in lines {
        let trimmed = line.trim();

        // Stop at next heading, horizontal rule, or code block
        if trimmed.starts_with('#') || trimmed.starts_with("---") || trimmed.starts_with("```") {
            break;
        }

        overview_lines.push(line);
    }

    let overview = overview_lines
        .join("\n")
        .trim()
        .to_string();

    if overview.is_empty() {
        return "No description available".to_string();
    }

    // Return first 300 chars if too long
    if overview.len() > 300 {
        format!("{}...", overview.chars().take(300).collect::<String>())
    } else {
        overview
    }
}

/// Convert filename to readable title
fn filename_to_title(filename: &str) -> String {
    filename
        .trim_end_matches(".md")
        .split('-')
        .map(|word| {
            if word.is_empty() {
                word.to_string()
            } else {
                format!(
                    "{}{}",
                    word.chars().next().unwrap().to_uppercase().to_string(),
                    &word[1..]
                )
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all plans from ~/.claude/plans/
#[tauri::command]
pub async fn get_plans() -> Result<Vec<PlanSummary>, String> {
    let plans_dir = get_plans_dir()?;

    if !plans_dir.exists() {
        return Ok(Vec::new());
    }

    let mut plans = Vec::new();

    for entry in std::fs::read_dir(&plans_dir).map_err(|e| format!("Failed to read plans dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.extension().map(|ext| ext == "md").unwrap_or(false) {
            let filename = path.file_name().unwrap().to_string_lossy().to_string();
            let plan_id = filename.trim_end_matches(".md").to_string();

            if let Ok(content) = std::fs::read_to_string(&path) {
                let title = extract_title(&content);
                let overview = extract_overview(&content);
                let last_modified = get_file_modified_time(&path);

                plans.push(PlanSummary {
                    id: plan_id,
                    title,
                    overview,
                    last_modified,
                });
            }
        }
    }

    // Sort by last modified descending (newest first)
    plans.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

    Ok(plans)
}

/// Get a specific plan by ID
#[tauri::command]
pub async fn get_plan_by_id(plan_id: String) -> Result<Plan, String> {
    let plans_dir = get_plans_dir()?;
    let plan_path = plans_dir.join(format!("{}.md", plan_id));

    if !plan_path.exists() {
        return Err(format!("Plan not found: {}", plan_id));
    }

    let content = std::fs::read_to_string(&plan_path)
        .map_err(|e| format!("Failed to read plan file: {}", e))?;

    let title = extract_title(&content);
    let overview = extract_overview(&content);
    let last_modified = get_file_modified_time(&plan_path);
    let size = std::fs::metadata(&plan_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(Plan {
        id: plan_id,
        title,
        overview,
        content,
        file_path: plan_path.to_string_lossy().to_string(),
        last_modified,
        size,
    })
}
