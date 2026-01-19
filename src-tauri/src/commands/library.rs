/**
 * Library service commands
 *
 * Manages saved skills/snippets in {projectPath}/.claude-dashboard/library/
 * Uses index.json to store skill metadata and full content
 */

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;
use uuid::Uuid;

// ============================================================================
// Type Definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibrarySkill {
    /// Unique identifier
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Description of what this skill does/contains
    pub description: String,
    /// Tags for organization and search
    pub tags: Vec<String>,
    /// The actual content (code, instructions, etc.)
    pub content: String,
    /// Optional notes from the user
    pub notes: Option<String>,
    /// Source information
    pub source: SkillSource,
    /// When this skill was saved
    #[serde(rename = "createdAt")]
    pub created_at: String,
    /// When this skill was last updated
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillSource {
    /// Project ID (encoded path)
    #[serde(rename = "projectId")]
    pub project_id: String,
    /// Session ID where this was found
    #[serde(rename = "sessionId")]
    pub session_id: String,
    /// Type of content: tool_use, tool_result, text
    #[serde(rename = "type")]
    pub source_type: String,
    /// Tool name if applicable
    #[serde(rename = "toolName")]
    pub tool_name: Option<String>,
    /// Original timestamp
    pub timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryIndex {
    /// Version for future migrations
    pub version: u32,
    /// All skills in this project's library
    pub skills: Vec<LibrarySkill>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveSkillInput {
    /// Name for the skill
    pub name: String,
    /// Description (can be auto-generated)
    pub description: String,
    /// Tags for organization
    pub tags: Vec<String>,
    /// The content to save
    pub content: String,
    /// Optional user notes
    pub notes: Option<String>,
    /// Source information
    pub source: SkillSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibrarySearchParams {
    /// Text search in name, description, content
    pub query: Option<String>,
    /// Filter by tags
    pub tags: Option<Vec<String>>,
    /// Limit results
    pub limit: Option<usize>,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_library_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".claude-dashboard")
        .join("library")
}

fn get_index_path(project_path: &str) -> PathBuf {
    get_library_dir(project_path).join("index.json")
}

async fn read_index(project_path: &str) -> Result<LibraryIndex, String> {
    let index_path = get_index_path(project_path);

    if !index_path.exists() {
        return Ok(LibraryIndex {
            version: 1,
            skills: Vec::new(),
        });
    }

    let content = tokio::fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read index: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse index: {}", e))
}

async fn write_index(project_path: &str, index: &LibraryIndex) -> Result<(), String> {
    let index_path = get_index_path(project_path);
    let lib_dir = get_library_dir(project_path);

    // Create directory if needed
    tokio::fs::create_dir_all(&lib_dir)
        .await
        .map_err(|e| format!("Failed to create library directory: {}", e))?;

    let content = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Failed to serialize index: {}", e))?;

    tokio::fs::write(&index_path, content)
        .await
        .map_err(|e| format!("Failed to write index: {}", e))?;

    Ok(())
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Save a new skill to the library
#[tauri::command]
pub async fn save_skill(project_path: String, skill_input: SaveSkillInput) -> Result<LibrarySkill, String> {
    let mut index = read_index(&project_path).await?;

    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let skill = LibrarySkill {
        id: Uuid::new_v4().to_string(),
        name: skill_input.name,
        description: skill_input.description,
        tags: skill_input.tags,
        content: skill_input.content,
        notes: skill_input.notes,
        source: skill_input.source,
        created_at: now.clone(),
        updated_at: now,
    };

    index.skills.push(skill.clone());
    write_index(&project_path, &index).await?;

    Ok(skill)
}

/// List all skills in the library with optional search/filter
#[tauri::command]
pub async fn list_skills(project_path: String, params: Option<LibrarySearchParams>) -> Result<Vec<LibrarySkill>, String> {
    let index = read_index(&project_path).await?;
    let mut skills = index.skills;

    if let Some(search_params) = params {
        // Filter by text search
        if let Some(query) = search_params.query {
            let query_lower = query.to_lowercase();
            skills.retain(|s| {
                s.name.to_lowercase().contains(&query_lower)
                    || s.description.to_lowercase().contains(&query_lower)
                    || s.content.to_lowercase().contains(&query_lower)
            });
        }

        // Filter by tags
        if let Some(search_tags) = search_params.tags {
            skills.retain(|s| {
                search_tags.iter().any(|tag| s.tags.contains(tag))
            });
        }

        // Limit results
        if let Some(limit) = search_params.limit {
            skills.truncate(limit);
        }
    }

    // Sort by created_at descending (newest first)
    skills.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(skills)
}

/// Get a specific skill by ID
#[tauri::command]
pub async fn get_skill(project_path: String, skill_id: String) -> Result<LibrarySkill, String> {
    let index = read_index(&project_path).await?;

    index
        .skills
        .into_iter()
        .find(|s| s.id == skill_id)
        .ok_or("Skill not found".to_string())
}

/// Delete a skill from the library
#[tauri::command]
pub async fn delete_skill(project_path: String, skill_id: String) -> Result<bool, String> {
    let mut index = read_index(&project_path).await?;
    let original_len = index.skills.len();

    index.skills.retain(|s| s.id != skill_id);

    if index.skills.len() == original_len {
        return Err("Skill not found".to_string());
    }

    write_index(&project_path, &index).await?;
    Ok(true)
}

/// Get all unique tags from the library
#[tauri::command]
pub async fn get_library_tags(project_path: String) -> Result<Vec<String>, String> {
    let index = read_index(&project_path).await?;
    let mut tags: Vec<String> = Vec::new();

    for skill in index.skills {
        for tag in skill.tags {
            if !tags.contains(&tag) {
                tags.push(tag);
            }
        }
    }

    tags.sort();
    Ok(tags)
}
