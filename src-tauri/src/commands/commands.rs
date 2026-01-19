use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandParameter {
    pub name: String,
    pub r#type: String,
    pub required: bool,
    pub description: String,
    pub example: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandExample {
    pub title: String,
    pub description: String,
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_output: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandUseCase {
    pub title: String,
    pub description: String,
    pub when: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Command {
    pub id: String,
    pub name: String,
    #[serde(rename = "shortName")]
    pub short_name: String,
    pub category: String,
    pub description: String,
    #[serde(rename = "fullDescription")]
    pub full_description: String,
    pub icon: String,
    pub color: String,
    pub usage: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<Vec<CommandParameter>>,
    pub examples: Vec<CommandExample>,
    #[serde(rename = "useCases")]
    pub use_cases: Vec<CommandUseCase>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requirements: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "relatedCommands")]
    pub related_commands: Option<Vec<String>>,
    pub installed: bool,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandCategory {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub color: String,
    #[serde(rename = "commandIds")]
    pub command_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandsDashboardData {
    pub commands: Vec<Command>,
    pub categories: Vec<CommandCategory>,
    pub total_commands: usize,
    pub installed_count: usize,
    pub last_updated: String,
}

fn build_commands_data() -> CommandsDashboardData {
    let commands = vec![
        // Git Commands
        Command {
            id: "commit".to_string(),
            name: "/commit".to_string(),
            short_name: "commit".to_string(),
            category: "git".to_string(),
            description: "Create a git commit".to_string(),
            full_description: "Creates a git commit with an automatically generated message based on staged and unstaged changes. Analyzes current git status, reviews changes, examines recent commit messages to match your repository's style, and stages relevant files.".to_string(),
            icon: "GitBranch".to_string(),
            color: "sky".to_string(),
            usage: "/commit".to_string(),
            parameters: None,
            examples: vec![
                CommandExample {
                    title: "Basic commit".to_string(),
                    description: "Make some changes and create a commit".to_string(),
                    command: "/commit".to_string(),
                    expected_output: Some("✓ Commit created: feat: Add new authentication flow (a1b2c3d)".to_string()),
                },
            ],
            use_cases: vec![
                CommandUseCase {
                    title: "Daily development".to_string(),
                    description: "Commit changes after completing features or bug fixes".to_string(),
                    when: "When you have meaningful changes ready to commit".to_string(),
                },
                CommandUseCase {
                    title: "Refactoring".to_string(),
                    description: "Commit refactoring work with clear messages".to_string(),
                    when: "After refactoring code that improves quality".to_string(),
                },
            ],
            requirements: Some(vec!["Git installed and configured".to_string()]),
            related_commands: Some(vec!["commit-push-pr".to_string()]),
            installed: true,
            available: true,
        },
        Command {
            id: "commit-push-pr".to_string(),
            name: "/commit-push-pr".to_string(),
            short_name: "commit-push-pr".to_string(),
            category: "git".to_string(),
            description: "Commit, push, and open a PR".to_string(),
            full_description: "Complete workflow command that commits changes, pushes to remote, and creates a pull request in one step. Creates a new branch if needed, stages files, generates commit message, pushes to origin, and creates PR with comprehensive description.".to_string(),
            icon: "GitPullRequest".to_string(),
            color: "amber".to_string(),
            usage: "/commit-push-pr".to_string(),
            parameters: None,
            examples: vec![
                CommandExample {
                    title: "Feature branch to PR".to_string(),
                    description: "Complete workflow from code to pull request".to_string(),
                    command: "/commit-push-pr".to_string(),
                    expected_output: Some("✓ PR created: https://github.com/org/repo/pull/456".to_string()),
                },
            ],
            use_cases: vec![
                CommandUseCase {
                    title: "Feature completion".to_string(),
                    description: "Submit complete features for review".to_string(),
                    when: "When your feature is complete and tested".to_string(),
                },
                CommandUseCase {
                    title: "Bug fixes".to_string(),
                    description: "Quick bug fix submission".to_string(),
                    when: "After fixing bugs with comprehensive testing".to_string(),
                },
            ],
            requirements: Some(vec![
                "Git installed".to_string(),
                "GitHub CLI (gh) installed and authenticated".to_string(),
            ]),
            related_commands: Some(vec!["commit".to_string(), "clean_gone".to_string()]),
            installed: true,
            available: true,
        },
        Command {
            id: "clean_gone".to_string(),
            name: "/clean_gone".to_string(),
            short_name: "clean_gone".to_string(),
            category: "git".to_string(),
            description: "Cleans up branches marked as [gone]".to_string(),
            full_description: "Cleans up all local branches that have been deleted from the remote repository. Identifies branches marked as [gone], removes associated worktrees, deletes stale branches, and provides feedback on removed branches.".to_string(),
            icon: "Trash2".to_string(),
            color: "rose".to_string(),
            usage: "/clean_gone".to_string(),
            parameters: None,
            examples: vec![
                CommandExample {
                    title: "Regular cleanup".to_string(),
                    description: "Clean up after merging PRs".to_string(),
                    command: "/clean_gone".to_string(),
                    expected_output: Some("✓ Cleaned 3 branches: feature-auth, feature-db, bugfix-ui".to_string()),
                },
            ],
            use_cases: vec![
                CommandUseCase {
                    title: "Repository maintenance".to_string(),
                    description: "Keep local branch list clean".to_string(),
                    when: "After merging multiple PRs".to_string(),
                },
                CommandUseCase {
                    title: "Regular hygiene".to_string(),
                    description: "Weekly repository cleanup".to_string(),
                    when: "During regular maintenance cycles".to_string(),
                },
            ],
            requirements: Some(vec!["Git installed".to_string()]),
            related_commands: Some(vec!["commit-push-pr".to_string()]),
            installed: true,
            available: true,
        },
        // Development Commands
        Command {
            id: "feature-dev".to_string(),
            name: "/feature-dev".to_string(),
            short_name: "feature-dev".to_string(),
            category: "development".to_string(),
            description: "Guided feature development workflow".to_string(),
            full_description: "Launches a comprehensive 7-phase feature development workflow: Discovery (clarify requirements), Exploration (understand codebase), Questioning (ask clarifications), Design (architecture planning), Implementation (write code), Review (quality assurance), and Refinement (polish).".to_string(),
            icon: "Zap".to_string(),
            color: "emerald".to_string(),
            usage: "/feature-dev \"Your feature description\"".to_string(),
            parameters: Some(vec![
                CommandParameter {
                    name: "description".to_string(),
                    r#type: "string".to_string(),
                    required: false,
                    description: "Description of the feature to build".to_string(),
                    example: Some("Add user authentication with OAuth".to_string()),
                },
            ]),
            examples: vec![
                CommandExample {
                    title: "With description".to_string(),
                    description: "Start feature dev with feature description".to_string(),
                    command: "/feature-dev \"Add payment integration\"".to_string(),
                    expected_output: None,
                },
                CommandExample {
                    title: "Interactive".to_string(),
                    description: "Start feature dev without description".to_string(),
                    command: "/feature-dev".to_string(),
                    expected_output: None,
                },
            ],
            use_cases: vec![
                CommandUseCase {
                    title: "Complex features".to_string(),
                    description: "Plan and implement large features".to_string(),
                    when: "Building features affecting multiple systems".to_string(),
                },
                CommandUseCase {
                    title: "Architecture review".to_string(),
                    description: "Design features before implementation".to_string(),
                    when: "When architecture decisions are critical".to_string(),
                },
            ],
            requirements: None,
            related_commands: None,
            installed: true,
            available: true,
        },
        // Code Review Commands
        Command {
            id: "code-review".to_string(),
            name: "/code-review".to_string(),
            short_name: "code-review".to_string(),
            category: "review".to_string(),
            description: "Code review a pull request".to_string(),
            full_description: "Performs automated code review on a pull request using multiple specialized agents. Analyzes code quality, tests, error handling, type design, comments, and provides comprehensive feedback.".to_string(),
            icon: "CheckCircle2".to_string(),
            color: "violet".to_string(),
            usage: "/code-review".to_string(),
            parameters: None,
            examples: vec![
                CommandExample {
                    title: "Current PR review".to_string(),
                    description: "Review the current pull request".to_string(),
                    command: "/code-review".to_string(),
                    expected_output: None,
                },
            ],
            use_cases: vec![
                CommandUseCase {
                    title: "Pre-merge checks".to_string(),
                    description: "Ensure quality before merging".to_string(),
                    when: "Before marking PR as ready".to_string(),
                },
                CommandUseCase {
                    title: "Quality gates".to_string(),
                    description: "Automated quality validation".to_string(),
                    when: "As part of CI/CD pipeline".to_string(),
                },
            ],
            requirements: None,
            related_commands: None,
            installed: true,
            available: true,
        },
        // Design Commands
        Command {
            id: "frontend-design".to_string(),
            name: "frontend-design".to_string(),
            short_name: "frontend-design".to_string(),
            category: "design".to_string(),
            description: "Create production-grade frontends".to_string(),
            full_description: "Creates distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code that avoids generic aesthetics. Focuses on typography, color, motion, spatial composition, and visual details.".to_string(),
            icon: "Palette".to_string(),
            color: "cyan".to_string(),
            usage: "frontend-design on <component-name>".to_string(),
            parameters: Some(vec![
                CommandParameter {
                    name: "component".to_string(),
                    r#type: "string".to_string(),
                    required: true,
                    description: "Component or file path to design".to_string(),
                    example: Some("SessionCard".to_string()),
                },
            ]),
            examples: vec![
                CommandExample {
                    title: "Redesign component".to_string(),
                    description: "Apply modern design to existing component".to_string(),
                    command: "frontend-design on SessionCard".to_string(),
                    expected_output: None,
                },
            ],
            use_cases: vec![
                CommandUseCase {
                    title: "Component redesign".to_string(),
                    description: "Update components with premium design".to_string(),
                    when: "When refreshing UI components".to_string(),
                },
                CommandUseCase {
                    title: "New feature UI".to_string(),
                    description: "Build beautiful new interfaces".to_string(),
                    when: "Creating new pages or components".to_string(),
                },
            ],
            requirements: None,
            related_commands: None,
            installed: true,
            available: true,
        },
    ];

    let categories = vec![
        CommandCategory {
            id: "git".to_string(),
            name: "Git Workflow".to_string(),
            description: "Version control and branch management commands".to_string(),
            icon: "GitBranch".to_string(),
            color: "sky".to_string(),
            command_ids: vec!["commit".to_string(), "commit-push-pr".to_string(), "clean_gone".to_string()],
        },
        CommandCategory {
            id: "development".to_string(),
            name: "Development".to_string(),
            description: "Feature development and planning".to_string(),
            icon: "Zap".to_string(),
            color: "emerald".to_string(),
            command_ids: vec!["feature-dev".to_string()],
        },
        CommandCategory {
            id: "review".to_string(),
            name: "Code Review".to_string(),
            description: "Quality assurance and automated reviews".to_string(),
            icon: "CheckCircle2".to_string(),
            color: "violet".to_string(),
            command_ids: vec!["code-review".to_string()],
        },
        CommandCategory {
            id: "design".to_string(),
            name: "Design".to_string(),
            description: "Frontend design and UI creation".to_string(),
            icon: "Palette".to_string(),
            color: "cyan".to_string(),
            command_ids: vec!["frontend-design".to_string()],
        },
    ];

    CommandsDashboardData {
        total_commands: commands.len(),
        installed_count: commands.iter().filter(|c| c.installed).count(),
        last_updated: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string(),
        commands,
        categories,
    }
}

#[tauri::command]
pub async fn get_commands_data() -> Result<CommandsDashboardData, String> {
    Ok(build_commands_data())
}