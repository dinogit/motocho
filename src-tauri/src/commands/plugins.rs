/**
 * Plugins service commands
 *
 * Manages Claude Code plugins, including:
 * - Installed plugins from ~/.claude/plugins/installed_plugins.json
 * - Available plugins from marketplace repositories
 * - Plugin details (README, agents, commands, skills)
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use super::agents::{Agent, parse_agent_file};

// ============================================================================
// Type Definitions
// ============================================================================

/// Installed plugin entry from installed_plugins.json
#[derive(Debug, Clone, Serialize, Deserialize)]
struct InstalledPluginEntry {
    scope: String,
    #[serde(rename = "installPath")]
    install_path: String,
    version: String,
    #[serde(rename = "installedAt")]
    installed_at: String,
    #[serde(rename = "lastUpdated")]
    last_updated: String,
    #[serde(rename = "gitCommitSha")]
    git_commit_sha: Option<String>,
}

/// installed_plugins.json structure
#[derive(Debug, Clone, Serialize, Deserialize)]
struct InstalledPluginsFile {
    version: u32,
    plugins: HashMap<String, Vec<InstalledPluginEntry>>,
}

/// Marketplace source info from known_marketplaces.json
#[derive(Debug, Clone, Serialize, Deserialize)]
struct MarketplaceSource {
    source: String,
    repo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MarketplaceEntry {
    source: MarketplaceSource,
    #[serde(rename = "installLocation")]
    install_location: String,
    #[serde(rename = "lastUpdated")]
    last_updated: String,
}

/// Simple command info for plugins (not full Command struct)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginCommand {
    pub name: String,
    pub description: String,
    pub content: String,
    pub path: String,
}

/// Plugin summary for list view
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSummary {
    pub id: String,
    pub name: String,
    pub description: String,
    pub marketplace: String,
    #[serde(rename = "isInstalled")]
    pub is_installed: bool,
    #[serde(rename = "installedVersion")]
    pub installed_version: Option<String>,
    #[serde(rename = "agentCount")]
    pub agent_count: u32,
    #[serde(rename = "commandCount")]
    pub command_count: u32,
    #[serde(rename = "skillCount")]
    pub skill_count: u32,
    #[serde(rename = "readmePreview")]
    pub readme_preview: String,
}

/// Full plugin details for detail view
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDetails {
    pub summary: PluginSummary,
    pub readme: String,
    pub agents: Vec<Agent>,
    pub commands: Vec<PluginCommand>,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "installedAt")]
    pub installed_at: Option<String>,
    #[serde(rename = "lastUpdated")]
    pub last_updated: Option<String>,
}

/// Dashboard data for plugins list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginsDashboardData {
    #[serde(rename = "installedPlugins")]
    pub installed_plugins: Vec<PluginSummary>,
    #[serde(rename = "availablePlugins")]
    pub available_plugins: Vec<PluginSummary>,
    #[serde(rename = "totalInstalled")]
    pub total_installed: usize,
    #[serde(rename = "totalAvailable")]
    pub total_available: usize,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Extract first paragraph from README as description
fn extract_readme_preview(readme: &str) -> String {
    let lines: Vec<&str> = readme.lines().collect();
    let mut preview = String::new();
    let mut found_content = false;

    for line in lines {
        let trimmed = line.trim();
        
        // Skip title and empty lines at start
        if !found_content {
            if trimmed.starts_with('#') || trimmed.is_empty() {
                continue;
            }
            found_content = true;
        }

        // Stop at next section or empty line after content
        if found_content && (trimmed.starts_with('#') || (trimmed.is_empty() && !preview.is_empty())) {
            break;
        }

        if !trimmed.is_empty() {
            if !preview.is_empty() {
                preview.push(' ');
            }
            preview.push_str(trimmed);
        }
    }

    // Truncate if too long
    if preview.len() > 200 {
        preview.truncate(200);
        preview.push_str("...");
    }

    preview
}

/// Parse command markdown file
fn parse_command_file(content: &str, path: &str) -> PluginCommand {
    let mut name = String::new();
    let mut description = String::new();
    let body = content.to_string();

    // Try to parse frontmatter
    if content.starts_with("---") {
        if let Some(end_pos) = content[3..].find("---") {
            let frontmatter = &content[3..end_pos + 3];
            
            for line in frontmatter.lines() {
                if let Some(colon_pos) = line.find(':') {
                    let key = line[..colon_pos].trim();
                    let value = line[colon_pos + 1..].trim();

                    match key {
                        "name" => name = value.to_string(),
                        "description" => description = value.to_string(),
                        _ => {}
                    }
                }
            }
        }
    }

    // Fallback: use filename
    if name.is_empty() {
        name = Path::new(path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();
    }

    // Fallback: use first line of content as description
    if description.is_empty() {
        description = content
            .lines()
            .find(|l| !l.trim().is_empty() && !l.starts_with("---") && !l.starts_with('#'))
            .unwrap_or("")
            .trim()
            .to_string();
    }

    PluginCommand {
        name,
        description,
        content: body,
        path: path.to_string(),
    }
}

/// Count items in a plugin subdirectory (agents, commands, skills)
fn count_plugin_items(plugin_dir: &Path, subdir: &str, extension: &str) -> u32 {
    let target_dir = plugin_dir.join(subdir);
    if !target_dir.exists() {
        return 0;
    }

    fs::read_dir(&target_dir)
        .map(|entries| {
            entries
                .flatten()
                .filter(|e| {
                    e.path()
                        .extension()
                        .and_then(|s| s.to_str())
                        == Some(extension)
                })
                .count() as u32
        })
        .unwrap_or(0)
}

/// Read installed plugins from installed_plugins.json
fn get_installed_plugins_map() -> HashMap<String, InstalledPluginEntry> {
    let home_dir = match dirs::home_dir() {
        Some(dir) => dir,
        None => return HashMap::new(),
    };

    let installed_path = home_dir
        .join(".claude")
        .join("plugins")
        .join("installed_plugins.json");

    if !installed_path.exists() {
        return HashMap::new();
    }

    let content = match fs::read_to_string(&installed_path) {
        Ok(c) => c,
        Err(_) => return HashMap::new(),
    };

    let file: InstalledPluginsFile = match serde_json::from_str(&content) {
        Ok(f) => f,
        Err(_) => return HashMap::new(),
    };

    let mut installed_map = HashMap::new();
    for (plugin_id, entries) in file.plugins {
        // Take the first (and usually only) entry
        if let Some(entry) = entries.into_iter().next() {
            installed_map.insert(plugin_id, entry);
        }
    }

    installed_map
}

/// Get marketplace locations from known_marketplaces.json
fn get_marketplace_locations() -> Vec<(String, String)> {
    let home_dir = match dirs::home_dir() {
        Some(dir) => dir,
        None => return Vec::new(),
    };

    let marketplaces_path = home_dir
        .join(".claude")
        .join("plugins")
        .join("known_marketplaces.json");

    if !marketplaces_path.exists() {
        return Vec::new();
    }

    let content = match fs::read_to_string(&marketplaces_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let marketplaces: HashMap<String, MarketplaceEntry> = match serde_json::from_str(&content) {
        Ok(m) => m,
        Err(_) => return Vec::new(),
    };

    marketplaces
        .into_iter()
        .map(|(name, entry)| (name, entry.install_location))
        .collect()
}

/// Convert plugin directory name to display name
fn plugin_name_to_display(name: &str) -> String {
    name.split('-')
        .map(|word| {
            let mut chars: Vec<char> = word.chars().collect();
            if !chars.is_empty() {
                chars[0] = chars[0].to_uppercase().next().unwrap_or(chars[0]);
            }
            chars.into_iter().collect::<String>()
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Build plugin summary from a plugin directory
fn build_plugin_summary(
    plugin_dir: &Path,
    marketplace_name: &str,
    installed_map: &HashMap<String, InstalledPluginEntry>,
) -> Option<PluginSummary> {
    let plugin_name = plugin_dir.file_name()?.to_str()?;
    let plugin_id = format!("{}@{}", plugin_name, marketplace_name);

    // Read README for description
    let readme_path = plugin_dir.join("README.md");
    let readme = fs::read_to_string(&readme_path).unwrap_or_default();
    let readme_preview = extract_readme_preview(&readme);

    // Count agents, commands, skills
    let agent_count = count_plugin_items(plugin_dir, "agents", "md");
    let command_count = count_plugin_items(plugin_dir, "commands", "md");
    let skill_count = count_plugin_items(plugin_dir, "skills", "md");

    // Check installation status
    let installed_entry = installed_map.get(&plugin_id);
    let is_installed = installed_entry.is_some();
    let installed_version = installed_entry.map(|e| e.version.clone());

    Some(PluginSummary {
        id: plugin_id,
        name: plugin_name_to_display(plugin_name),
        description: readme_preview,
        marketplace: marketplace_name.to_string(),
        is_installed,
        installed_version,
        agent_count,
        command_count,
        skill_count,
        readme_preview: readme.chars().take(300).collect(),
    })
}

/// Scan a plugin directory and collect all plugins
fn scan_plugins_directory(
    base_dir: &Path,
    marketplace_name: &str,
    installed_map: &HashMap<String, InstalledPluginEntry>,
) -> Vec<PluginSummary> {
    let mut plugins = Vec::new();

    // Scan both plugins/ and external_plugins/ directories
    for subdir in &["plugins", "external_plugins"] {
        let plugins_dir = base_dir.join(subdir);
        if !plugins_dir.exists() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(&plugins_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                // Skip hidden directories
                if path.file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.starts_with('.'))
                    .unwrap_or(true)
                {
                    continue;
                }

                if let Some(summary) = build_plugin_summary(&path, marketplace_name, installed_map) {
                    plugins.push(summary);
                }
            }
        }
    }

    plugins
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub async fn get_plugins_data() -> Result<PluginsDashboardData, String> {
    let installed_map = get_installed_plugins_map();
    let marketplace_locations = get_marketplace_locations();

    let mut all_plugins = Vec::new();

    // Scan each marketplace
    for (marketplace_name, install_location) in marketplace_locations {
        let marketplace_path = Path::new(&install_location);
        if !marketplace_path.exists() {
            continue;
        }

        let plugins = scan_plugins_directory(marketplace_path, &marketplace_name, &installed_map);
        all_plugins.extend(plugins);
    }

    // Sort plugins: installed first, then alphabetically
    all_plugins.sort_by(|a, b| {
        match (a.is_installed, b.is_installed) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });

    // Split into installed and available
    let installed_plugins: Vec<PluginSummary> = all_plugins
        .iter()
        .filter(|p| p.is_installed)
        .cloned()
        .collect();
    
    let available_plugins: Vec<PluginSummary> = all_plugins
        .iter()
        .filter(|p| !p.is_installed)
        .cloned()
        .collect();

    Ok(PluginsDashboardData {
        total_installed: installed_plugins.len(),
        total_available: available_plugins.len(),
        installed_plugins,
        available_plugins,
    })
}

#[tauri::command]
pub async fn get_plugin_details(marketplace: String, plugin_name: String) -> Result<PluginDetails, String> {
    let installed_map = get_installed_plugins_map();
    let marketplace_locations = get_marketplace_locations();

    // Reconstruct plugin_id for lookup
    let plugin_id = format!("{}@{}", plugin_name, marketplace);

    // Find the marketplace location
    let marketplace_location = marketplace_locations
        .iter()
        .find(|(name, _)| name == &marketplace)
        .map(|(_, loc)| loc.clone())
        .ok_or_else(|| format!("Marketplace not found: {}", marketplace))?;


    // Find the plugin directory (check both plugins/ and external_plugins/)
    let marketplace_path = Path::new(&marketplace_location);
    let mut plugin_dir = None;

    for subdir in &["plugins", "external_plugins"] {
        let candidate = marketplace_path.join(subdir).join(&plugin_name);
        if candidate.exists() {
            plugin_dir = Some(candidate);
            break;
        }
    }

    let plugin_dir = plugin_dir.ok_or_else(|| format!("Plugin not found: {}", plugin_name))?;

    // Build summary
    let summary = build_plugin_summary(&plugin_dir, &marketplace, &installed_map)
        .ok_or_else(|| format!("Failed to build plugin summary: {}", plugin_name))?;

    // Read full README
    let readme_path = plugin_dir.join("README.md");
    let readme = fs::read_to_string(&readme_path).unwrap_or_default();

    // Parse agents
    let mut agents = Vec::new();
    let agents_dir = plugin_dir.join("agents");
    if agents_dir.exists() {
        if let Ok(entries) = fs::read_dir(&agents_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) != Some("md") {
                    continue;
                }
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Some(agent) = parse_agent_file(
                        &content,
                        path.to_str().unwrap_or(""),
                        "plugin",
                        Some(plugin_name.to_string()),
                    ) {
                        agents.push(agent);
                    }
                }
            }
        }
    }

    // Parse commands
    let mut commands = Vec::new();
    let commands_dir = plugin_dir.join("commands");
    if commands_dir.exists() {
        if let Ok(entries) = fs::read_dir(&commands_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) != Some("md") {
                    continue;
                }
                if let Ok(content) = fs::read_to_string(&path) {
                    commands.push(parse_command_file(&content, path.to_str().unwrap_or("")));
                }
            }
        }
    }

    // Get install info if installed
    let installed_entry = installed_map.get(&plugin_id);
    let install_path = installed_entry.map(|e| e.install_path.clone());
    let installed_at = installed_entry.map(|e| e.installed_at.clone());
    let last_updated = installed_entry.map(|e| e.last_updated.clone());

    Ok(PluginDetails {
        summary,
        readme,
        agents,
        commands,
        install_path,
        installed_at,
        last_updated,
    })
}
