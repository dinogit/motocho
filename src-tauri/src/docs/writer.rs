/**
 * Stage 3: Intent-Driven Documentation Writer (AI ONLY)
 *
 * This is the ONLY place where interpretation happens.
 *
 * Input:
 *   - RawIntentData: CLAUDE.md content + user messages (verbatim)
 *   - ArtifactIndex: Files and public symbols from sessions
 *
 * AI Responsibilities:
 *   1. FIRST: Distill intent from raw data → goals, constraints, UX intent, scope
 *   2. Use distilled intent as the PRIMARY document structure
 *   3. Map code artifacts as EVIDENCE supporting each intent theme
 *   4. Section titles and themes come from intent, NOT filenames
 *   5. If no explicit goals, infer from user intent summaries (never from code alone)
 *
 * Output: Complete markdown document structured around intent themes
 *
 * Rust responsibilities: data collection, prompt assembly, fallback output
 * AI responsibilities: ALL interpretation, grouping, prose, structure decisions
 */

use std::process::Command;
use serde::Serialize;

use super::intent::RawIntentData;
use super::artifacts::ArtifactIndex;

// ============================================================================
// Writer Input (What we send to AI)
// ============================================================================

/// The complete input for the AI writer
#[derive(Debug, Clone, Serialize)]
pub struct WriterInput {
    /// Project name
    pub project_name: String,
    /// Target audience
    pub audience: String,
    /// Raw data for intent distillation (CLAUDE.md + user messages)
    pub raw_intent: RawIntentData,
    /// Artifact index (files and symbols from sessions)
    pub artifacts: ArtifactIndex,
    /// Session count
    pub session_count: usize,
}

impl WriterInput {
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

// ============================================================================
// Writer Output
// ============================================================================

#[derive(Debug, Clone)]
pub struct WriterOutput {
    /// Generated markdown
    pub markdown: String,
    /// Whether AI was used
    pub ai_generated: bool,
}

// ============================================================================
// Documentation Writer
// ============================================================================

pub struct DocumentationWriter;

impl DocumentationWriter {
    /// Generate documentation using AI with intent-first approach
    pub fn write(input: WriterInput, custom_prompt: Option<&str>) -> Result<WriterOutput, String> {
        // Build the AI prompt
        let prompt = match custom_prompt {
            Some(cp) => Self::build_custom_prompt(&input, cp),
            None => Self::build_intent_first_prompt(&input),
        };

        // Call Claude CLI
        let output = Command::new("claude")
            .args(["--print", &prompt])
            .output()
            .map_err(|e| format!("Failed to run claude CLI: {}", e))?;

        if output.status.success() {
            let markdown = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if markdown.is_empty() {
                Ok(WriterOutput {
                    markdown: Self::fallback_output(&input),
                    ai_generated: false,
                })
            } else {
                Ok(WriterOutput {
                    markdown,
                    ai_generated: true,
                })
            }
        } else {
            eprintln!(
                "[Writer] Claude CLI failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
            Ok(WriterOutput {
                markdown: Self::fallback_output(&input),
                ai_generated: false,
            })
        }
    }

    /// Write without AI (for testing or when AI is unavailable)
    pub fn write_without_ai(input: WriterInput) -> WriterOutput {
        WriterOutput {
            markdown: Self::fallback_output(&input),
            ai_generated: false,
        }
    }

    /// Build the intent-first AI prompt
    fn build_intent_first_prompt(input: &WriterInput) -> String {
        let input_json = input.to_json().unwrap_or_else(|_| "{}".to_string());

        format!(
r#"You are a documentation writer. Your task is to generate intent-driven documentation.

=== INPUT DATA ===
{input_json}

=== YOUR TASK: TWO-PHASE APPROACH ===

**PHASE 1: DISTILL INTENT (Internal Analysis)**

First, analyze the raw_intent data to extract:

1. **Goals**: What did the user want to accomplish? Look for:
   - Explicit requests ("I want to...", "add feature...", "implement...")
   - Implicit goals from context and conversation flow
   - UX/design intent ("make it feel...", "should be intuitive...", "snappier")

2. **Constraints**: What rules or limitations were specified?
   - Technical constraints ("must use X", "don't use Y")
   - Design constraints ("keep it simple", "no extra dependencies")
   - Process constraints ("don't over-engineer")

3. **Scope**: What's in and out of scope?
   - Explicit boundaries mentioned
   - Features explicitly declined or deferred

4. **Key Decisions**: What significant choices were made?
   - Architecture decisions
   - Library/pattern choices
   - Trade-offs discussed

Treat this distilled intent as AUTHORITATIVE GROUND TRUTH.

**PHASE 2: GENERATE DOCUMENTATION**

Using your distilled intent as the PRIMARY STRUCTURE, generate documentation where:
- Section titles come from INTENT THEMES, not file paths
- Code artifacts serve as EVIDENCE supporting each intent
- If a file doesn't map to any intent, group under "Supporting Infrastructure"

=== OUTPUT FORMAT ===

# {project_name} Documentation

## Overview
[Synthesize the project's purpose from CLAUDE.md and user messages. If neither provides clear purpose, acknowledge this honestly.]

## Goals
[List the goals you distilled, organized by theme. For each goal:]
- **[Goal Theme]**: [Description]
  - Evidence: [List relevant files/symbols that implement this]

## Key Decisions
[Document significant decisions made, with rationale from user messages]

## Changes by Intent

### [Intent Theme 1 - derived from goals]
[Description of what was accomplished]
- Files: [List with key symbols]

### [Intent Theme 2]
...

## Supporting Infrastructure
[Files that enable goals but don't map to a specific intent]

## Constraints Applied
[List constraints from CLAUDE.md and user messages]

## Current State
- Files created: [count]
- Files modified: [count]
- Goals addressed: [list]
- Known gaps: [anything mentioned but not implemented]

---
*Generated from {session_count} sessions, {file_count} files*

=== CRITICAL RULES ===

1. **Intent-First Structure**: Section titles MUST come from distilled intent, NOT from file paths
   - BAD: "Authentication Module" (derived from /auth/ path)
   - GOOD: "User Login Flow" (derived from user's stated goal)

2. **No Path-Based Grouping**: Never create sections like "src/components changes" or "Backend updates"

3. **If Goals Are Unclear**: Infer them ONLY from user message context, never from code alone
   - "User asked about X, then made changes to files A, B" → infer goal was X-related

4. **Honest About Gaps**: If intent cannot be determined, say so explicitly

5. **Audience Adaptation** ({audience}):
   - engineer: Include full symbols, technical details
   - business: Focus on features and outcomes, minimal code
   - agent: Format as CLAUDE.md context for future AI assistants

Generate the document now."#,
            project_name = input.project_name,
            session_count = input.session_count,
            file_count = input.artifacts.total_files,
            audience = input.audience,
        )
    }

    /// Build prompt with custom user instructions
    fn build_custom_prompt(input: &WriterInput, custom: &str) -> String {
        let input_json = input.to_json().unwrap_or_else(|_| "{}".to_string());

        format!(
r#"You are a documentation writer. Generate intent-driven documentation based on the provided data.

=== INPUT DATA ===
{input_json}

=== USER'S CUSTOM INSTRUCTIONS ===
{custom}

=== REQUIRED APPROACH ===

1. FIRST, distill intent from raw_intent (CLAUDE.md + user messages):
   - Goals (explicit and implicit)
   - Constraints
   - Scope boundaries
   - Key decisions

2. THEN, use distilled intent as the PRIMARY document structure

3. Map code artifacts as EVIDENCE supporting each intent theme

=== STRICT RULES ===
1. Section titles MUST come from distilled intent, NOT file paths
2. Never create path-based sections (e.g., "src/components changes")
3. If goals are unclear, infer from user messages, never from code alone
4. Use full signatures from public_symbols
5. Be honest about what cannot be determined

Generate the document now."#
        )
    }

    /// Fallback output when AI is unavailable
    fn fallback_output(input: &WriterInput) -> String {
        let mut md = format!("# {} Documentation\n\n", input.project_name);

        // Overview
        md.push_str("## Overview\n\n");
        if let Some(ref claude_md) = input.raw_intent.claude_md_content {
            // Extract first paragraph as overview
            let first_para: String = claude_md
                .lines()
                .skip_while(|l| l.starts_with('#') || l.trim().is_empty())
                .take_while(|l| !l.trim().is_empty())
                .collect::<Vec<_>>()
                .join(" ");
            if !first_para.is_empty() {
                md.push_str(&first_para);
                md.push_str("\n\n");
            } else {
                md.push_str("*Project purpose from CLAUDE.md - see source for details.*\n\n");
            }
        } else {
            md.push_str("*No CLAUDE.md found. Project purpose not documented.*\n\n");
        }

        // User Messages (raw, for manual review)
        if !input.raw_intent.user_messages.is_empty() {
            md.push_str("## User Intent (Raw Messages)\n\n");
            md.push_str("*These messages need AI processing to distill intent. Showing raw data:*\n\n");
            for (i, msg) in input.raw_intent.user_messages.iter().enumerate().take(5) {
                let truncated = if msg.len() > 200 {
                    format!("{}...", &msg[..200])
                } else {
                    msg.clone()
                };
                md.push_str(&format!("{}. {}\n", i + 1, truncated));
            }
            if input.raw_intent.user_messages.len() > 5 {
                md.push_str(&format!(
                    "\n*...and {} more messages*\n",
                    input.raw_intent.user_messages.len() - 5
                ));
            }
            md.push_str("\n");
        }

        // All Files (no categorization in fallback mode)
        md.push_str("## Files Changed\n\n");
        md.push_str("*Without AI, files cannot be grouped by intent. Showing raw list:*\n\n");

        let created: Vec<_> = input.artifacts.files.iter()
            .filter(|f| f.change_type == super::artifacts::ChangeType::Created)
            .collect();
        let modified: Vec<_> = input.artifacts.files.iter()
            .filter(|f| f.change_type == super::artifacts::ChangeType::Modified)
            .collect();

        if !created.is_empty() {
            md.push_str("### Created\n\n");
            for file in &created {
                md.push_str(&format!("**{}**\n", file.file_path));
                if !file.public_symbols.is_empty() {
                    md.push_str("```\n");
                    for sym in file.public_symbols.iter().take(10) {
                        md.push_str(&format!("{}\n", sym.signature));
                    }
                    if file.public_symbols.len() > 10 {
                        md.push_str(&format!("... and {} more symbols\n", file.public_symbols.len() - 10));
                    }
                    md.push_str("```\n");
                }
                md.push_str("\n");
            }
        }

        if !modified.is_empty() {
            md.push_str("### Modified\n\n");
            for file in &modified {
                md.push_str(&format!("**{}**\n", file.file_path));
                if !file.public_symbols.is_empty() {
                    md.push_str("```\n");
                    for sym in file.public_symbols.iter().take(10) {
                        md.push_str(&format!("{}\n", sym.signature));
                    }
                    if file.public_symbols.len() > 10 {
                        md.push_str(&format!("... and {} more symbols\n", file.public_symbols.len() - 10));
                    }
                    md.push_str("```\n");
                }
                md.push_str("\n");
            }
        }

        // Current State
        md.push_str("## Current State\n\n");
        md.push_str(&format!("- Files created: {}\n", created.len()));
        md.push_str(&format!("- Files modified: {}\n", modified.len()));
        md.push_str(&format!("- Sessions processed: {}\n", input.raw_intent.session_count));
        md.push_str(&format!("- Total public symbols: {}\n",
            input.artifacts.files.iter().map(|f| f.public_symbols.len()).sum::<usize>()));

        if !input.raw_intent.has_sufficient_data() {
            md.push_str("\n**Note:** Insufficient data for documentation. Consider adding a CLAUDE.md file or selecting sessions with more user interaction.\n");
        }

        md.push_str(&format!(
            "\n---\n*Generated from {} sessions, {} files (AI unavailable - showing raw data)*\n",
            input.session_count, input.artifacts.total_files
        ));

        md
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::docs::artifacts::{ArtifactExtractor, ChangeType, ArtifactIndex};

    fn create_test_input() -> WriterInput {
        let artifacts = vec![
            ArtifactExtractor::create_artifact(
                "src/auth.ts".to_string(),
                "export function login() {}".to_string(),
                ChangeType::Created,
            ),
        ];

        WriterInput {
            project_name: "test-project".to_string(),
            audience: "engineer".to_string(),
            raw_intent: RawIntentData::new(
                Some("# Test Project\n\nA test project for authentication.".to_string()),
                vec!["I want to implement user login.".to_string()],
                1,
            ),
            artifacts: ArtifactIndex::new(artifacts),
            session_count: 1,
        }
    }

    #[test]
    fn test_fallback_output() {
        let input = create_test_input();
        let output = DocumentationWriter::write_without_ai(input);

        assert!(output.markdown.contains("test-project"));
        assert!(output.markdown.contains("Test Project"));
        assert!(output.markdown.contains("implement user login"));
        assert!(!output.ai_generated);
    }

    #[test]
    fn test_fallback_no_data() {
        let input = WriterInput {
            project_name: "unknown".to_string(),
            audience: "engineer".to_string(),
            raw_intent: RawIntentData::new(None, vec![], 0),
            artifacts: ArtifactIndex::new(vec![]),
            session_count: 0,
        };

        let output = DocumentationWriter::write_without_ai(input);

        assert!(output.markdown.contains("No CLAUDE.md found"));
        assert!(output.markdown.contains("Insufficient data"));
    }

    #[test]
    fn test_writer_input_serialization() {
        let input = create_test_input();
        let json = input.to_json().unwrap();

        assert!(json.contains("project_name"));
        assert!(json.contains("raw_intent"));
        assert!(json.contains("artifacts"));
    }
}
