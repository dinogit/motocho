/**
 * MCP (Model Context Protocol) service commands
 *
 * Manages MCP server configurations stored in:
 * - ~/.claude.json → per-project server configs
 * - ~/.claude/plugins/ → marketplace plugins with .mcp.json files
 */

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tokio::fs as tokio_fs;

// ============================================================================
// Type Definitions - Match TypeScript interfaces
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    pub name: String,
    #[serde(rename = "type")]
    pub server_type: String, // "http", "sse", "stdio"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from_mcp_json: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMcpConfig {
    pub project_path: String,
    pub project_name: String,
    pub servers: Vec<McpServer>,
    pub context_uris: Vec<String>,
    pub enabled_servers: Vec<String>,
    pub disabled_servers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRef {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStats {
    pub total_servers: usize,
    pub projects_with_mcp: usize,
    pub available_plugins: usize,
    pub installed_plugins: usize,
    pub top_servers: Vec<TopServer>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopServer {
    pub name: String,
    pub project_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpDashboardData {
    pub projects: Vec<ProjectMcpConfig>,
    pub all_projects: Vec<ProjectRef>,
    pub plugins: Vec<McpPlugin>,
    pub global_servers: Vec<McpServer>,
    pub stats: McpStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpPlugin {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub server_config: HashMap<String, McpServerConfig>,
    pub is_installed: bool,
    pub active_in_projects: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    #[serde(rename = "type")]
    pub config_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
}

// Structs for parsing ~/.claude.json
#[derive(Debug, Deserialize)]
struct ClaudeConfig {
    projects: Option<HashMap<String, ProjectConfigEntry>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectConfigEntry {
    #[serde(default)]
    mcp_servers: HashMap<String, McpServerConfig>,
    #[serde(default)]
    mcp_context_uris: Vec<String>,
    #[serde(default)]
    enabled_mcpjson_servers: Vec<String>,
    #[serde(default)]
    disabled_mcpjson_servers: Vec<String>,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_home_dir() -> Result<PathBuf, String> {
    dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())
}

fn get_project_name(path: &str) -> String {
    let parts: Vec<&str> = path.split('/').filter(|p| !p.is_empty()).collect();
    if parts.len() >= 2 {
        format!("{}/{}", parts[parts.len() - 2], parts[parts.len() - 1])
    } else if !parts.is_empty() {
        parts.last().unwrap_or(&"").to_string()
    } else {
        path.to_string()
    }
}

fn parse_server_config(name: String, config: McpServerConfig) -> McpServer {
    McpServer {
        name,
        server_type: config.config_type,
        url: config.url,
        headers: config.headers,
        command: config.command,
        args: config.args,
        env: config.env,
        from_mcp_json: None,
        disabled: None,
    }
}

fn format_plugin_name(id: &str) -> String {
    id.split('-')
        .map(|word| {
            let mut c = word.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

async fn read_claude_config() -> Result<ClaudeConfig, String> {
    let home_dir = get_home_dir()?;
    let config_path = home_dir.join(".claude.json");

    if !config_path.exists() {
        return Ok(ClaudeConfig { projects: None });
    }

    let content = tokio_fs::read_to_string(config_path).await.map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

async fn write_claude_config(config: &Value) -> Result<(), String> {
    let home_dir = get_home_dir()?;
    let config_path = home_dir.join(".claude.json");

    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    tokio_fs::write(config_path, content).await.map_err(|e| e.to_string())
}

async fn read_project_mcp_json(project_path: &str) -> Option<HashMap<String, McpServerConfig>> {
    let path = Path::new(project_path).join(".mcp.json");
    if !path.exists() {
        return None;
    }

    let content = tokio_fs::read_to_string(path).await.ok()?;
    let val: Value = serde_json::from_str(&content).ok()?;
    
    // .mcp.json has structure: { "mcpServers": { ... } }
    if let Some(servers) = val.get("mcpServers") {
        serde_json::from_value(servers.clone()).ok()
    } else {
        // Fallback for flat structure
        serde_json::from_value(val).ok()
    }
}

async fn read_plugin_config(plugin_id: &str) -> Option<HashMap<String, McpServerConfig>> {
    let home_dir = get_home_dir().ok()?;
    let config_path = home_dir
        .join(".claude")
        .join("plugins")
        .join("marketplaces")
        .join("claude-plugins-official")
        .join("external_plugins")
        .join(plugin_id)
        .join(".mcp.json");

    if !config_path.exists() {
        return None;
    }

    let content = tokio_fs::read_to_string(config_path).await.ok()?;
    serde_json::from_str(&content).ok()
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all MCP configuration and plugin data
#[tauri::command]
pub async fn get_mcp_data() -> Result<McpDashboardData, String> {
    let config = read_claude_config().await?;
    let home_dir = get_home_dir()?;
    let home_dir_str = home_dir.to_string_lossy().to_string();

    let mut server_usage: HashMap<String, Vec<String>> = HashMap::new();
    let mut all_projects: Vec<ProjectRef> = Vec::new();
    let mut projects: Vec<ProjectMcpConfig> = Vec::new();
    let mut global_servers: Vec<McpServer> = Vec::new();

    if let Some(projects_config) = config.projects {
        for (project_path, project_entry) in projects_config {
            // Global servers
            if project_path == home_dir_str {
                for (name, srv_config) in project_entry.mcp_servers {
                    global_servers.push(parse_server_config(name, srv_config));
                }
                continue;
            }

            all_projects.push(ProjectRef {
                path: project_path.clone(),
                name: get_project_name(&project_path),
            });

            let mut servers: Vec<McpServer> = Vec::new();
            let disabled_servers = project_entry.disabled_mcpjson_servers.clone();

            // Servers from ~/.claude.json
            for (name, srv_config) in project_entry.mcp_servers {
                servers.push(parse_server_config(name.clone(), srv_config));
                server_usage.entry(name).or_insert_with(Vec::new).push(project_path.clone());
            }

            // Servers from project's .mcp.json
            if let Some(mcp_json_servers) = read_project_mcp_json(&project_path).await {
                for (name, srv_config) in mcp_json_servers {
                    if !servers.iter().any(|s| s.name == name) {
                        let mut server = parse_server_config(name.clone(), srv_config);
                        server.from_mcp_json = Some(true);
                        server.disabled = Some(disabled_servers.contains(&name));
                        servers.push(server);
                        server_usage.entry(name).or_insert_with(Vec::new).push(project_path.clone());
                    }
                }
            }

            if !servers.is_empty() {
                projects.push(ProjectMcpConfig {
                    project_path: project_path.clone(),
                    project_name: get_project_name(&project_path),
                    servers,
                    context_uris: project_entry.mcp_context_uris,
                    enabled_servers: project_entry.enabled_mcpjson_servers,
                    disabled_servers,
                });
            }
        }
    }

    all_projects.sort_by(|a, b| a.name.cmp(&b.name));

    // Plugins
    let mut plugins: Vec<McpPlugin> = Vec::new();
    let plugins_dir = home_dir
        .join(".claude")
        .join("plugins")
        .join("marketplaces")
        .join("claude-plugins-official")
        .join("external_plugins");

    if plugins_dir.exists() {
        if let Ok(entries) = fs::read_dir(plugins_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    let plugin_id = entry.file_name().to_string_lossy().to_string();
                    if let Some(srv_config) = read_plugin_config(&plugin_id).await {
                        let active_projects = server_usage.get(&plugin_id).cloned().unwrap_or_default();
                        plugins.push(McpPlugin {
                            id: plugin_id.clone(),
                            name: format_plugin_name(&plugin_id),
                            description: None, // Could read from a plugin.json if it exists
                            server_config: srv_config,
                            is_installed: !active_projects.is_empty(),
                            active_in_projects: active_projects.iter().map(|p| get_project_name(p)).collect(),
                        });
                    }
                }
            }
        }
    }

    // Stats
    let stats = McpStats {
        total_servers: server_usage.len() + global_servers.len(),
        projects_with_mcp: projects.len(),
        available_plugins: plugins.len(),
        installed_plugins: plugins.iter().filter(|p| p.is_installed).count(),
        top_servers: {
            let mut tops: Vec<TopServer> = server_usage
                .into_iter()
                .map(|(name, projects)| TopServer {
                    name,
                    project_count: projects.len(),
                })
                .collect();
            tops.sort_by(|a, b| b.project_count.cmp(&a.project_count));
            tops.into_iter().take(5).collect()
        },
    };

    Ok(McpDashboardData {
        projects,
        all_projects,
        plugins,
        global_servers,
        stats,
    })
}

/// Check if an MCP server is reachable
#[tauri::command]
pub async fn check_server_status(url: String) -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    match client.head(&url).send().await {
        Ok(_) => Ok(json!({ "online": true })),
        Err(e) => Ok(json!({ "online": false, "error": e.to_string() })),
    }
}

/// Toggle an MCP server enabled/disabled for a project
#[tauri::command]
pub async fn toggle_mcp_server(
    project_path: String,
    server_name: String,
    enabled: bool,
) -> Result<Value, String> {
    let home_dir = get_home_dir()?;
    let config_path = home_dir.join(".claude.json");
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let mut config: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(projects) = config.get_mut("projects").and_then(|p| p.as_object_mut()) {
        if let Some(project) = projects.get_mut(&project_path).and_then(|p| p.as_object_mut()) {
            let disabled_list = project
                .entry("disabledMcpjsonServers")
                .or_insert_with(|| json!([]))
                .as_array_mut()
                .ok_or("disabledMcpjsonServers is not an array")?;

            if enabled {
                disabled_list.retain(|s| s.as_str() != Some(&server_name));
            } else {
                if !disabled_list.iter().any(|s| s.as_str() == Some(&server_name)) {
                    disabled_list.push(json!(server_name));
                }
            }
            write_claude_config(&config).await?;
            return Ok(json!({ "success": true }));
        }
    }

    Err("Project not found in config".to_string())
}

/// Add an MCP server to a project
#[tauri::command]
pub async fn add_mcp_server(
    project_path: String,
    server_name: String,
    config: McpServerConfig,
) -> Result<Value, String> {
    let home_dir = get_home_dir()?;
    let config_path = home_dir.join(".claude.json");
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let mut claude_config: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(projects) = claude_config.get_mut("projects").and_then(|p| p.as_object_mut()) {
        let project = projects
            .entry(&project_path)
            .or_insert_with(|| json!({}))
            .as_object_mut()
            .ok_or("Project entry is not an object")?;

        let mcp_servers = project
            .entry("mcpServers")
            .or_insert_with(|| json!({}))
            .as_object_mut()
            .ok_or("mcpServers is not an object")?;

        if mcp_servers.contains_key(&server_name) {
            return Err(format!("Server \"{}\" already exists", server_name));
        }

        mcp_servers.insert(server_name, serde_json::to_value(config).map_err(|e| e.to_string())?);
        write_claude_config(&claude_config).await?;
        Ok(json!({ "success": true }))
    } else {
        Err("Projects field not found".to_string())
    }
}

/// Copy an MCP server config from one project to another
#[tauri::command]
pub async fn copy_mcp_to_project(
    source_project: String,
    server_name: String,
    dest_project: String,
) -> Result<Value, String> {
    let home_dir = get_home_dir()?;
    let config_path = home_dir.join(".claude.json");
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let mut claude_config: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let projects = claude_config
        .get_mut("projects")
        .and_then(|p| p.as_object_mut())
        .ok_or("Projects not found")?;

    let source = projects
        .get(&source_project)
        .and_then(|p| p.get("mcpServers"))
        .and_then(|s| s.get(&server_name))
        .cloned()
        .ok_or_else(|| format!("Server \"{}\" not found in source project", server_name))?;

    let dest = projects
        .entry(&dest_project)
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or("Destination project is not an object")?;

    let dest_mcp = dest
        .entry("mcpServers")
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or("mcpServers is not an object")?;

    if dest_mcp.contains_key(&server_name) {
        return Err(format!("Server \"{}\" already exists in destination", server_name));
    }

    dest_mcp.insert(server_name, source);
    write_claude_config(&claude_config).await?;
    Ok(json!({ "success": true }))
}

/// Get all projects from ~/.claude.json
#[tauri::command]
pub async fn get_all_projects() -> Result<Vec<ProjectRef>, String> {
    let config = read_claude_config().await?;
    let home_dir = get_home_dir()?;
    let home_dir_str = home_dir.to_string_lossy().to_string();

    let mut projects = Vec::new();
    if let Some(projects_config) = config.projects {
        for (path, _) in projects_config {
            if path == home_dir_str {
                continue;
            }
            projects.push(ProjectRef {
                name: get_project_name(&path),
                path,
            });
        }
    }
    projects.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(projects)
}
