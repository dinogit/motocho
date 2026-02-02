/**
 * Evidence Reduction Layer
 *
 * Responsibility: Reduce code to proof, not payload.
 *
 * Extracts:
 * - Function signatures
 * - Public APIs
 * - Critical diffs
 * - Representative snippets only
 *
 * NEVER sends full files unless explicitly required.
 * This layer ensures token efficiency while preserving meaning.
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Evidence Types
// ============================================================================

/// A single piece of code evidence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeEvidence {
    /// The type of evidence
    pub evidence_type: EvidenceType,
    /// The extracted content (signature, snippet, etc.)
    pub content: String,
    /// Source file path
    pub source_file: String,
    /// Line number range (if applicable)
    pub line_range: Option<(usize, usize)>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EvidenceType {
    /// Function/method signature
    Signature,
    /// Type or interface definition
    TypeDefinition,
    /// Export statement
    Export,
    /// Configuration snippet
    Config,
    /// Representative usage example
    UsageExample,
    /// Public API surface
    PublicApi,
    /// Import statement (for dependency tracking)
    Import,
}

/// Collection of evidence for a file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEvidence {
    pub path: String,
    pub file_type: FileType,
    pub evidence: Vec<CodeEvidence>,
    /// Detected language
    pub language: String,
    /// Total lines in original file
    pub total_lines: usize,
    /// Lines of evidence extracted
    pub evidence_lines: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileType {
    Source,
    Config,
    Style,
    Documentation,
    Test,
}

/// Complete evidence set for documentation generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceSet {
    pub files: Vec<FileEvidence>,
    /// Aggregated public API
    pub public_api: Vec<CodeEvidence>,
    /// Key type definitions
    pub types: Vec<CodeEvidence>,
    /// Configuration evidence
    pub configs: Vec<CodeEvidence>,
    /// Reduction ratio (evidence_lines / total_lines)
    pub reduction_ratio: f32,
}

impl EvidenceSet {
    pub fn new() -> Self {
        Self {
            files: Vec::new(),
            public_api: Vec::new(),
            types: Vec::new(),
            configs: Vec::new(),
            reduction_ratio: 0.0,
        }
    }

    /// Calculate reduction statistics
    pub fn calculate_reduction(&mut self) {
        let total: usize = self.files.iter().map(|f| f.total_lines).sum();
        let evidence: usize = self.files.iter().map(|f| f.evidence_lines).sum();

        self.reduction_ratio = if total > 0 {
            evidence as f32 / total as f32
        } else {
            0.0
        };
    }
}

// ============================================================================
// Evidence Extractor
// ============================================================================

pub struct EvidenceExtractor;

impl EvidenceExtractor {
    /// Extract evidence from a file's content
    pub fn extract(path: &str, content: &str) -> FileEvidence {
        let language = Self::detect_language(path);
        let file_type = Self::classify_file_type(path);
        let lines: Vec<&str> = content.lines().collect();
        let total_lines = lines.len();

        let evidence = match language.as_str() {
            "typescript" | "javascript" => Self::extract_js_ts(&lines),
            "rust" => Self::extract_rust(&lines),
            "python" => Self::extract_python(&lines),
            "json" | "yaml" | "toml" => Self::extract_config(&lines, &language),
            _ => Self::extract_generic(&lines),
        };

        let evidence_lines: usize = evidence.iter().map(|e| {
            e.line_range.map(|(start, end)| end - start + 1).unwrap_or(1)
        }).sum();

        FileEvidence {
            path: path.to_string(),
            file_type,
            evidence,
            language,
            total_lines,
            evidence_lines,
        }
    }

    /// Detect language from file extension
    fn detect_language(path: &str) -> String {
        let ext = path.rsplit('.').next().unwrap_or("");
        match ext {
            "ts" | "tsx" => "typescript".to_string(),
            "js" | "jsx" => "javascript".to_string(),
            "rs" => "rust".to_string(),
            "py" => "python".to_string(),
            "json" => "json".to_string(),
            "yaml" | "yml" => "yaml".to_string(),
            "toml" => "toml".to_string(),
            "css" | "scss" => "css".to_string(),
            "md" | "mdx" => "markdown".to_string(),
            _ => "unknown".to_string(),
        }
    }

    /// Classify file type from path
    fn classify_file_type(path: &str) -> FileType {
        let path_lower = path.to_lowercase();

        if path_lower.contains(".test.") || path_lower.contains(".spec.") || path_lower.contains("__tests__") {
            FileType::Test
        } else if path_lower.ends_with(".md") || path_lower.contains("readme") {
            FileType::Documentation
        } else if path_lower.ends_with(".css") || path_lower.ends_with(".scss") {
            FileType::Style
        } else if path_lower.ends_with(".json") || path_lower.ends_with(".yaml") || path_lower.ends_with(".toml")
            || path_lower.contains("config")
        {
            FileType::Config
        } else {
            FileType::Source
        }
    }

    /// Extract evidence from TypeScript/JavaScript
    fn extract_js_ts(lines: &[&str]) -> Vec<CodeEvidence> {
        let mut evidence = Vec::new();
        let content = lines.join("\n");

        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();

            // Export statements
            if trimmed.starts_with("export ") {
                if trimmed.contains("function ") || trimmed.contains("const ") || trimmed.contains("class ") {
                    // Find the signature (up to opening brace or =)
                    let signature = Self::extract_signature(trimmed);
                    evidence.push(CodeEvidence {
                        evidence_type: EvidenceType::Export,
                        content: signature,
                        source_file: String::new(), // Filled in by caller
                        line_range: Some((i + 1, i + 1)),
                    });
                }
            }

            // Interface/Type definitions
            if trimmed.starts_with("interface ") || trimmed.starts_with("type ") || trimmed.starts_with("export interface") || trimmed.starts_with("export type") {
                // Extract the full type definition (may span multiple lines)
                let type_def = Self::extract_type_definition(lines, i);
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::TypeDefinition,
                    content: type_def.0,
                    source_file: String::new(),
                    line_range: Some((i + 1, type_def.1)),
                });
            }

            // Function declarations (not exports)
            if (trimmed.starts_with("function ") || trimmed.starts_with("async function "))
                && !trimmed.starts_with("export")
            {
                let signature = Self::extract_signature(trimmed);
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::Signature,
                    content: signature,
                    source_file: String::new(),
                    line_range: Some((i + 1, i + 1)),
                });
            }

            // React component detection (capitalized function returning JSX)
            if trimmed.starts_with("export function ") || trimmed.starts_with("export const ") {
                if let Some(name) = Self::extract_component_name(trimmed) {
                    if name.chars().next().map(|c| c.is_uppercase()).unwrap_or(false) {
                        evidence.push(CodeEvidence {
                            evidence_type: EvidenceType::PublicApi,
                            content: format!("React Component: {}", name),
                            source_file: String::new(),
                            line_range: Some((i + 1, i + 1)),
                        });
                    }
                }
            }

            // Imports (for dependency tracking)
            if trimmed.starts_with("import ") && trimmed.contains("from") {
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::Import,
                    content: trimmed.to_string(),
                    source_file: String::new(),
                    line_range: Some((i + 1, i + 1)),
                });
            }
        }

        // Deduplicate by content
        evidence.dedup_by(|a, b| a.content == b.content);
        evidence
    }

    /// Extract evidence from Rust
    fn extract_rust(lines: &[&str]) -> Vec<CodeEvidence> {
        let mut evidence = Vec::new();

        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();

            // Public functions
            if trimmed.starts_with("pub fn ") || trimmed.starts_with("pub async fn ") {
                let signature = Self::extract_rust_signature(trimmed);
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::Signature,
                    content: signature,
                    source_file: String::new(),
                    line_range: Some((i + 1, i + 1)),
                });
            }

            // Struct definitions
            if trimmed.starts_with("pub struct ") || trimmed.starts_with("#[derive") {
                if trimmed.starts_with("pub struct ") {
                    let struct_def = Self::extract_rust_struct(lines, i);
                    evidence.push(CodeEvidence {
                        evidence_type: EvidenceType::TypeDefinition,
                        content: struct_def.0,
                        source_file: String::new(),
                        line_range: Some((i + 1, struct_def.1)),
                    });
                }
            }

            // Enum definitions
            if trimmed.starts_with("pub enum ") {
                let enum_def = Self::extract_rust_struct(lines, i);
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::TypeDefinition,
                    content: enum_def.0,
                    source_file: String::new(),
                    line_range: Some((i + 1, enum_def.1)),
                });
            }

            // Tauri commands
            if trimmed.contains("#[tauri::command]") {
                if let Some(next_line) = lines.get(i + 1) {
                    let signature = Self::extract_rust_signature(next_line.trim());
                    evidence.push(CodeEvidence {
                        evidence_type: EvidenceType::PublicApi,
                        content: format!("Tauri Command: {}", signature),
                        source_file: String::new(),
                        line_range: Some((i + 1, i + 2)),
                    });
                }
            }

            // Use statements (for dependency tracking)
            if trimmed.starts_with("use ") && !trimmed.starts_with("use super") && !trimmed.starts_with("use self") {
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::Import,
                    content: trimmed.to_string(),
                    source_file: String::new(),
                    line_range: Some((i + 1, i + 1)),
                });
            }
        }

        evidence.dedup_by(|a, b| a.content == b.content);
        evidence
    }

    /// Extract evidence from Python
    fn extract_python(lines: &[&str]) -> Vec<CodeEvidence> {
        let mut evidence = Vec::new();

        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();

            // Function definitions
            if trimmed.starts_with("def ") || trimmed.starts_with("async def ") {
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::Signature,
                    content: trimmed.trim_end_matches(':').to_string(),
                    source_file: String::new(),
                    line_range: Some((i + 1, i + 1)),
                });
            }

            // Class definitions
            if trimmed.starts_with("class ") {
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::TypeDefinition,
                    content: trimmed.trim_end_matches(':').to_string(),
                    source_file: String::new(),
                    line_range: Some((i + 1, i + 1)),
                });
            }

            // Imports
            if trimmed.starts_with("import ") || trimmed.starts_with("from ") {
                evidence.push(CodeEvidence {
                    evidence_type: EvidenceType::Import,
                    content: trimmed.to_string(),
                    source_file: String::new(),
                    line_range: Some((i + 1, i + 1)),
                });
            }
        }

        evidence.dedup_by(|a, b| a.content == b.content);
        evidence
    }

    /// Extract evidence from config files
    fn extract_config(lines: &[&str], language: &str) -> Vec<CodeEvidence> {
        let mut evidence = Vec::new();

        // For config files, take first N lines as representative
        let preview_lines = lines.iter().take(20).cloned().collect::<Vec<_>>().join("\n");

        evidence.push(CodeEvidence {
            evidence_type: EvidenceType::Config,
            content: preview_lines,
            source_file: String::new(),
            line_range: Some((1, lines.len().min(20))),
        });

        evidence
    }

    /// Generic extraction for unknown file types
    fn extract_generic(lines: &[&str]) -> Vec<CodeEvidence> {
        let mut evidence = Vec::new();

        // Take first 10 lines as sample
        let preview = lines.iter().take(10).cloned().collect::<Vec<_>>().join("\n");

        if !preview.trim().is_empty() {
            evidence.push(CodeEvidence {
                evidence_type: EvidenceType::UsageExample,
                content: preview,
                source_file: String::new(),
                line_range: Some((1, lines.len().min(10))),
            });
        }

        evidence
    }

    // ========================================================================
    // Helper functions
    // ========================================================================

    /// Extract function signature (up to opening brace or arrow)
    /// Preserves full function signature including parameters
    fn extract_signature(line: &str) -> String {
        let trimmed = line.trim();

        // For function declarations, find the end of params and return type
        if let Some(brace_pos) = trimmed.find('{') {
            return trimmed[..brace_pos].trim().to_string();
        }

        // For arrow functions: const foo = (params) => { or const foo = (params): ReturnType =>
        if let Some(arrow_pos) = trimmed.find("=>") {
            // Include up to the arrow
            return trimmed[..arrow_pos + 2].trim().to_string();
        }

        // For const declarations with type annotations: export const foo: Type = ...
        if let Some(eq_pos) = trimmed.find(" = ") {
            let pre_eq = &trimmed[..eq_pos];
            // If it has a type annotation, keep it
            if pre_eq.contains(':') {
                return pre_eq.trim().to_string();
            }
        }

        // For single-line function declarations without braces
        // export async function foo(params): ReturnType
        trimmed.to_string()
    }

    /// Extract Rust function signature
    fn extract_rust_signature(line: &str) -> String {
        if let Some(brace_pos) = line.find('{') {
            line[..brace_pos].trim().to_string()
        } else if let Some(where_pos) = line.find(" where ") {
            line[..where_pos].trim().to_string()
        } else {
            line.trim().to_string()
        }
    }

    /// Extract component name from export statement
    fn extract_component_name(line: &str) -> Option<String> {
        // export function ComponentName or export const ComponentName
        let parts: Vec<&str> = line.split_whitespace().collect();
        for (i, part) in parts.iter().enumerate() {
            if *part == "function" || *part == "const" {
                if let Some(name) = parts.get(i + 1) {
                    // Remove any generic parameters or parentheses
                    let clean_name = name.split('<').next()?.split('(').next()?.split(':').next()?;
                    return Some(clean_name.to_string());
                }
            }
        }
        None
    }

    /// Extract full type definition (may span multiple lines)
    fn extract_type_definition(lines: &[&str], start: usize) -> (String, usize) {
        let mut result = String::new();
        let mut brace_count = 0;
        let mut end_line = start;

        for (i, line) in lines.iter().enumerate().skip(start) {
            result.push_str(line);
            result.push('\n');

            brace_count += line.matches('{').count() as i32;
            brace_count -= line.matches('}').count() as i32;

            end_line = i + 1;

            // Stop at closing brace or semicolon for simple types
            if brace_count <= 0 || (brace_count == 0 && line.contains(';')) {
                break;
            }

            // Limit to 20 lines max
            if i - start > 20 {
                result.push_str("  // ... truncated\n}");
                break;
            }
        }

        (result.trim().to_string(), end_line)
    }

    /// Extract Rust struct/enum definition
    fn extract_rust_struct(lines: &[&str], start: usize) -> (String, usize) {
        let mut result = String::new();
        let mut brace_count = 0;
        let mut end_line = start;
        let mut started = false;

        // Check for derive macro above
        if start > 0 {
            let prev = lines[start - 1].trim();
            if prev.starts_with("#[derive") || prev.starts_with("#[serde") {
                result.push_str(prev);
                result.push('\n');
            }
        }

        for (i, line) in lines.iter().enumerate().skip(start) {
            result.push_str(line);
            result.push('\n');

            if line.contains('{') {
                started = true;
            }

            brace_count += line.matches('{').count() as i32;
            brace_count -= line.matches('}').count() as i32;

            end_line = i + 1;

            if started && brace_count <= 0 {
                break;
            }

            // Limit to 30 lines max
            if i - start > 30 {
                result.push_str("    // ... truncated\n}");
                break;
            }
        }

        (result.trim().to_string(), end_line)
    }
}

// ============================================================================
// Evidence Aggregator
// ============================================================================

/// Aggregates evidence from multiple files into a cohesive set
pub struct EvidenceAggregator;

impl EvidenceAggregator {
    /// Build an evidence set from extracted file evidence
    pub fn aggregate(file_evidence: Vec<FileEvidence>) -> EvidenceSet {
        let mut set = EvidenceSet::new();

        for mut fe in file_evidence {
            // Fill in source file for all evidence
            for ev in &mut fe.evidence {
                ev.source_file = fe.path.clone();
            }

            // Categorize evidence
            for ev in &fe.evidence {
                match ev.evidence_type {
                    EvidenceType::Export | EvidenceType::PublicApi | EvidenceType::Signature => {
                        set.public_api.push(ev.clone());
                    }
                    EvidenceType::TypeDefinition => {
                        set.types.push(ev.clone());
                    }
                    EvidenceType::Config => {
                        set.configs.push(ev.clone());
                    }
                    _ => {}
                }
            }

            set.files.push(fe);
        }

        set.calculate_reduction();
        set
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_typescript_extraction() {
        let content = r#"
import { useState } from 'react'

export interface UserProps {
    name: string
    age: number
}

export function UserCard({ name, age }: UserProps) {
    return <div>{name}</div>
}

export const useUser = (id: string) => {
    const [user, setUser] = useState(null)
    return user
}
"#;

        let evidence = EvidenceExtractor::extract("src/components/UserCard.tsx", content);

        assert_eq!(evidence.language, "typescript");
        assert_eq!(evidence.file_type, FileType::Source);
        assert!(!evidence.evidence.is_empty());

        // Should have exports, types, and imports
        let has_export = evidence.evidence.iter().any(|e| e.evidence_type == EvidenceType::Export);
        let has_type = evidence.evidence.iter().any(|e| e.evidence_type == EvidenceType::TypeDefinition);
        let has_import = evidence.evidence.iter().any(|e| e.evidence_type == EvidenceType::Import);

        assert!(has_export, "Should extract exports");
        assert!(has_type, "Should extract type definitions");
        assert!(has_import, "Should extract imports");
    }

    #[test]
    fn test_rust_extraction() {
        let content = r#"
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct User {
    pub name: String,
    pub age: u32,
}

pub fn create_user(name: &str) -> User {
    User { name: name.to_string(), age: 0 }
}

#[tauri::command]
pub async fn get_user(id: String) -> Result<User, String> {
    Ok(User { name: id, age: 0 })
}
"#;

        let evidence = EvidenceExtractor::extract("src/models/user.rs", content);

        assert_eq!(evidence.language, "rust");

        let has_struct = evidence.evidence.iter().any(|e| {
            e.evidence_type == EvidenceType::TypeDefinition && e.content.contains("pub struct User")
        });
        let has_command = evidence.evidence.iter().any(|e| {
            e.evidence_type == EvidenceType::PublicApi && e.content.contains("Tauri Command")
        });

        assert!(has_struct, "Should extract struct definition");
        assert!(has_command, "Should extract Tauri command");
    }

    #[test]
    fn test_reduction_ratio() {
        let content = "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10";
        let evidence = EvidenceExtractor::extract("file.txt", content);

        // Generic extraction takes first 10 lines
        assert_eq!(evidence.total_lines, 10);
        assert!(evidence.evidence_lines <= evidence.total_lines);
    }

    #[test]
    fn test_file_type_classification() {
        assert_eq!(EvidenceExtractor::classify_file_type("src/test.spec.ts"), FileType::Test);
        assert_eq!(EvidenceExtractor::classify_file_type("README.md"), FileType::Documentation);
        assert_eq!(EvidenceExtractor::classify_file_type("styles.css"), FileType::Style);
        assert_eq!(EvidenceExtractor::classify_file_type("config.json"), FileType::Config);
        assert_eq!(EvidenceExtractor::classify_file_type("src/app.tsx"), FileType::Source);
    }
}
