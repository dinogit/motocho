/**
 * Semantic Extraction Layer
 *
 * Responsibility: Extract meaning, not code.
 *
 * Produces:
 * - Intents: What was the user trying to accomplish?
 * - Decisions: What choices were made?
 * - Constraints: What limitations exist?
 * - Features: What capabilities were built?
 *
 * Rules:
 * - Use lightweight heuristics + small AI calls if needed
 * - No markdown
 * - No prose
 * - Bullet-level facts only
 * - This data must be inspectable/debuggable
 */

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use super::evidence::{CodeEvidence, EvidenceSet, EvidenceType, FileEvidence, FileType};

// ============================================================================
// Semantic Types
// ============================================================================

/// A detected user intent from the session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intent {
    /// What the user wanted to accomplish
    pub description: String,
    /// Confidence level (high, medium, low)
    pub confidence: Confidence,
    /// Evidence supporting this intent
    pub evidence: Vec<String>,
}

/// A design decision detected in the code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Decision {
    /// What was decided
    pub description: String,
    /// Category of decision
    pub category: DecisionCategory,
    /// Evidence supporting this decision
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DecisionCategory {
    Architecture,
    Technology,
    Pattern,
    Naming,
    Configuration,
    Api,
}

/// A detected constraint or limitation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Constraint {
    /// What the constraint is
    pub description: String,
    /// Why it exists (if known)
    pub reason: Option<String>,
}

/// A feature or capability detected in the code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureFact {
    /// Feature name
    pub name: String,
    /// What this feature does
    pub description: String,
    /// Category
    pub category: FeatureCategory,
    /// Files implementing this feature
    pub files: Vec<String>,
    /// Public API evidence
    pub api_evidence: Vec<String>,
    /// Dependencies
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FeatureCategory {
    Authentication,
    DataManagement,
    UserInterface,
    Api,
    Configuration,
    StateManagement,
    Routing,
    Styling,
    Testing,
    Utilities,
    Documentation,
    Unknown,
}

impl FeatureCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            FeatureCategory::Authentication => "Authentication",
            FeatureCategory::DataManagement => "Data Management",
            FeatureCategory::UserInterface => "User Interface",
            FeatureCategory::Api => "API",
            FeatureCategory::Configuration => "Configuration",
            FeatureCategory::StateManagement => "State Management",
            FeatureCategory::Routing => "Routing",
            FeatureCategory::Styling => "Styling",
            FeatureCategory::Testing => "Testing",
            FeatureCategory::Utilities => "Utilities",
            FeatureCategory::Documentation => "Documentation",
            FeatureCategory::Unknown => "General",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Confidence {
    High,
    Medium,
    Low,
}

// ============================================================================
// Semantic Facts - The Output
// ============================================================================

/// Complete semantic extraction from sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticFacts {
    /// Detected user intents
    pub intents: Vec<Intent>,
    /// Design decisions
    pub decisions: Vec<Decision>,
    /// Constraints and limitations
    pub constraints: Vec<Constraint>,
    /// Features and capabilities
    pub features: Vec<FeatureFact>,
    /// Technology stack detected
    pub stack: TechnologyStack,
    /// Project metadata
    pub metadata: ProjectMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnologyStack {
    pub languages: Vec<String>,
    pub frameworks: Vec<String>,
    pub libraries: Vec<String>,
    pub tools: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub has_tests: bool,
    pub has_types: bool,
    pub has_config: bool,
    pub has_documentation: bool,
    pub entry_points: Vec<String>,
}

impl SemanticFacts {
    pub fn new() -> Self {
        Self {
            intents: Vec::new(),
            decisions: Vec::new(),
            constraints: Vec::new(),
            features: Vec::new(),
            stack: TechnologyStack {
                languages: Vec::new(),
                frameworks: Vec::new(),
                libraries: Vec::new(),
                tools: Vec::new(),
            },
            metadata: ProjectMetadata {
                has_tests: false,
                has_types: false,
                has_config: false,
                has_documentation: false,
                entry_points: Vec::new(),
            },
        }
    }

    /// Serialize to JSON for inspection
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

// ============================================================================
// Semantic Extractor
// ============================================================================

/// Extracts semantic facts from evidence
pub struct SemanticExtractor;

impl SemanticExtractor {
    /// Extract semantic facts from evidence set
    pub fn extract(evidence: &EvidenceSet) -> SemanticFacts {
        let mut facts = SemanticFacts::new();

        // Extract technology stack
        facts.stack = Self::extract_stack(evidence);

        // Extract project metadata
        facts.metadata = Self::extract_metadata(evidence);

        // Group files by feature category
        let feature_groups = Self::group_by_feature(evidence);

        // Build feature facts from groups
        for (category, files) in feature_groups {
            if let Some(feature) = Self::build_feature_fact(category, &files, evidence) {
                facts.features.push(feature);
            }
        }

        // Extract decisions from patterns
        facts.decisions = Self::extract_decisions(evidence);

        // Extract constraints from code patterns
        facts.constraints = Self::extract_constraints(evidence);

        // Infer intents from features and decisions
        facts.intents = Self::infer_intents(&facts.features, &facts.decisions);

        facts
    }

    /// Extract technology stack from imports and file types
    fn extract_stack(evidence: &EvidenceSet) -> TechnologyStack {
        let mut languages = HashSet::new();
        let mut frameworks = HashSet::new();
        let mut libraries = HashSet::new();
        let mut tools = HashSet::new();

        for file in &evidence.files {
            // Languages from file extensions
            match file.language.as_str() {
                "typescript" => { languages.insert("TypeScript".to_string()); }
                "javascript" => { languages.insert("JavaScript".to_string()); }
                "rust" => { languages.insert("Rust".to_string()); }
                "python" => { languages.insert("Python".to_string()); }
                _ => {}
            }

            // Frameworks and libraries from imports
            for ev in &file.evidence {
                if ev.evidence_type == EvidenceType::Import {
                    Self::detect_framework_from_import(&ev.content, &mut frameworks, &mut libraries);
                }
            }
        }

        // Detect tools from config files
        for file in &evidence.files {
            if file.file_type == FileType::Config {
                Self::detect_tools_from_config(&file.path, &mut tools);
            }
        }

        TechnologyStack {
            languages: languages.into_iter().collect(),
            frameworks: frameworks.into_iter().collect(),
            libraries: libraries.into_iter().collect(),
            tools: tools.into_iter().collect(),
        }
    }

    /// Detect framework from import statement
    fn detect_framework_from_import(
        import: &str,
        frameworks: &mut HashSet<String>,
        libraries: &mut HashSet<String>,
    ) {
        let import_lower = import.to_lowercase();

        // React ecosystem
        if import_lower.contains("react") {
            frameworks.insert("React".to_string());
        }
        if import_lower.contains("next") {
            frameworks.insert("Next.js".to_string());
        }

        // State management
        if import_lower.contains("zustand") {
            libraries.insert("Zustand".to_string());
        }
        if import_lower.contains("redux") {
            libraries.insert("Redux".to_string());
        }

        // UI libraries
        if import_lower.contains("@radix") || import_lower.contains("radix-ui") {
            libraries.insert("Radix UI".to_string());
        }
        if import_lower.contains("shadcn") {
            libraries.insert("shadcn/ui".to_string());
        }

        // Form libraries
        if import_lower.contains("react-hook-form") {
            libraries.insert("React Hook Form".to_string());
        }
        if import_lower.contains("zod") {
            libraries.insert("Zod".to_string());
        }

        // Tauri
        if import_lower.contains("@tauri-apps") || import_lower.contains("tauri") {
            frameworks.insert("Tauri".to_string());
        }

        // Tanstack
        if import_lower.contains("@tanstack/react-query") {
            libraries.insert("TanStack Query".to_string());
        }
        if import_lower.contains("@tanstack/react-router") {
            libraries.insert("TanStack Router".to_string());
        }
    }

    /// Detect tools from config file paths
    fn detect_tools_from_config(path: &str, tools: &mut HashSet<String>) {
        let path_lower = path.to_lowercase();

        if path_lower.contains("tsconfig") {
            tools.insert("TypeScript".to_string());
        }
        if path_lower.contains("tailwind") {
            tools.insert("Tailwind CSS".to_string());
        }
        if path_lower.contains("eslint") {
            tools.insert("ESLint".to_string());
        }
        if path_lower.contains("prettier") {
            tools.insert("Prettier".to_string());
        }
        if path_lower.contains("vite") {
            tools.insert("Vite".to_string());
        }
        if path_lower.contains("cargo.toml") {
            tools.insert("Cargo".to_string());
        }
    }

    /// Extract project metadata
    fn extract_metadata(evidence: &EvidenceSet) -> ProjectMetadata {
        let mut metadata = ProjectMetadata {
            has_tests: false,
            has_types: false,
            has_config: false,
            has_documentation: false,
            entry_points: Vec::new(),
        };

        for file in &evidence.files {
            match file.file_type {
                FileType::Test => metadata.has_tests = true,
                FileType::Config => metadata.has_config = true,
                FileType::Documentation => metadata.has_documentation = true,
                _ => {}
            }

            // Check for type definitions
            if file.evidence.iter().any(|e| e.evidence_type == EvidenceType::TypeDefinition) {
                metadata.has_types = true;
            }

            // Detect entry points
            let path_lower = file.path.to_lowercase();
            if path_lower.contains("main.") || path_lower.contains("index.") || path_lower.contains("app.") {
                metadata.entry_points.push(file.path.clone());
            }
        }

        metadata
    }

    /// Group files by feature category
    fn group_by_feature(evidence: &EvidenceSet) -> HashMap<FeatureCategory, Vec<&FileEvidence>> {
        let mut groups: HashMap<FeatureCategory, Vec<&FileEvidence>> = HashMap::new();

        for file in &evidence.files {
            let category = Self::categorize_file(&file.path);
            groups.entry(category).or_default().push(file);
        }

        groups
    }

    /// Categorize a file by its path
    fn categorize_file(path: &str) -> FeatureCategory {
        let path_lower = path.to_lowercase();

        // Authentication - be specific, "session" alone is too generic
        if path_lower.contains("auth") || path_lower.contains("login") || path_lower.contains("signin") || path_lower.contains("signup") {
            FeatureCategory::Authentication
        } else if path_lower.contains("api") || path_lower.contains("service") || path_lower.contains("client") {
            FeatureCategory::Api
        } else if path_lower.contains("context") || path_lower.contains("store") || path_lower.contains("state") {
            FeatureCategory::StateManagement
        } else if path_lower.contains("route") || path_lower.contains("page") || path_lower.contains("navigation") {
            FeatureCategory::Routing
        } else if path_lower.contains("component") || path_lower.contains("ui") || path_lower.contains("view") {
            FeatureCategory::UserInterface
        } else if path_lower.contains("config") || path_lower.contains("setting") {
            FeatureCategory::Configuration
        } else if path_lower.contains("style") || path_lower.contains(".css") {
            FeatureCategory::Styling
        } else if path_lower.contains("test") || path_lower.contains("spec") {
            FeatureCategory::Testing
        } else if path_lower.contains("util") || path_lower.contains("helper") || path_lower.contains("lib") {
            FeatureCategory::Utilities
        } else if path_lower.contains(".md") || path_lower.contains("readme") {
            FeatureCategory::Documentation
        } else if path_lower.contains("model") || path_lower.contains("type") || path_lower.contains("schema") {
            FeatureCategory::DataManagement
        } else {
            FeatureCategory::Unknown
        }
    }

    /// Build a feature fact from a group of files
    fn build_feature_fact(
        category: FeatureCategory,
        files: &[&FileEvidence],
        evidence: &EvidenceSet,
    ) -> Option<FeatureFact> {
        if files.is_empty() {
            return None;
        }

        // Collect API evidence
        let api_evidence: Vec<String> = files
            .iter()
            .flat_map(|f| &f.evidence)
            .filter(|e| matches!(e.evidence_type, EvidenceType::Export | EvidenceType::PublicApi | EvidenceType::Signature))
            .map(|e| e.content.clone())
            .take(10) // Limit to avoid bloat
            .collect();

        // Collect dependencies from imports
        let dependencies: Vec<String> = files
            .iter()
            .flat_map(|f| &f.evidence)
            .filter(|e| e.evidence_type == EvidenceType::Import)
            .filter_map(|e| Self::extract_package_name(&e.content))
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();

        // Generate description based on category and files
        let description = Self::generate_feature_description(category, files);

        Some(FeatureFact {
            name: category.as_str().to_string(),
            description,
            category,
            files: files.iter().map(|f| f.path.clone()).collect(),
            api_evidence,
            dependencies,
        })
    }

    /// Extract package name from import statement
    fn extract_package_name(import: &str) -> Option<String> {
        // TypeScript/JavaScript: import ... from 'package'
        if let Some(from_pos) = import.find("from") {
            let after_from = &import[from_pos + 4..];
            let trimmed = after_from.trim().trim_matches(|c| c == '\'' || c == '"' || c == ';');
            // Get package name (first part before /)
            let package = trimmed.split('/').next()?;
            if !package.starts_with('.') && !package.starts_with("@/") {
                return Some(package.to_string());
            }
        }

        // Rust: use package::...
        if import.starts_with("use ") {
            let parts: Vec<&str> = import[4..].split("::").collect();
            if let Some(first) = parts.first() {
                let package = first.trim().trim_end_matches(';');
                if !["super", "self", "crate"].contains(&package) {
                    return Some(package.to_string());
                }
            }
        }

        None
    }

    /// Generate feature description from category and files
    fn generate_feature_description(category: FeatureCategory, files: &[&FileEvidence]) -> String {
        let file_count = files.len();

        match category {
            FeatureCategory::Authentication => {
                format!("User authentication and session management ({} files)", file_count)
            }
            FeatureCategory::Api => {
                format!("API layer for data fetching and server communication ({} files)", file_count)
            }
            FeatureCategory::StateManagement => {
                format!("Application state management using context/stores ({} files)", file_count)
            }
            FeatureCategory::Routing => {
                format!("Page routing and navigation ({} files)", file_count)
            }
            FeatureCategory::UserInterface => {
                format!("UI components and views ({} files)", file_count)
            }
            FeatureCategory::Configuration => {
                format!("Project configuration and settings ({} files)", file_count)
            }
            FeatureCategory::Styling => {
                format!("Visual styling and theming ({} files)", file_count)
            }
            FeatureCategory::Testing => {
                format!("Test suites and specifications ({} files)", file_count)
            }
            FeatureCategory::Utilities => {
                format!("Utility functions and helpers ({} files)", file_count)
            }
            FeatureCategory::Documentation => {
                format!("Project documentation ({} files)", file_count)
            }
            FeatureCategory::DataManagement => {
                format!("Data models and type definitions ({} files)", file_count)
            }
            FeatureCategory::Unknown => {
                format!("General project files ({} files)", file_count)
            }
        }
    }

    /// Extract decisions from code patterns
    fn extract_decisions(evidence: &EvidenceSet) -> Vec<Decision> {
        let mut decisions = Vec::new();

        // Check for state management decisions
        let has_context = evidence.files.iter().any(|f| f.path.contains("context"));
        let has_zustand = evidence.public_api.iter().any(|e| e.content.contains("create("));
        let has_redux = evidence.files.iter().any(|f| f.path.contains("redux") || f.path.contains("slice"));

        if has_context {
            decisions.push(Decision {
                description: "React Context for state management".to_string(),
                category: DecisionCategory::Pattern,
                evidence: vec!["Context files detected".to_string()],
            });
        } else if has_zustand {
            decisions.push(Decision {
                description: "Zustand for state management".to_string(),
                category: DecisionCategory::Technology,
                evidence: vec!["Zustand store pattern detected".to_string()],
            });
        } else if has_redux {
            decisions.push(Decision {
                description: "Redux for state management".to_string(),
                category: DecisionCategory::Technology,
                evidence: vec!["Redux slice pattern detected".to_string()],
            });
        }

        // Check for TypeScript decision
        let has_typescript = evidence.files.iter().any(|f| f.language == "typescript");
        let has_types = !evidence.types.is_empty();

        if has_typescript && has_types {
            decisions.push(Decision {
                description: "TypeScript with strict typing".to_string(),
                category: DecisionCategory::Technology,
                evidence: vec![format!("{} type definitions", evidence.types.len())],
            });
        }

        // Check for component architecture
        let component_files: Vec<_> = evidence.files.iter()
            .filter(|f| f.path.contains("component"))
            .collect();

        if component_files.len() > 3 {
            decisions.push(Decision {
                description: "Component-based architecture".to_string(),
                category: DecisionCategory::Architecture,
                evidence: vec![format!("{} component files", component_files.len())],
            });
        }

        // Check for API layer
        let has_api_layer = evidence.files.iter().any(|f|
            f.path.contains("/api/") || f.path.contains("/services/") || f.path.contains("/client")
        );

        if has_api_layer {
            decisions.push(Decision {
                description: "Dedicated API/service layer".to_string(),
                category: DecisionCategory::Architecture,
                evidence: vec!["API/service files detected".to_string()],
            });
        }

        decisions
    }

    /// Extract constraints from code patterns
    fn extract_constraints(evidence: &EvidenceSet) -> Vec<Constraint> {
        let mut constraints = Vec::new();

        // Check for Tauri (desktop constraint)
        let has_tauri = evidence.files.iter().any(|f|
            f.path.contains("tauri") ||
            f.evidence.iter().any(|e| e.content.contains("@tauri-apps") || e.content.contains("tauri::"))
        );

        if has_tauri {
            constraints.push(Constraint {
                description: "Desktop application (Tauri)".to_string(),
                reason: Some("Requires Tauri runtime for native features".to_string()),
            });
        }

        // Check for specific React version requirements
        let uses_hooks = evidence.public_api.iter().any(|e|
            e.content.contains("use") && e.content.chars().nth(3).map(|c| c.is_uppercase()).unwrap_or(false)
        );

        if uses_hooks {
            constraints.push(Constraint {
                description: "React 16.8+ required".to_string(),
                reason: Some("Uses React Hooks".to_string()),
            });
        }

        constraints
    }

    /// Infer intents from features and decisions
    fn infer_intents(features: &[FeatureFact], decisions: &[Decision]) -> Vec<Intent> {
        let mut intents = Vec::new();

        // Infer from features
        for feature in features {
            match feature.category {
                FeatureCategory::Authentication => {
                    intents.push(Intent {
                        description: "Implement user authentication".to_string(),
                        confidence: Confidence::High,
                        evidence: vec![format!("{} auth files", feature.files.len())],
                    });
                }
                FeatureCategory::Api => {
                    intents.push(Intent {
                        description: "Build API integration layer".to_string(),
                        confidence: Confidence::High,
                        evidence: vec![format!("{} API files", feature.files.len())],
                    });
                }
                FeatureCategory::UserInterface if feature.files.len() > 5 => {
                    intents.push(Intent {
                        description: "Create comprehensive UI component library".to_string(),
                        confidence: Confidence::Medium,
                        evidence: vec![format!("{} UI components", feature.files.len())],
                    });
                }
                _ => {}
            }
        }

        // Limit intents
        intents.truncate(5);
        intents
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::docs::evidence::EvidenceExtractor;

    #[test]
    fn test_feature_categorization() {
        assert_eq!(SemanticExtractor::categorize_file("src/auth/login.tsx"), FeatureCategory::Authentication);
        assert_eq!(SemanticExtractor::categorize_file("src/services/api-client.ts"), FeatureCategory::Api);
        assert_eq!(SemanticExtractor::categorize_file("src/context/user-context.tsx"), FeatureCategory::StateManagement);
        assert_eq!(SemanticExtractor::categorize_file("src/components/Button.tsx"), FeatureCategory::UserInterface);
        assert_eq!(SemanticExtractor::categorize_file("src/utils/helpers.ts"), FeatureCategory::Utilities);
    }

    #[test]
    fn test_package_extraction() {
        assert_eq!(
            SemanticExtractor::extract_package_name("import { useState } from 'react'"),
            Some("react".to_string())
        );
        assert_eq!(
            SemanticExtractor::extract_package_name("import Button from '@radix-ui/react-button'"),
            Some("@radix-ui".to_string())
        );
        assert_eq!(
            SemanticExtractor::extract_package_name("use serde::{Serialize, Deserialize};"),
            Some("serde".to_string())
        );
        // Local imports should return None
        assert_eq!(
            SemanticExtractor::extract_package_name("import { helper } from './utils'"),
            None
        );
    }

    #[test]
    fn test_semantic_extraction_produces_facts() {
        // Create minimal evidence
        let file = EvidenceExtractor::extract(
            "src/context/auth-context.tsx",
            r#"
import { createContext, useContext, useState } from 'react'

export interface AuthState {
    user: User | null
    isLoading: boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be within AuthProvider')
    return context
}
"#
        );

        let evidence_set = crate::docs::evidence::EvidenceAggregator::aggregate(vec![file]);
        let facts = SemanticExtractor::extract(&evidence_set);

        // Should detect features
        assert!(!facts.features.is_empty());

        // Should detect React
        assert!(facts.stack.frameworks.contains(&"React".to_string()));

        // Should have metadata
        assert!(facts.metadata.has_types);
    }
}
