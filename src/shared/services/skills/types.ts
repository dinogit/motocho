/**
 * Skills Types
 *
 * Skills are reusable instructions that extend Claude's capabilities.
 * They're stored in .claude/skills/ directories within projects.
 *
 * Configuration locations:
 * - {project}/.claude/skills/{skill-name}/SKILL.md - Project-specific skills
 * - {project}/CLAUDE.md - Project instructions (always loaded)
 */

// ============================================================================
// Skill Types
// ============================================================================

/**
 * A Claude Code skill parsed from SKILL.md
 */
export interface Skill {
  /** Skill name from frontmatter (lowercase, hyphens) */
  name: string
  /** Description from frontmatter (triggers auto-discovery) */
  description: string
  /** Full content of SKILL.md (including body after frontmatter) */
  content: string
  /** Path to the skill directory */
  path: string
}

// ============================================================================
// Project Configuration Types
// ============================================================================

/**
 * Per-project skills and CLAUDE.md configuration
 */
export interface ProjectSkillsConfig {
  /** Full project path */
  projectPath: string
  /** Short project name (last 2 path segments) */
  projectName: string
  /** CLAUDE.md content (null if not present) */
  claudeMd: string | null
  /** Skills found in .claude/skills/ */
  skills: Skill[]
}

// ============================================================================
// Dashboard Data Types
// ============================================================================

/**
 * Simple project reference for destination dropdown
 */
export interface ProjectRef {
  path: string
  name: string
}

/**
 * Complete skills data for the dashboard
 */
export interface SkillsDashboardData {
  /** Projects with skills or CLAUDE.md */
  projects: ProjectSkillsConfig[]
  /** ALL projects from ~/.claude.json (for copy destination) */
  allProjects: ProjectRef[]
  /** Aggregate statistics */
  stats: SkillsStats
}

/**
 * Skills usage statistics
 */
export interface SkillsStats {
  /** Total number of projects scanned */
  totalProjects: number
  /** Projects with a CLAUDE.md file */
  projectsWithClaudeMd: number
  /** Projects with at least one skill */
  projectsWithSkills: number
  /** Total skills across all projects */
  totalSkills: number
}
