/**
 * Structural Modeling Layer
 *
 * Responsibility: Group semantic facts + files into document sections.
 *
 * Output:
 * - OverviewBlock: High-level project description
 * - FeatureSections: Grouped by capability, not by file
 * - DecisionBlocks: Architectural choices
 * - StateBlock: Current project status
 *
 * Rules:
 * - Each FeatureSection owns files + facts
 * - No LLM calls here
 * - Deterministic output
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::evidence::{CodeEvidence, EvidenceSet, EvidenceType};
use super::ir::{DocAudience, IRAppendix, IRDecision, IRFeature, IROverview, IRState};
use super::pipeline::ConversationContext;
use super::semantic::{
    Constraint, Decision, FeatureCategory, FeatureFact, SemanticFacts, TechnologyStack,
};

// ============================================================================
// Structure Types
// ============================================================================

/// Overview block for the document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverviewBlock {
    /// Project purpose (1 sentence)
    pub purpose: String,
    /// Primary stack
    pub stack: Vec<String>,
    /// Main modules
    pub modules: Vec<String>,
    /// Key capabilities
    pub capabilities: Vec<String>,
}

/// A section for a feature/capability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureSection {
    /// Feature name
    pub name: String,
    /// Description
    pub description: String,
    /// Category
    pub category: FeatureCategory,
    /// Capabilities provided
    pub capabilities: Vec<String>,
    /// Public API (signatures)
    pub api: Vec<String>,
    /// Representative code snippet (minimal)
    pub snippet: Option<String>,
    /// Files implementing this
    pub files: Vec<String>,
    /// Priority for ordering
    pub priority: u8,
}

/// A decision block
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionBlock {
    /// What was decided
    pub decision: String,
    /// Rationale
    pub rationale: Option<String>,
    /// Alternatives considered
    pub alternatives: Vec<String>,
}

/// Current state block
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateBlock {
    /// What's complete
    pub completed: Vec<String>,
    /// What's incomplete
    pub incomplete: Vec<String>,
    /// Dependencies
    pub dependencies: Vec<String>,
}

/// Complete document structure (pre-IR)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocStructure {
    pub overview: OverviewBlock,
    pub features: Vec<FeatureSection>,
    pub decisions: Vec<DecisionBlock>,
    pub current_state: StateBlock,
    /// Commands for running the project
    pub commands: Vec<String>,
    /// Configuration notes
    pub config_notes: Vec<String>,
}

impl DocStructure {
    pub fn new() -> Self {
        Self {
            overview: OverviewBlock {
                purpose: String::new(),
                stack: Vec::new(),
                modules: Vec::new(),
                capabilities: Vec::new(),
            },
            features: Vec::new(),
            decisions: Vec::new(),
            current_state: StateBlock {
                completed: Vec::new(),
                incomplete: Vec::new(),
                dependencies: Vec::new(),
            },
            commands: Vec::new(),
            config_notes: Vec::new(),
        }
    }

    /// Serialize to JSON for inspection
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

// ============================================================================
// Structure Builder
// ============================================================================

/// Builds document structure from semantic facts and evidence
pub struct StructureBuilder;

impl StructureBuilder {
    /// Build document structure from semantic facts (without conversation context)
    pub fn build(facts: &SemanticFacts, evidence: &EvidenceSet) -> DocStructure {
        Self::build_with_context(facts, evidence, &ConversationContext::default())
    }

    /// Build document structure with conversation context for better understanding
    pub fn build_with_context(
        facts: &SemanticFacts,
        evidence: &EvidenceSet,
        context: &ConversationContext,
    ) -> DocStructure {
        let mut structure = DocStructure::new();

        // Build overview (use conversation context if available)
        structure.overview = Self::build_overview_with_context(facts, evidence, context);

        // Build feature sections
        structure.features = Self::build_feature_sections(facts, evidence);

        // Build decision blocks
        structure.decisions = Self::build_decision_blocks(&facts.decisions);

        // Build current state
        structure.current_state = Self::build_state_block(facts, evidence);

        // Extract commands from configs
        structure.commands = Self::extract_commands(evidence);

        // Extract config notes
        structure.config_notes = Self::extract_config_notes(evidence);

        structure
    }

    /// Build the overview block with conversation context
    fn build_overview_with_context(
        facts: &SemanticFacts,
        evidence: &EvidenceSet,
        context: &ConversationContext,
    ) -> OverviewBlock {
        // Use project description from context if available, otherwise generate
        let purpose = if let Some(ref desc) = context.project_description {
            desc.clone()
        } else if !context.user_requests.is_empty() {
            // Try to infer purpose from user requests
            Self::infer_purpose_from_requests(&context.user_requests, &facts.stack)
        } else {
            Self::generate_purpose(&facts.features, &facts.stack)
        };

        // Collect stack items
        let mut stack = Vec::new();
        stack.extend(facts.stack.languages.clone());
        stack.extend(facts.stack.frameworks.clone());

        // Collect modules from features
        let modules: Vec<String> = facts
            .features
            .iter()
            .filter(|f| f.category != FeatureCategory::Unknown)
            .map(|f| f.name.clone())
            .collect();

        // Collect capabilities from features
        let capabilities: Vec<String> = facts
            .features
            .iter()
            .take(5)
            .map(|f| f.description.clone())
            .collect();

        OverviewBlock {
            purpose,
            stack,
            modules,
            capabilities,
        }
    }

    /// Infer purpose from user requests in the conversation
    fn infer_purpose_from_requests(requests: &[String], stack: &TechnologyStack) -> String {
        // Take first few meaningful user requests
        let meaningful: Vec<&str> = requests
            .iter()
            .filter(|r| r.len() > 20 && r.len() < 500) // Skip very short or very long
            .take(3)
            .map(|s| s.as_str())
            .collect();

        if meaningful.is_empty() {
            return Self::generate_purpose(&[], stack);
        }

        // Combine the first request as a summary base
        let first_request = meaningful[0];

        // Try to extract the essence
        let platform = if stack.frameworks.iter().any(|f| f.contains("Tauri")) {
            "Desktop application"
        } else if stack.frameworks.iter().any(|f| f.contains("React") || f.contains("Next")) {
            "Web application"
        } else {
            "Application"
        };

        // If the request is clear enough, use it
        if first_request.len() < 200 {
            format!("{} - {}", platform, first_request)
        } else {
            // Truncate long requests
            let truncated: String = first_request.chars().take(150).collect();
            format!("{} - {}...", platform, truncated)
        }
    }

    /// Generate project purpose from features and stack
    fn generate_purpose(features: &[FeatureFact], stack: &TechnologyStack) -> String {
        // Determine project type
        let is_web = stack.frameworks.iter().any(|f| f.contains("React") || f.contains("Next"));
        let is_desktop = stack.frameworks.iter().any(|f| f.contains("Tauri"));
        let has_api = features.iter().any(|f| f.category == FeatureCategory::Api);
        let has_auth = features.iter().any(|f| f.category == FeatureCategory::Authentication);

        let platform = if is_desktop {
            "desktop application"
        } else if is_web {
            "web application"
        } else {
            "application"
        };

        let stack_desc = if !stack.frameworks.is_empty() {
            format!(" built with {}", stack.frameworks.join(" and "))
        } else if !stack.languages.is_empty() {
            format!(" in {}", stack.languages.join(" and "))
        } else {
            String::new()
        };

        let feature_desc = if has_auth && has_api {
            " with authentication and API integration"
        } else if has_auth {
            " with user authentication"
        } else if has_api {
            " with API integration"
        } else {
            ""
        };

        format!("A {}{}{}", platform, stack_desc, feature_desc)
    }

    /// Build feature sections from semantic facts
    fn build_feature_sections(facts: &SemanticFacts, evidence: &EvidenceSet) -> Vec<FeatureSection> {
        let mut sections: Vec<FeatureSection> = facts
            .features
            .iter()
            .filter(|f| f.category != FeatureCategory::Unknown || f.files.len() > 2)
            .map(|f| Self::fact_to_section(f, evidence))
            .collect();

        // Assign priorities
        for section in &mut sections {
            section.priority = Self::get_feature_priority(&section.category);
        }

        // Sort by priority (lower = more important)
        sections.sort_by_key(|s| s.priority);

        // Limit to avoid overwhelming
        sections.truncate(8);

        sections
    }

    /// Convert feature fact to section
    fn fact_to_section(fact: &FeatureFact, evidence: &EvidenceSet) -> FeatureSection {
        // Extract capabilities from API evidence
        let capabilities: Vec<String> = fact
            .api_evidence
            .iter()
            .filter(|a| a.contains("export") || a.contains("pub "))
            .take(5)
            .map(|a| Self::simplify_signature(a))
            .collect();

        // Get a representative snippet (if any)
        let snippet = Self::find_representative_snippet(&fact.files, evidence);

        FeatureSection {
            name: fact.name.clone(),
            description: fact.description.clone(),
            category: fact.category,
            capabilities: if capabilities.is_empty() {
                // Fallback: use API evidence as-is
                fact.api_evidence.iter().take(3).cloned().collect()
            } else {
                capabilities
            },
            api: fact.api_evidence.clone(),
            snippet,
            files: fact.files.clone(),
            priority: 50, // Default, will be overwritten
        }
    }

    /// Simplify a signature for display
    fn simplify_signature(sig: &str) -> String {
        // Remove export/pub prefix
        let cleaned = sig
            .trim_start_matches("export ")
            .trim_start_matches("pub ")
            .trim_start_matches("async ")
            .trim_start_matches("fn ")
            .trim_start_matches("function ")
            .trim_start_matches("const ");

        // Truncate if too long
        if cleaned.len() > 80 {
            format!("{}...", &cleaned[..77])
        } else {
            cleaned.to_string()
        }
    }

    /// Find a representative code snippet for files
    fn find_representative_snippet(files: &[String], evidence: &EvidenceSet) -> Option<String> {
        // Look for a good example (public API or export)
        for file_path in files {
            if let Some(file_ev) = evidence.files.iter().find(|f| &f.path == file_path) {
                for ev in &file_ev.evidence {
                    if ev.evidence_type == EvidenceType::Export
                        || ev.evidence_type == EvidenceType::PublicApi
                    {
                        // Return first good snippet
                        if ev.content.len() > 20 && ev.content.len() < 500 {
                            return Some(ev.content.clone());
                        }
                    }
                }
            }
        }
        None
    }

    /// Get priority for a feature category (lower = more important)
    fn get_feature_priority(category: &FeatureCategory) -> u8 {
        match category {
            FeatureCategory::Api => 10,
            FeatureCategory::Authentication => 15,
            FeatureCategory::DataManagement => 20,
            FeatureCategory::StateManagement => 25,
            FeatureCategory::Routing => 30,
            FeatureCategory::UserInterface => 35,
            FeatureCategory::Configuration => 40,
            FeatureCategory::Utilities => 45,
            FeatureCategory::Styling => 50,
            FeatureCategory::Testing => 55,
            FeatureCategory::Documentation => 60,
            FeatureCategory::Unknown => 100,
        }
    }

    /// Build decision blocks
    fn build_decision_blocks(decisions: &[Decision]) -> Vec<DecisionBlock> {
        decisions
            .iter()
            .map(|d| DecisionBlock {
                decision: d.description.clone(),
                rationale: None, // Could be enhanced with conversation analysis
                alternatives: Vec::new(),
            })
            .collect()
    }

    /// Build state block
    fn build_state_block(facts: &SemanticFacts, evidence: &EvidenceSet) -> StateBlock {
        let mut completed = Vec::new();
        let mut incomplete = Vec::new();
        let mut dependencies = Vec::new();

        // Completed: features with multiple files
        for feature in &facts.features {
            if feature.files.len() >= 2 {
                completed.push(format!("{} ({} files)", feature.name, feature.files.len()));
            }
        }

        // Dependencies: from stack
        dependencies.extend(facts.stack.frameworks.clone());
        dependencies.extend(facts.stack.libraries.clone());

        // Check for incomplete signals
        if !facts.metadata.has_tests {
            incomplete.push("Test coverage".to_string());
        }
        if !facts.metadata.has_documentation {
            incomplete.push("Documentation".to_string());
        }

        StateBlock {
            completed,
            incomplete,
            dependencies,
        }
    }

    /// Extract commands from package.json or Cargo.toml
    fn extract_commands(evidence: &EvidenceSet) -> Vec<String> {
        let mut commands = Vec::new();

        for file in &evidence.files {
            if file.path.contains("package.json") {
                // Look for scripts in config evidence
                for ev in &file.evidence {
                    if ev.evidence_type == EvidenceType::Config {
                        if ev.content.contains("\"scripts\"") {
                            // Extract script names (basic parsing)
                            if ev.content.contains("\"dev\"") {
                                commands.push("npm run dev - Start development server".to_string());
                            }
                            if ev.content.contains("\"build\"") {
                                commands.push("npm run build - Build for production".to_string());
                            }
                            if ev.content.contains("\"test\"") {
                                commands.push("npm run test - Run tests".to_string());
                            }
                            if ev.content.contains("\"lint\"") {
                                commands.push("npm run lint - Run linter".to_string());
                            }
                        }
                    }
                }
            }

            if file.path.contains("Cargo.toml") {
                commands.push("cargo build - Build the project".to_string());
                commands.push("cargo run - Run the project".to_string());
                commands.push("cargo test - Run tests".to_string());
            }
        }

        commands
    }

    /// Extract configuration notes
    fn extract_config_notes(evidence: &EvidenceSet) -> Vec<String> {
        let mut notes = Vec::new();

        for file in &evidence.files {
            let path_lower = file.path.to_lowercase();

            if path_lower.contains("tsconfig") {
                notes.push("TypeScript configuration in tsconfig.json".to_string());
            }
            if path_lower.contains("tailwind") {
                notes.push("Tailwind CSS configured".to_string());
            }
            if path_lower.contains(".env") {
                notes.push("Environment variables required (see .env file)".to_string());
            }
        }

        notes
    }
}

// ============================================================================
// IR Converter
// ============================================================================

/// Converts DocStructure to DocumentationIR
pub struct IRConverter;

impl IRConverter {
    /// Convert structure to IR for a specific audience
    pub fn convert(
        structure: &DocStructure,
        project_name: String,
        audience: DocAudience,
        session_count: usize,
        file_count: usize,
    ) -> super::ir::DocumentationIR {
        let overview = IROverview {
            purpose: structure.overview.purpose.clone(),
            stack: structure.overview.stack.clone(),
            modules: structure.overview.modules.clone(),
        };

        let features: Vec<IRFeature> = structure
            .features
            .iter()
            .map(|s| Self::section_to_ir_feature(s, &audience))
            .collect();

        let decisions: Vec<IRDecision> = structure
            .decisions
            .iter()
            .map(|d| IRDecision {
                decision: d.decision.clone(),
                rationale: d.rationale.clone(),
                alternatives: d.alternatives.clone(),
            })
            .collect();

        let current_state = IRState {
            completed: structure.current_state.completed.clone(),
            incomplete: structure.current_state.incomplete.clone(),
            dependencies: structure.current_state.dependencies.clone(),
        };

        let appendix = if audience == DocAudience::Engineer {
            Some(IRAppendix {
                config_examples: structure.config_notes.clone(),
                type_definitions: Vec::new(), // Could be populated from evidence.types
                commands: structure.commands.clone(),
            })
        } else if audience == DocAudience::Agent {
            Some(IRAppendix {
                config_examples: Vec::new(),
                type_definitions: Vec::new(),
                commands: structure.commands.clone(),
            })
        } else {
            None
        };

        super::ir::DocumentationIR {
            project_name,
            audience,
            overview,
            features,
            decisions,
            current_state,
            appendix,
            session_count,
            file_count,
        }
    }

    /// Convert section to IR feature
    fn section_to_ir_feature(section: &FeatureSection, audience: &DocAudience) -> IRFeature {
        IRFeature {
            name: section.name.clone(),
            description: section.description.clone(),
            capabilities: section.capabilities.clone(),
            api_signatures: if *audience == DocAudience::Engineer {
                section.api.iter().take(5).cloned().collect()
            } else {
                Vec::new()
            },
            code_snippet: if *audience == DocAudience::Engineer {
                section.snippet.clone()
            } else {
                None
            },
            files: if *audience == DocAudience::Agent {
                section.files.clone()
            } else {
                Vec::new() // Business doesn't need file lists
            },
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_purpose_generation() {
        let features = vec![
            FeatureFact {
                name: "API".to_string(),
                description: "API layer".to_string(),
                category: FeatureCategory::Api,
                files: vec!["api.ts".to_string()],
                api_evidence: vec![],
                dependencies: vec![],
            },
            FeatureFact {
                name: "Auth".to_string(),
                description: "Auth layer".to_string(),
                category: FeatureCategory::Authentication,
                files: vec!["auth.ts".to_string()],
                api_evidence: vec![],
                dependencies: vec![],
            },
        ];

        let stack = TechnologyStack {
            languages: vec!["TypeScript".to_string()],
            frameworks: vec!["React".to_string(), "Tauri".to_string()],
            libraries: vec![],
            tools: vec![],
        };

        let purpose = StructureBuilder::generate_purpose(&features, &stack);

        assert!(purpose.contains("desktop application"));
        assert!(purpose.contains("Tauri"));
        assert!(purpose.contains("authentication"));
    }

    #[test]
    fn test_feature_priority() {
        assert!(StructureBuilder::get_feature_priority(&FeatureCategory::Api)
            < StructureBuilder::get_feature_priority(&FeatureCategory::Utilities));

        assert!(StructureBuilder::get_feature_priority(&FeatureCategory::Authentication)
            < StructureBuilder::get_feature_priority(&FeatureCategory::Styling));
    }

    #[test]
    fn test_signature_simplification() {
        assert_eq!(
            StructureBuilder::simplify_signature("export function getUserById(id: string)"),
            "getUserById(id: string)"
        );
        assert_eq!(
            StructureBuilder::simplify_signature("pub async fn get_user(id: String) -> Result<User, Error>"),
            "get_user(id: String) -> Result<User, Error>"
        );
    }

    #[test]
    fn test_structure_serialization() {
        let structure = DocStructure::new();
        let json = structure.to_json().unwrap();
        assert!(json.contains("overview"));
        assert!(json.contains("features"));
    }
}
