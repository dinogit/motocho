/**
 * Documentation Pipeline
 *
 * Orchestrates the full pipeline:
 * Artifacts → Semantic Extraction → Structural Model → Evidence Reduction → IR → LLM Prose
 *
 * The pipeline ensures:
 * - Each layer is invoked in order
 * - IR is the only thing passed to the LLM
 * - LLM does NOT infer architecture or summarize raw code
 * - IR is logged for inspection/debugging
 */

use std::collections::HashMap;
use std::process::Command;

use super::evidence::{EvidenceAggregator, EvidenceExtractor, EvidenceSet};
use super::ir::{DocAudience, DocumentationIR};
use super::semantic::{SemanticExtractor, SemanticFacts};
use super::structure::{DocStructure, IRConverter, StructureBuilder};

// ============================================================================
// Artifact Types (Input to Pipeline)
// ============================================================================

/// A file artifact extracted from sessions
#[derive(Debug, Clone)]
pub struct FileArtifact {
    pub path: String,
    pub content: String,
    pub artifact_type: ArtifactType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArtifactType {
    Created,
    Modified,
}

/// Context extracted from session conversations
#[derive(Debug, Clone, Default)]
pub struct ConversationContext {
    /// User messages/requests from the session
    pub user_requests: Vec<String>,
    /// Project description from CLAUDE.md or similar
    pub project_description: Option<String>,
    /// Detected project name from conversation
    pub mentioned_project_name: Option<String>,
}

// ============================================================================
// Pipeline Result
// ============================================================================

/// Result of documentation generation
#[derive(Debug, Clone)]
pub struct PipelineResult {
    /// Generated markdown documentation
    pub markdown: String,
    /// The IR used for generation (for inspection)
    pub ir: DocumentationIR,
    /// The structure (for debugging)
    pub structure: DocStructure,
    /// Token usage (if available)
    pub token_estimate: Option<usize>,
}

// ============================================================================
// Documentation Pipeline
// ============================================================================

pub struct DocumentationPipeline;

impl DocumentationPipeline {
    /// Run the full documentation pipeline
    pub fn run(
        project_name: String,
        artifacts: Vec<FileArtifact>,
        audience: DocAudience,
        custom_prompt: Option<String>,
        session_count: usize,
    ) -> Result<PipelineResult, String> {
        Self::run_with_context(
            project_name,
            artifacts,
            audience,
            custom_prompt,
            session_count,
            ConversationContext::default(),
        )
    }

    /// Run the pipeline with conversation context for better semantic understanding
    pub fn run_with_context(
        project_name: String,
        artifacts: Vec<FileArtifact>,
        audience: DocAudience,
        custom_prompt: Option<String>,
        session_count: usize,
        context: ConversationContext,
    ) -> Result<PipelineResult, String> {
        if artifacts.is_empty() {
            return Err("No artifacts provided".to_string());
        }

        // ====================================================================
        // Layer 1: Evidence Extraction
        // ====================================================================
        let file_evidence: Vec<_> = artifacts
            .iter()
            .map(|a| EvidenceExtractor::extract(&a.path, &a.content))
            .collect();

        let evidence_set = EvidenceAggregator::aggregate(file_evidence);

        eprintln!(
            "[Pipeline] Evidence: {} files, {:.1}% reduction ratio",
            evidence_set.files.len(),
            evidence_set.reduction_ratio * 100.0
        );

        // ====================================================================
        // Layer 2: Semantic Extraction
        // ====================================================================
        let semantic_facts = SemanticExtractor::extract(&evidence_set);

        eprintln!(
            "[Pipeline] Semantic: {} features, {} decisions, {} intents",
            semantic_facts.features.len(),
            semantic_facts.decisions.len(),
            semantic_facts.intents.len()
        );

        // ====================================================================
        // Layer 3: Structural Modeling (with conversation context)
        // ====================================================================
        let structure = StructureBuilder::build_with_context(&semantic_facts, &evidence_set, &context);

        eprintln!(
            "[Pipeline] Structure: {} feature sections, {} decisions",
            structure.features.len(),
            structure.decisions.len()
        );

        // ====================================================================
        // Layer 4: IR Generation
        // ====================================================================
        let ir = IRConverter::convert(
            &structure,
            project_name.clone(),
            audience,
            session_count,
            artifacts.len(),
        );

        // Log IR for inspection
        if let Ok(ir_json) = ir.to_json() {
            eprintln!("[Pipeline] IR generated: {}", ir.summary());
            // In debug mode, could write to file for inspection
            #[cfg(debug_assertions)]
            eprintln!("[Pipeline] IR JSON:\n{}", ir_json);
        }

        // ====================================================================
        // Layer 5: LLM Synthesis
        // ====================================================================
        let markdown = Self::synthesize(&ir, custom_prompt.as_deref())?;

        // Estimate tokens (rough: ~4 chars per token)
        let token_estimate = Some(markdown.len() / 4);

        Ok(PipelineResult {
            markdown,
            ir,
            structure,
            token_estimate,
        })
    }

    /// Synthesize markdown from IR using LLM
    fn synthesize(ir: &DocumentationIR, custom_prompt: Option<&str>) -> Result<String, String> {
        // Build the prompt from IR
        let prompt = match custom_prompt {
            Some(cp) => Self::build_custom_prompt(ir, cp),
            None => Self::build_audience_prompt(ir),
        };

        // Call claude CLI
        let output = Command::new("claude")
            .args(["--print", &prompt])
            .output()
            .map_err(|e| format!("Failed to run claude CLI: {}", e))?;

        if output.status.success() {
            let response = String::from_utf8_lossy(&output.stdout).to_string();
            if response.trim().is_empty() {
                // Fallback if LLM returns empty
                Ok(Self::fallback_markdown(ir))
            } else {
                Ok(response.trim().to_string())
            }
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            eprintln!("[Pipeline] Claude CLI error: {}", stderr);
            // Return fallback instead of failing
            Ok(Self::fallback_markdown(ir))
        }
    }

    /// Build prompt for specific audience
    fn build_audience_prompt(ir: &DocumentationIR) -> String {
        let ir_json = ir.to_json().unwrap_or_else(|_| "{}".to_string());

        match ir.audience {
            DocAudience::Engineer => Self::engineer_prompt(&ir_json),
            DocAudience::Business => Self::business_prompt(&ir_json),
            DocAudience::Agent => Self::agent_prompt(&ir_json),
        }
    }

    /// Build custom prompt with IR context
    fn build_custom_prompt(ir: &DocumentationIR, custom: &str) -> String {
        let ir_json = ir.to_json().unwrap_or_else(|_| "{}".to_string());

        format!(
            r#"You are generating documentation from a structured intermediate representation (IR).

DOCUMENTATION IR:
```json
{ir_json}
```

USER'S CUSTOM INSTRUCTIONS:
{custom}

RULES:
1. Use ONLY the information provided in the IR
2. Do NOT guess or infer features not listed
3. Do NOT add code examples unless they are in the IR
4. If information is missing, say "Not documented" rather than guessing
5. Output clean Markdown

Generate the documentation now."#
        )
    }

    /// Engineer-focused prompt
    fn engineer_prompt(ir_json: &str) -> String {
        format!(
            r#"You are a technical documentation writer. Generate SOFTWARE DOCUMENTATION from this structured IR.

DOCUMENTATION IR:
```json
{ir_json}
```

Generate documentation following this structure:

# [Project Name] Documentation

## Overview
Write 2-3 sentences based on the IR's overview.purpose, overview.stack, and overview.modules.

## Features
For each feature in the IR:
### [Feature Name]
- Description from IR
- Capabilities listed in IR
- API signatures (if provided)
- Code snippet (if provided)

## Architecture Decisions
List decisions from the IR (if any).

## Current Status
- Completed items
- Incomplete items
- Dependencies

## Appendix
- Commands (if in IR)
- Configuration notes (if in IR)

CRITICAL RULES:
1. Use ONLY information from the IR JSON
2. Do NOT invent features, APIs, or code not in the IR
3. Do NOT summarize "raw code" - use the provided evidence only
4. If a field is empty or missing, skip that section
5. If information is insufficient, write "Details not documented"
6. Output clean Markdown only"#
        )
    }

    /// Business-focused prompt
    fn business_prompt(ir_json: &str) -> String {
        format!(
            r#"You are a business analyst writing documentation for stakeholders.

DOCUMENTATION IR:
```json
{ir_json}
```

Generate a BUSINESS-FOCUSED document (NO CODE):

# [Project Name] - Overview

## Executive Summary
2-3 sentences about what this project does, based on overview.purpose.

## Features & Capabilities
For each feature in the IR, write a bullet point explaining what it does in business terms.
NO technical jargon. NO code.

## Technology Stack
One paragraph summarizing the technologies (from overview.stack) in simple terms.

## Status
What's complete, what's in progress.

CRITICAL RULES:
1. Use ONLY information from the IR
2. NO code snippets, NO API references
3. Write for executives and product managers
4. If information is missing, say "Details to be confirmed"
5. Keep it concise (aim for 1 page)
6. Output clean Markdown only"#
        )
    }

    /// Agent-focused prompt (CLAUDE.md)
    fn agent_prompt(ir_json: &str) -> String {
        format!(
            r#"You are creating a CLAUDE.md context file for AI assistants.

DOCUMENTATION IR:
```json
{ir_json}
```

Generate a CLAUDE.md file:

# [Project Name]

## Project Purpose
One paragraph based on overview.purpose.

## Architecture
Describe the structure based on overview.modules and features.

## Key Files
List files from each feature section with their purposes.

## Patterns & Conventions
List decisions from the IR as patterns to follow.

## Important Context
- Dependencies from current_state.dependencies
- What's complete vs incomplete

## Commands
List commands from appendix (if available).

CRITICAL RULES:
1. Use ONLY information from the IR
2. Do NOT invent file purposes not documented
3. Focus on CONTEXT for future AI assistants
4. If information is missing, note it explicitly
5. Output clean Markdown only"#
        )
    }

    /// Fallback markdown when LLM is unavailable
    fn fallback_markdown(ir: &DocumentationIR) -> String {
        let mut md = format!("# {} Documentation\n\n", ir.project_name);

        // Overview
        md.push_str("## Overview\n\n");
        md.push_str(&format!("{}\n\n", ir.overview.purpose));

        if !ir.overview.stack.is_empty() {
            md.push_str(&format!("**Stack:** {}\n\n", ir.overview.stack.join(", ")));
        }

        // Features
        if !ir.features.is_empty() {
            md.push_str("## Features\n\n");
            for feature in &ir.features {
                md.push_str(&format!("### {}\n\n", feature.name));
                md.push_str(&format!("{}\n\n", feature.description));

                if !feature.capabilities.is_empty() {
                    md.push_str("**Capabilities:**\n");
                    for cap in &feature.capabilities {
                        md.push_str(&format!("- {}\n", cap));
                    }
                    md.push_str("\n");
                }

                if !feature.api_signatures.is_empty() {
                    md.push_str("**API:**\n```\n");
                    for sig in &feature.api_signatures {
                        md.push_str(&format!("{}\n", sig));
                    }
                    md.push_str("```\n\n");
                }
            }
        }

        // Decisions
        if !ir.decisions.is_empty() {
            md.push_str("## Decisions\n\n");
            for decision in &ir.decisions {
                md.push_str(&format!("- {}\n", decision.decision));
            }
            md.push_str("\n");
        }

        // Status
        md.push_str("## Status\n\n");
        if !ir.current_state.completed.is_empty() {
            md.push_str("**Completed:**\n");
            for item in &ir.current_state.completed {
                md.push_str(&format!("- {}\n", item));
            }
            md.push_str("\n");
        }

        if !ir.current_state.dependencies.is_empty() {
            md.push_str("**Dependencies:**\n");
            for dep in &ir.current_state.dependencies {
                md.push_str(&format!("- {}\n", dep));
            }
            md.push_str("\n");
        }

        // Appendix
        if let Some(appendix) = &ir.appendix {
            if !appendix.commands.is_empty() {
                md.push_str("## Commands\n\n");
                for cmd in &appendix.commands {
                    md.push_str(&format!("- {}\n", cmd));
                }
                md.push_str("\n");
            }
        }

        md.push_str(&format!(
            "---\n*Generated from {} sessions, {} files*\n",
            ir.session_count, ir.file_count
        ));

        md
    }
}

// ============================================================================
// Pipeline without LLM (for testing)
// ============================================================================

impl DocumentationPipeline {
    /// Run pipeline without LLM (returns IR as markdown)
    pub fn run_without_llm(
        project_name: String,
        artifacts: Vec<FileArtifact>,
        audience: DocAudience,
        session_count: usize,
    ) -> Result<PipelineResult, String> {
        Self::run_without_llm_with_context(
            project_name,
            artifacts,
            audience,
            session_count,
            ConversationContext::default(),
        )
    }

    /// Run pipeline without LLM, with conversation context
    pub fn run_without_llm_with_context(
        project_name: String,
        artifacts: Vec<FileArtifact>,
        audience: DocAudience,
        session_count: usize,
        context: ConversationContext,
    ) -> Result<PipelineResult, String> {
        if artifacts.is_empty() {
            return Err("No artifacts provided".to_string());
        }

        // Run extraction layers
        let file_evidence: Vec<_> = artifacts
            .iter()
            .map(|a| EvidenceExtractor::extract(&a.path, &a.content))
            .collect();

        let evidence_set = EvidenceAggregator::aggregate(file_evidence);
        let semantic_facts = SemanticExtractor::extract(&evidence_set);
        let structure = StructureBuilder::build_with_context(&semantic_facts, &evidence_set, &context);

        let ir = IRConverter::convert(
            &structure,
            project_name,
            audience,
            session_count,
            artifacts.len(),
        );

        // Use fallback markdown instead of LLM
        let markdown = Self::fallback_markdown(&ir);

        Ok(PipelineResult {
            markdown,
            ir,
            structure,
            token_estimate: None,
        })
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_artifacts() -> Vec<FileArtifact> {
        vec![
            FileArtifact {
                path: "src/context/auth-context.tsx".to_string(),
                content: r#"
import { createContext, useContext } from 'react'

export interface AuthState {
    user: User | null
    isLoading: boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
    return useContext(AuthContext)
}
"#
                .to_string(),
                artifact_type: ArtifactType::Created,
            },
            FileArtifact {
                path: "src/services/api-client.ts".to_string(),
                content: r#"
import { invoke } from '@tauri-apps/api/core'

export async function fetchUser(id: string): Promise<User> {
    return invoke('get_user', { id })
}

export async function login(email: string, password: string): Promise<Session> {
    return invoke('login', { email, password })
}
"#
                .to_string(),
                artifact_type: ArtifactType::Created,
            },
            FileArtifact {
                path: "src/components/UserCard.tsx".to_string(),
                content: r#"
import { useAuth } from '../context/auth-context'

export function UserCard() {
    const { user } = useAuth()
    return <div>{user?.name}</div>
}
"#
                .to_string(),
                artifact_type: ArtifactType::Created,
            },
        ]
    }

    #[test]
    fn test_pipeline_without_llm() {
        let artifacts = create_test_artifacts();
        let result = DocumentationPipeline::run_without_llm(
            "test-project".to_string(),
            artifacts,
            DocAudience::Engineer,
            3,
        )
        .unwrap();

        // IR should be valid
        assert!(!result.ir.project_name.is_empty());
        assert!(!result.ir.features.is_empty());

        // Markdown should be generated
        assert!(result.markdown.contains("# test-project"));
        assert!(result.markdown.contains("Overview"));

        // Structure should have features
        assert!(!result.structure.features.is_empty());
    }

    #[test]
    fn test_pipeline_detects_stack() {
        let artifacts = create_test_artifacts();
        let result = DocumentationPipeline::run_without_llm(
            "test".to_string(),
            artifacts,
            DocAudience::Engineer,
            1,
        )
        .unwrap();

        // Should detect React and Tauri
        assert!(
            result.ir.overview.stack.iter().any(|s| s.contains("React"))
                || result.structure.overview.stack.iter().any(|s| s.contains("React"))
        );
    }

    #[test]
    fn test_pipeline_produces_features() {
        let artifacts = create_test_artifacts();
        let result = DocumentationPipeline::run_without_llm(
            "test".to_string(),
            artifacts,
            DocAudience::Engineer,
            1,
        )
        .unwrap();

        // Should have features grouped thematically
        let feature_names: Vec<_> = result.ir.features.iter().map(|f| f.name.as_str()).collect();

        // Should detect state management (context), API, and UI
        assert!(
            feature_names.iter().any(|n| n.contains("State") || n.contains("API") || n.contains("User"))
        );
    }

    #[test]
    fn test_ir_is_inspectable() {
        let artifacts = create_test_artifacts();
        let result = DocumentationPipeline::run_without_llm(
            "test".to_string(),
            artifacts,
            DocAudience::Engineer,
            1,
        )
        .unwrap();

        // IR should serialize to JSON
        let json = result.ir.to_json().unwrap();
        assert!(json.contains("project_name"));
        assert!(json.contains("features"));
        assert!(json.contains("audience"));

        // Should be parseable
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed.is_object());
    }
}
