/**
 * Settings service commands
 *
 * Reads and writes Claude Code settings from:
 * - ~/.claude/settings.json (global)
 * - {project}/.claude/settings.local.json (project-specific)
 */

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;

// ============================================================================
// Type Definitions
// ============================================================================

pub type ModelShorthand = String; // 'opus' | 'sonnet' | 'haiku'

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeSettings {
    /// Model preference (shorthand or full ID)
    pub model: Option<String>,
    /// Enable extended thinking by default
    #[serde(rename = "alwaysThinkingEnabled")]
    pub always_thinking_enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    /// Model preference (shorthand or full ID)
    pub model: Option<String>,
    /// Enable extended thinking by default
    #[serde(rename = "alwaysThinkingEnabled")]
    pub always_thinking_enabled: Option<bool>,
    /// Enabled MCP servers from .mcp.json
    #[serde(rename = "enabledMcpjsonServers")]
    pub enabled_mcpjson_servers: Option<Vec<String>>,
    /// Disabled MCP servers from .mcp.json
    #[serde(rename = "disabledMcpjsonServers")]
    pub disabled_mcpjson_servers: Option<Vec<String>>,
    /// Enable all project MCP servers automatically
    #[serde(rename = "enableAllProjectMcpServers")]
    pub enable_all_project_mcp_servers: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelOption {
    /// Shorthand (opus, sonnet, haiku)
    pub shorthand: String,
    /// Full model ID
    #[serde(rename = "fullId")]
    pub full_id: String,
    /// Display name
    #[serde(rename = "displayName")]
    pub display_name: String,
    /// Description
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsDashboardData {
    /// Global settings from ~/.claude/settings.json
    #[serde(rename = "globalSettings")]
    pub global_settings: ClaudeSettings,
    /// Project settings from .claude/settings.local.json
    #[serde(rename = "projectSettings")]
    pub project_settings: Option<ProjectSettings>,
    /// Current project path
    #[serde(rename = "currentProjectPath")]
    pub current_project_path: Option<String>,
    /// Available models
    #[serde(rename = "availableModels")]
    pub available_models: Vec<ModelOption>,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_global_settings_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home_dir.join(".claude").join("settings.json"))
}

fn get_project_settings_path(project_path: &str) -> PathBuf {
    let project_dir = PathBuf::from(project_path);
    project_dir.join(".claude").join("settings.local.json")
}

fn get_available_models() -> Vec<ModelOption> {
    vec![
        ModelOption {
            shorthand: "opus".to_string(),
            full_id: "claude-opus-4-5-20251101".to_string(),
            display_name: "Claude Opus 4.5".to_string(),
            description: "Most capable, highest quality".to_string(),
        },
        ModelOption {
            shorthand: "sonnet".to_string(),
            full_id: "claude-sonnet-4-5-20250929".to_string(),
            display_name: "Claude Sonnet 4.5".to_string(),
            description: "Balanced performance and speed".to_string(),
        },
        ModelOption {
            shorthand: "haiku".to_string(),
            full_id: "claude-haiku-3-5-20241022".to_string(),
            display_name: "Claude Haiku 3.5".to_string(),
            description: "Fastest, most economical".to_string(),
        },
    ]
}

async fn read_json_file(path: &PathBuf) -> Result<Value, String> {
    if !path.exists() {
        return Ok(json!({}));
    }

    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))
}

async fn write_json_file(path: &PathBuf, value: &Value) -> Result<(), String> {
    // Create parent directories if needed
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(value)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    tokio::fs::write(path, content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get settings data (global and project-specific)
#[tauri::command]
pub async fn get_settings_data(project_path: Option<String>) -> Result<SettingsDashboardData, String> {
    let global_path = get_global_settings_path()?;
    let global_json = read_json_file(&global_path).await?;
    let global_settings: ClaudeSettings = serde_json::from_value(global_json)
        .unwrap_or(ClaudeSettings {
            model: None,
            always_thinking_enabled: None,
        });

    let project_settings = if let Some(proj_path) = project_path.as_ref() {
        let proj_settings_path = get_project_settings_path(proj_path);
        let proj_json = read_json_file(&proj_settings_path).await?;
        serde_json::from_value(proj_json).ok()
    } else {
        None
    };

    Ok(SettingsDashboardData {
        global_settings,
        project_settings,
        current_project_path: project_path,
        available_models: get_available_models(),
    })
}

/// Update global settings
#[tauri::command]
pub async fn update_global_settings(settings: ClaudeSettings) -> Result<Value, String> {
    let path = get_global_settings_path()?;
    let mut json = read_json_file(&path).await?;

    if let Some(model) = settings.model {
        json["model"] = Value::String(model);
    }

    if let Some(thinking) = settings.always_thinking_enabled {
        json["alwaysThinkingEnabled"] = Value::Bool(thinking);
    }

    write_json_file(&path, &json).await?;
    Ok(json)
}

/// Update project-specific settings
#[tauri::command]
pub async fn update_project_settings(project_path: String, settings: ProjectSettings) -> Result<Value, String> {
    let path = get_project_settings_path(&project_path);
    let mut json = read_json_file(&path).await?;

    if let Some(model) = settings.model {
        json["model"] = Value::String(model);
    }

    if let Some(thinking) = settings.always_thinking_enabled {
        json["alwaysThinkingEnabled"] = Value::Bool(thinking);
    }

    if let Some(enabled) = settings.enabled_mcpjson_servers {
        json["enabledMcpjsonServers"] = serde_json::to_value(enabled)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
    }

    if let Some(disabled) = settings.disabled_mcpjson_servers {
        json["disabledMcpjsonServers"] = serde_json::to_value(disabled)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
    }

    if let Some(enable_all) = settings.enable_all_project_mcp_servers {
        json["enableAllProjectMcpServers"] = Value::Bool(enable_all);
    }

    write_json_file(&path, &json).await?;
    Ok(json)
}

/// Set model for global or project scope
#[tauri::command]
pub async fn set_model(model: String, scope: String, project_path: Option<String>) -> Result<Value, String> {
    match scope.as_str() {
        "global" => {
            let settings = ClaudeSettings {
                model: Some(model),
                always_thinking_enabled: None,
            };
            update_global_settings(settings).await
        }
        "project" => {
            let proj_path = project_path.ok_or("Project path required for project scope".to_string())?;
            let settings = ProjectSettings {
                model: Some(model),
                always_thinking_enabled: None,
                enabled_mcpjson_servers: None,
                disabled_mcpjson_servers: None,
                enable_all_project_mcp_servers: None,
            };
            update_project_settings(proj_path, settings).await
        }
        _ => Err(format!("Invalid scope: {}", scope)),
    }
}

/// Toggle thinking enabled for global or project scope
#[tauri::command]
pub async fn toggle_thinking(enabled: bool, scope: String, project_path: Option<String>) -> Result<Value, String> {
    match scope.as_str() {
        "global" => {
            let settings = ClaudeSettings {
                model: None,
                always_thinking_enabled: Some(enabled),
            };
            update_global_settings(settings).await
        }
        "project" => {
            let proj_path = project_path.ok_or("Project path required for project scope".to_string())?;
            let settings = ProjectSettings {
                model: None,
                always_thinking_enabled: Some(enabled),
                enabled_mcpjson_servers: None,
                disabled_mcpjson_servers: None,
                enable_all_project_mcp_servers: None,
            };
            update_project_settings(proj_path, settings).await
        }
        _ => Err(format!("Invalid scope: {}", scope)),
    }
}

/// Clear model setting for global or project scope
#[tauri::command]
pub async fn clear_model(scope: String, project_path: Option<String>) -> Result<Value, String> {
    match scope.as_str() {
        "global" => {
            let path = get_global_settings_path()?;
            let mut json = read_json_file(&path).await?;
            json.as_object_mut().map(|m| m.remove("model"));
            write_json_file(&path, &json).await?;
            Ok(json)
        }
        "project" => {
            let proj_path = project_path.ok_or("Project path required for project scope".to_string())?;
            let path = get_project_settings_path(&proj_path);
            let mut json = read_json_file(&path).await?;
            json.as_object_mut().map(|m| m.remove("model"));
            write_json_file(&path, &json).await?;
            Ok(json)
        }
        _ => Err(format!("Invalid scope: {}", scope)),
    }
}
