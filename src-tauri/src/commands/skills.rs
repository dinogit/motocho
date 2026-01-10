/**
 * Skills service commands
 *
 * Manages Claude Code skills which are reusable instructions.
 * Skills are stored in:
 * - {project}/.claude/skills/{skill-name}/SKILL.md - Project-specific skills
 * - {project}/CLAUDE.md - Project instructions (always loaded)
 */

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use tokio::fs as tokio_fs;

// ============================================================================
// Type Definitions - Match TypeScript interfaces
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub content: String,
    pub path: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSkillsConfig {
    #[serde(rename = "projectPath")]
    pub project_path: String,
    #[serde(rename = "projectName")]
    pub project_name: String,
    #[serde(rename = "claudeMd")]
    pub claude_md: Option<String>,
    pub skills: Vec<Skill>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRef {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillsStats {
    #[serde(rename = "totalProjects")]
    pub total_projects: usize,
    #[serde(rename = "projectsWithClaudeMd")]
    pub projects_with_claude_md: usize,
    #[serde(rename = "projectsWithSkills")]
    pub projects_with_skills: usize,
    #[serde(rename = "totalSkills")]
    pub total_skills: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillsDashboardData {
    pub projects: Vec<ProjectSkillsConfig>,
    #[serde(rename = "allProjects")]
    pub all_projects: Vec<ProjectRef>,
    pub stats: SkillsStats,
}

// ============================================================================
// Helper Functions
// ============================================================================

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

/// Parse SKILL.md frontmatter to extract name and description
/// Returns (name, description, body)
fn parse_skill_frontmatter(content: &str) -> (String, String, String) {
    let mut name = String::new();
    let mut description = String::new();
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
                        _ => {}
                    }
                }
            }
        }
    }

    (name, description, body)
}

/// Get all projects from ~/.claude.json
async fn load_all_projects() -> Result<Vec<ProjectRef>, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let claude_json = home.join(".claude.json");

    if !claude_json.exists() {
        return Ok(Vec::new());
    }

    let content = tokio_fs::read_to_string(&claude_json)
        .await
        .map_err(|e| format!("Failed to read .claude.json: {}", e))?;

    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    let mut projects = Vec::new();
    let home_str = home.to_string_lossy().to_string();

    if let Some(projects_obj) = config.get("projects").and_then(|v| v.as_object()) {
        for (project_path, _) in projects_obj.iter() {
            // Skip home directory
            if project_path == &home_str {
                continue;
            }

            projects.push(ProjectRef {
                path: project_path.clone(),
                name: get_project_name(project_path),
            });
        }
    }

    projects.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(projects)
}

/// Read and parse CLAUDE.md if it exists
fn read_claude_md(project_path: &Path) -> Option<String> {
    let claude_md = project_path.join("CLAUDE.md");
    if claude_md.exists() {
        fs::read_to_string(&claude_md).ok()
    } else {
        None
    }
}

/// Get skills from a directory (either enabled or disabled)
fn read_skills_from_dir(dir_path: &Path, enabled: bool) -> Vec<Skill> {
    let mut skills = Vec::new();

    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_dir() {
                let skill_md = path.join("SKILL.md");

                if skill_md.exists() {
                    if let Ok(content) = fs::read_to_string(&skill_md) {
                        let (name, description, body) = parse_skill_frontmatter(&content);
                        
                        skills.push(Skill {
                            name: if name.is_empty() { 
                                entry.file_name().to_string_lossy().to_string() 
                            } else { 
                                name 
                            },
                            description,
                            content: body,
                            path: path.to_string_lossy().to_string(),
                            enabled,
                        });
                    }
                }
            }
        }
    }

    skills
}

/// Get all skills for a project
fn get_project_skills(project_path: &Path) -> Vec<Skill> {
    let skills_dir = project_path.join(".claude").join("skills");
    let disabled_skills_dir = project_path.join(".claude").join("skills-disabled");

    let mut skills = read_skills_from_dir(&skills_dir, true);
    let mut disabled_skills = read_skills_from_dir(&disabled_skills_dir, false);

    skills.append(&mut disabled_skills);
    
    // Sort alphabetically by name
    skills.sort_by(|a, b| a.name.cmp(&b.name));

    skills
}

async fn copy_dir_recursive(src: &Path, dest: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dest)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if path.is_dir() {
            Box::pin(copy_dir_recursive(&path, &dest_path)).await?;
        } else {
            fs::copy(&path, &dest_path)?;
        }
    }
    Ok(())
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get all skills data for the dashboard
#[tauri::command]
pub async fn get_skills_data() -> Result<SkillsDashboardData, String> {
    let all_projects = load_all_projects().await?;

    let mut projects = Vec::new();
    let mut total_projects = 0;
    let mut projects_with_claude_md = 0;
    let mut projects_with_skills = 0;
    let mut total_skills_count = 0;

    for project_ref in &all_projects {
        let project_path = Path::new(&project_ref.path);

        if !project_path.exists() {
            continue;
        }

        total_projects += 1;

        let claude_md = read_claude_md(project_path);
        if claude_md.is_some() {
            projects_with_claude_md += 1;
        }

        let skills = get_project_skills(project_path);

        if !skills.is_empty() || claude_md.is_some() {
            if !skills.is_empty() {
                projects_with_skills += 1;
                total_skills_count += skills.len();
            }

            projects.push(ProjectSkillsConfig {
                project_path: project_ref.path.clone(),
                project_name: project_ref.name.clone(),
                claude_md,
                skills,
            });
        }
    }

    Ok(SkillsDashboardData {
        projects,
        all_projects,
        stats: SkillsStats {
            total_projects,
            projects_with_claude_md,
            projects_with_skills,
            total_skills: total_skills_count,
        },
    })
}

/// Copy a skill to another project
#[tauri::command]
pub async fn copy_skill(
    source_path: String,
    destination_project: String,
) -> Result<serde_json::Value, String> {
    let src = Path::new(&source_path);
    let dest_base = Path::new(&destination_project);
    let dest_skills = dest_base.join(".claude").join("skills");

    // Get skill name from source path
    let skill_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid source path".to_string())?;

    let dest_dir = dest_skills.join(skill_name);

    if dest_dir.exists() {
        return Err(format!("Skill \"{}\" already exists in destination project", skill_name));
    }

    // Copy the entire skill directory recursively
    copy_dir_recursive(src, &dest_dir)
        .await
        .map_err(|e| format!("Failed to copy skill: {}", e))?;

    Ok(json!({ "success": true }))
}

/// Delete a skill directory
#[tauri::command]
pub async fn delete_skill_file(skill_path: String) -> Result<serde_json::Value, String> {
    let path = Path::new(&skill_path);

    if !path.exists() {
        return Err("Skill not found".to_string());
    }

    // Verify path looks like a skill directory (contains .claude/skills/ or .claude/skills-disabled/)
    let path_str = path.to_string_lossy();
    if !path_str.contains(".claude/skills/") && !path_str.contains(".claude/skills-disabled/") {
        return Err("Invalid skill path".to_string());
    }

    fs::remove_dir_all(path).map_err(|e| format!("Failed to delete skill: {}", e))?;

    Ok(json!({ "success": true }))
}

/// Toggle skill enabled/disabled by moving between skills/ and skills-disabled/
#[tauri::command]
pub async fn toggle_skill(skill_path: String, enabled: bool) -> Result<serde_json::Value, String> {
    let src_path = PathBuf::from(&skill_path);
    let skill_name = src_path.file_name().ok_or("Invalid skill path")?;
    let claude_dir = src_path.parent().and_then(|p| p.parent()).ok_or("Invalid path structure")?;

    let dest_dir_name = if enabled { "skills" } else { "skills-disabled" };
    let dest_path = claude_dir.join(dest_dir_name).join(skill_name);

    if !src_path.exists() {
        return Err(format!("Skill not found at {:?}", src_path));
    }

    if dest_path.exists() {
        return Err(format!("Skill already exists at destination {:?}", dest_path));
    }

    fs::create_dir_all(dest_path.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::rename(&src_path, &dest_path).map_err(|e| format!("Failed to move skill: {}", e))?;

    Ok(json!({ "success": true, "newPath": dest_path.to_string_lossy() }))
}

/// Get skills for a specific project
#[tauri::command]
pub async fn get_project_skills_cmd(project_path: String) -> Result<Vec<Skill>, String> {
    let path = Path::new(&project_path);

    if !path.exists() {
        return Err(format!("Project not found: {}", project_path));
    }

    let skills = get_project_skills(path);

    Ok(skills)
}

/// Bulk copy skills and CLAUDE.md to a destination project
#[tauri::command]
pub async fn bulk_copy(
    items: Vec<serde_json::Value>,
    destination: String,
) -> Result<serde_json::Value, String> {
    let dest_project_path = Path::new(&destination);
    let mut copied_count = 0;
    let mut failed_items = Vec::new();

    for item in items {
        let item_type = item.get("type").and_then(|v| v.as_str()).unwrap_or("unknown");
        let source_path_str = item.get("source").and_then(|v| v.as_str()).unwrap_or_default();
        let source_project_str = item.get("sourceProject").and_then(|v| v.as_str()).unwrap_or_default();

        match item_type {
            "skill" => {
                if let Err(e) = copy_skill(source_path_str.to_string(), destination.clone()).await {
                    failed_items.push(format!("Skill {}: {}", source_path_str, e));
                } else {
                    copied_count += 1;
                }
            }
            "claude_md" | "claude-md" => {
                let src_file = Path::new(source_project_str).join("CLAUDE.md");
                let dest_file = dest_project_path.join("CLAUDE.md");

                if dest_file.exists() {
                    failed_items.push("CLAUDE.md already exists in destination".to_string());
                    continue;
                }

                if src_file.exists() {
                    if let Err(e) = fs::copy(&src_file, &dest_file) {
                        failed_items.push(format!("CLAUDE.md: {}", e));
                    } else {
                        copied_count += 1;
                    }
                } else {
                    failed_items.push("CLAUDE.md: Source file not found".to_string());
                }
            }
            _ => {
                failed_items.push(format!("Unknown item type: {}", item_type));
            }
        }
    }

    Ok(json!({
        "success": failed_items.is_empty(),
        "copiedCount": copied_count,
        "failedItems": failed_items,
    }))
}
