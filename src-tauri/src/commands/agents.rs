/**
 * Agents service commands
 *
 * Manages Claude Code agents which are custom AI assistants.
 * Agents are stored in:
 * - ~/.claude/agents/{agent-name}.md - User agents
 * - ~/.claude/plugins/cache/{plugin}/{hash}/agents/{agent-name}.md - Plugin agents
 */

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

// ============================================================================
// Type Definitions - Match TypeScript interfaces
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub name: String,
    pub description: String,
    pub tools: Vec<String>,
    pub skills: Vec<String>,
    #[serde(rename = "mcpServers")]
    pub mcp_servers: Vec<String>,
    pub model: String,
    pub content: String,
    pub path: String,
    #[serde(rename = "agentType")]
    pub agent_type: String, // "user" | "plugin" | "builtin"
    #[serde(rename = "pluginName")]
    pub plugin_name: Option<String>, // Only for plugin agents
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentsDashboardData {
    #[serde(rename = "userAgents")]
    pub user_agents: Vec<Agent>,
    #[serde(rename = "pluginAgents")]
    pub plugin_agents: Vec<Agent>,
    #[serde(rename = "builtinAgents")]
    pub builtin_agents: Vec<Agent>,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Parse agent markdown frontmatter to extract metadata
/// Returns Agent struct or None if parsing fails
fn parse_agent_file(content: &str, path: &str, agent_type: &str, plugin_name: Option<String>) -> Option<Agent> {
    let mut name = String::new();
    let mut description = String::new();
    let mut tools: Vec<String> = Vec::new();
    let mut skills: Vec<String> = Vec::new();
    let mut mcp_servers: Vec<String> = Vec::new();
    let mut model = String::from("inherit");
    let mut body = content.to_string();

    if content.starts_with("---") {
        if let Some(end_pos) = content[3..].find("---") {
            let frontmatter = &content[3..end_pos + 3];
            body = content[end_pos + 6..].trim().to_string();

            for line in frontmatter.lines() {
                if let Some(colon_pos) = line.find(':') {
                    let key = line[..colon_pos].trim();
                    let value = line[colon_pos + 1..].trim();

                    match key {
                        "name" => name = value.to_string(),
                        "description" => description = value.to_string(),
                        "tools" => {
                            tools = value
                                .split(',')
                                .map(|s| s.trim().to_string())
                                .filter(|s| !s.is_empty())
                                .collect();
                        }
                        "skills" => {
                            skills = value
                                .split(',')
                                .map(|s| s.trim().to_string())
                                .filter(|s| !s.is_empty())
                                .collect();
                        }
                        "mcp_servers" => {
                            mcp_servers = value
                                .split(',')
                                .map(|s| s.trim().to_string())
                                .filter(|s| !s.is_empty())
                                .collect();
                        }
                        "model" => model = value.to_string(),
                        _ => {}
                    }
                }
            }
        }
    }

    // If no name in frontmatter, use filename
    if name.is_empty() {
        name = Path::new(path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();
    }

    Some(Agent {
        name,
        description,
        tools,
        skills,
        mcp_servers,
        model,
        content: body,
        path: path.to_string(),
        agent_type: agent_type.to_string(),
        plugin_name,
    })
}

/// Get user agents from ~/.claude/agents/
fn get_user_agents() -> Vec<Agent> {
    let mut agents = Vec::new();

    let home_dir = match dirs::home_dir() {
        Some(dir) => dir,
        None => return agents,
    };

    let agents_dir = home_dir.join(".claude").join("agents");

    if !agents_dir.exists() {
        return agents;
    }

    if let Ok(entries) = fs::read_dir(&agents_dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            // Only process .md files
            if path.extension().and_then(|s| s.to_str()) != Some("md") {
                continue;
            }

            if let Ok(content) = fs::read_to_string(&path) {
                if let Some(agent) = parse_agent_file(
                    &content,
                    path.to_str().unwrap_or(""),
                    "user",
                    None,
                ) {
                    agents.push(agent);
                }
            }
        }
    }

    agents
}

/// Get plugin agents from ~/.claude/plugins/cache/
fn get_plugin_agents() -> Vec<Agent> {
    let mut agents = Vec::new();

    let home_dir = match dirs::home_dir() {
        Some(dir) => dir,
        None => return agents,
    };

    let plugins_cache_dir = home_dir.join(".claude").join("plugins").join("cache");

    if !plugins_cache_dir.exists() {
        return agents;
    }

    // Iterate through plugin directories
    if let Ok(plugin_entries) = fs::read_dir(&plugins_cache_dir) {
        for plugin_entry in plugin_entries.flatten() {
            let plugin_path = plugin_entry.path();

            if !plugin_path.is_dir() {
                continue;
            }

            let plugin_name = plugin_path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            // Iterate through hash directories
            if let Ok(hash_entries) = fs::read_dir(&plugin_path) {
                for hash_entry in hash_entries.flatten() {
                    let hash_path = hash_entry.path();
                    let agents_dir = hash_path.join("agents");

                    if !agents_dir.exists() {
                        continue;
                    }

                    // Read agent files
                    if let Ok(agent_entries) = fs::read_dir(&agents_dir) {
                        for agent_entry in agent_entries.flatten() {
                            let agent_file_path = agent_entry.path();

                            // Only process .md files
                            if agent_file_path.extension().and_then(|s| s.to_str()) != Some("md") {
                                continue;
                            }

                            if let Ok(content) = fs::read_to_string(&agent_file_path) {
                                if let Some(agent) = parse_agent_file(
                                    &content,
                                    agent_file_path.to_str().unwrap_or(""),
                                    "plugin",
                                    Some(plugin_name.clone()),
                                ) {
                                    agents.push(agent);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    agents
}

/// Get built-in agents (hardcoded list)
fn get_builtin_agents() -> Vec<Agent> {
    vec![
        Agent {
            name: "Bash".to_string(),
            description: "Command execution specialist for running bash commands".to_string(),
            tools: vec!["Bash".to_string()],
            skills: vec![],
            mcp_servers: vec![],
            model: "inherit".to_string(),
            content: String::new(),
            path: String::new(),
            agent_type: "builtin".to_string(),
            plugin_name: None,
        },
        Agent {
            name: "general-purpose".to_string(),
            description: "General-purpose agent for researching complex questions and executing multi-step tasks".to_string(),
            tools: vec!["*".to_string()],
            skills: vec![],
            mcp_servers: vec![],
            model: "sonnet".to_string(),
            content: String::new(),
            path: String::new(),
            agent_type: "builtin".to_string(),
            plugin_name: None,
        },
        Agent {
            name: "statusline-setup".to_string(),
            description: "Configure the user's Claude Code status line setting".to_string(),
            tools: vec!["Read".to_string(), "Edit".to_string()],
            skills: vec![],
            mcp_servers: vec![],
            model: "sonnet".to_string(),
            content: String::new(),
            path: String::new(),
            agent_type: "builtin".to_string(),
            plugin_name: None,
        },
        Agent {
            name: "Explore".to_string(),
            description: "Fast agent specialized for exploring codebases".to_string(),
            tools: vec![],
            skills: vec![],
            mcp_servers: vec![],
            model: "haiku".to_string(),
            content: String::new(),
            path: String::new(),
            agent_type: "builtin".to_string(),
            plugin_name: None,
        },
        Agent {
            name: "Plan".to_string(),
            description: "Software architect agent for designing implementation plans".to_string(),
            tools: vec![],
            skills: vec![],
            mcp_servers: vec![],
            model: "inherit".to_string(),
            content: String::new(),
            path: String::new(),
            agent_type: "builtin".to_string(),
            plugin_name: None,
        },
        Agent {
            name: "claude-code-guide".to_string(),
            description: "Guide for Claude Code CLI features and capabilities".to_string(),
            tools: vec!["Glob".to_string(), "Grep".to_string(), "Read".to_string(), "WebFetch".to_string(), "WebSearch".to_string()],
            skills: vec![],
            mcp_servers: vec![],
            model: "haiku".to_string(),
            content: String::new(),
            path: String::new(),
            agent_type: "builtin".to_string(),
            plugin_name: None,
        },
    ]
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub async fn get_agents_data() -> Result<AgentsDashboardData, String> {
    let user_agents = get_user_agents();
    let plugin_agents = get_plugin_agents();
    let builtin_agents = get_builtin_agents();

    Ok(AgentsDashboardData {
        user_agents,
        plugin_agents,
        builtin_agents,
    })
}

#[tauri::command]
pub async fn get_agent_by_name(name: String) -> Result<Agent, String> {
    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
    let agent_path = home_dir.join(".claude").join("agents").join(format!("{}.md", name));

    if !agent_path.exists() {
        return Err(format!("Agent '{}' not found", name));
    }

    let content = fs::read_to_string(&agent_path)
        .map_err(|e| format!("Failed to read agent file: {}", e))?;

    parse_agent_file(
        &content,
        agent_path.to_str().unwrap_or(""),
        "user",
        None,
    )
    .ok_or_else(|| format!("Failed to parse agent '{}'", name))
}

#[tauri::command]
pub async fn update_agent(
    name: String,
    description: String,
    tools: Vec<String>,
    skills: Vec<String>,
    mcp_servers: Vec<String>,
    model: String,
    content: String,
) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
    let agent_path = home_dir.join(".claude").join("agents").join(format!("{}.md", name));

    // Build frontmatter
    let mut frontmatter = String::from("---\n");
    frontmatter.push_str(&format!("name: {}\n", name));
    frontmatter.push_str(&format!("description: {}\n", description));
    frontmatter.push_str(&format!("tools: {}\n", tools.join(", ")));
    frontmatter.push_str(&format!("skills: {}\n", skills.join(", ")));
    frontmatter.push_str(&format!("mcp_servers: {}\n", mcp_servers.join(", ")));
    frontmatter.push_str(&format!("model: {}\n", model));
    frontmatter.push_str("---\n\n");

    let full_content = format!("{}{}", frontmatter, content);

    fs::write(&agent_path, full_content)
        .map_err(|e| format!("Failed to write agent file: {}", e))?;

    Ok(())
}