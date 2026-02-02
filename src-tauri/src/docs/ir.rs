/**
 * Documentation Intermediate Representation (IR)
 *
 * This is the MANDATORY BOUNDARY between Rust extraction and LLM synthesis.
 * The IR is the ONLY thing passed to the LLM.
 *
 * Invariants:
 * - No raw code blobs (only evidence snippets)
 * - No file paths as primary structure (thematic organization)
 * - All facts are explicit (LLM must not infer)
 * - Serializable to JSON for inspection/debugging
 */

use serde::{Deserialize, Serialize};

// ============================================================================
// Audience Types
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DocAudience {
    Engineer,
    Business,
    Agent,
}

impl DocAudience {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "business" => DocAudience::Business,
            "agent" => DocAudience::Agent,
            _ => DocAudience::Engineer,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            DocAudience::Engineer => "engineer",
            DocAudience::Business => "business",
            DocAudience::Agent => "agent",
        }
    }
}

// ============================================================================
// IR Core Types
// ============================================================================

/// A feature or capability extracted from sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IRFeature {
    /// Feature name (e.g., "Authentication", "Form Validation")
    pub name: String,
    /// What this feature does (1-2 sentences)
    pub description: String,
    /// Key capabilities this feature provides
    pub capabilities: Vec<String>,
    /// Public API signatures (for engineer audience)
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub api_signatures: Vec<String>,
    /// Representative code snippet (minimal, proof only)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_snippet: Option<String>,
    /// Files that implement this feature
    pub files: Vec<String>,
}

/// A design decision made during development
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IRDecision {
    /// What was decided
    pub decision: String,
    /// Why this choice was made (if known)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rationale: Option<String>,
    /// Alternatives that were considered
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub alternatives: Vec<String>,
}

/// Current project state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IRState {
    /// What is complete and working
    pub completed: Vec<String>,
    /// Known issues or incomplete items
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub incomplete: Vec<String>,
    /// Dependencies or requirements
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub dependencies: Vec<String>,
}

/// Appendix for additional reference material
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IRAppendix {
    /// Configuration examples
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub config_examples: Vec<String>,
    /// Type definitions (for engineer audience)
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub type_definitions: Vec<String>,
    /// Commands for development
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub commands: Vec<String>,
}

// ============================================================================
// Documentation IR - The Boundary
// ============================================================================

/// The complete intermediate representation for documentation generation.
/// This is the ONLY thing passed to the LLM.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentationIR {
    /// Project name
    pub project_name: String,
    /// Target audience
    pub audience: DocAudience,
    /// High-level project overview (factual, not prose)
    pub overview: IROverview,
    /// Features organized thematically (NOT by file)
    pub features: Vec<IRFeature>,
    /// Design decisions made
    pub decisions: Vec<IRDecision>,
    /// Current state
    pub current_state: IRState,
    /// Optional appendix
    #[serde(skip_serializing_if = "Option::is_none")]
    pub appendix: Option<IRAppendix>,
    /// Session count (for metadata)
    pub session_count: usize,
    /// File count processed
    pub file_count: usize,
}

/// Project overview facts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IROverview {
    /// What the project is (1 sentence)
    pub purpose: String,
    /// Primary technology stack
    pub stack: Vec<String>,
    /// Main modules or areas
    pub modules: Vec<String>,
}

impl DocumentationIR {
    /// Create a new empty IR
    pub fn new(project_name: String, audience: DocAudience) -> Self {
        Self {
            project_name,
            audience,
            overview: IROverview {
                purpose: String::new(),
                stack: Vec::new(),
                modules: Vec::new(),
            },
            features: Vec::new(),
            decisions: Vec::new(),
            current_state: IRState {
                completed: Vec::new(),
                incomplete: Vec::new(),
                dependencies: Vec::new(),
            },
            appendix: None,
            session_count: 0,
            file_count: 0,
        }
    }

    /// Serialize to JSON for inspection/debugging
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Validate the IR has minimum required content
    pub fn is_valid(&self) -> bool {
        !self.project_name.is_empty()
            && !self.overview.purpose.is_empty()
            && !self.features.is_empty()
    }

    /// Get a summary for logging
    pub fn summary(&self) -> String {
        format!(
            "IR[project={}, audience={}, features={}, decisions={}, files={}]",
            self.project_name,
            self.audience.as_str(),
            self.features.len(),
            self.decisions.len(),
            self.file_count
        )
    }
}

// ============================================================================
// IR Builder
// ============================================================================

/// Builder for constructing DocumentationIR incrementally
pub struct IRBuilder {
    ir: DocumentationIR,
}

impl IRBuilder {
    pub fn new(project_name: String, audience: DocAudience) -> Self {
        Self {
            ir: DocumentationIR::new(project_name, audience),
        }
    }

    pub fn set_overview(mut self, purpose: String, stack: Vec<String>, modules: Vec<String>) -> Self {
        self.ir.overview = IROverview {
            purpose,
            stack,
            modules,
        };
        self
    }

    pub fn add_feature(mut self, feature: IRFeature) -> Self {
        self.ir.features.push(feature);
        self
    }

    pub fn add_decision(mut self, decision: IRDecision) -> Self {
        self.ir.decisions.push(decision);
        self
    }

    pub fn set_state(mut self, state: IRState) -> Self {
        self.ir.current_state = state;
        self
    }

    pub fn set_appendix(mut self, appendix: IRAppendix) -> Self {
        self.ir.appendix = Some(appendix);
        self
    }

    pub fn set_counts(mut self, session_count: usize, file_count: usize) -> Self {
        self.ir.session_count = session_count;
        self.ir.file_count = file_count;
        self
    }

    pub fn build(self) -> DocumentationIR {
        self.ir
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ir_creation() {
        let ir = IRBuilder::new("test-project".to_string(), DocAudience::Engineer)
            .set_overview(
                "A test project".to_string(),
                vec!["Rust".to_string(), "React".to_string()],
                vec!["auth".to_string(), "api".to_string()],
            )
            .add_feature(IRFeature {
                name: "Authentication".to_string(),
                description: "User login and session management".to_string(),
                capabilities: vec!["Login".to_string(), "Logout".to_string()],
                api_signatures: vec!["fn login(user: &str, pass: &str) -> Result<Session>".to_string()],
                code_snippet: None,
                files: vec!["src/auth.rs".to_string()],
            })
            .set_counts(5, 10)
            .build();

        assert!(ir.is_valid());
        assert_eq!(ir.features.len(), 1);
        assert_eq!(ir.features[0].name, "Authentication");
    }

    #[test]
    fn test_ir_serialization() {
        let ir = DocumentationIR::new("test".to_string(), DocAudience::Business);
        let json = ir.to_json().unwrap();
        assert!(json.contains("\"project_name\": \"test\""));
        assert!(json.contains("\"audience\": \"business\""));
    }

    #[test]
    fn test_audience_parsing() {
        assert_eq!(DocAudience::from_str("engineer"), DocAudience::Engineer);
        assert_eq!(DocAudience::from_str("BUSINESS"), DocAudience::Business);
        assert_eq!(DocAudience::from_str("agent"), DocAudience::Agent);
        assert_eq!(DocAudience::from_str("unknown"), DocAudience::Engineer);
    }
}
