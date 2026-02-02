/**
 * Stage 2: Artifact Indexing (DETERMINISTIC, NO AI)
 *
 * Input: session logs
 *
 * Output:
 *   - file_path
 *   - change_type (created | modified)
 *   - full latest file content
 *   - extracted public symbols (full function/component signatures)
 *
 * RULES:
 *   - No categorization
 *   - No guessing
 *   - No inference
 *   - Pure data extraction only
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Artifact Types
// ============================================================================

/// How a file was changed
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChangeType {
    Created,
    Modified,
}

/// A public symbol extracted from code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicSymbol {
    /// Full signature (not truncated)
    pub signature: String,
    /// Symbol type for reference
    pub symbol_type: SymbolType,
    /// Line number in file
    pub line: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SymbolType {
    Function,
    AsyncFunction,
    Component,
    Class,
    Interface,
    Type,
    Enum,
    Struct,
    Const,
    Export,
    TauriCommand,
}

/// A single file artifact
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileArtifact {
    /// Full file path
    pub file_path: String,
    /// How the file was changed
    pub change_type: ChangeType,
    /// Full file content (latest version)
    pub content: String,
    /// Extracted public symbols
    pub public_symbols: Vec<PublicSymbol>,
    /// File extension
    pub extension: String,
    /// Line count
    pub line_count: usize,
}

/// Complete artifact index for documentation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactIndex {
    /// All file artifacts
    pub files: Vec<FileArtifact>,
    /// Total files
    pub total_files: usize,
    /// Files by extension (for reference)
    pub by_extension: HashMap<String, usize>,
}

impl ArtifactIndex {
    pub fn new(files: Vec<FileArtifact>) -> Self {
        let total_files = files.len();
        let mut by_extension: HashMap<String, usize> = HashMap::new();

        for file in &files {
            *by_extension.entry(file.extension.clone()).or_insert(0) += 1;
        }

        Self {
            files,
            total_files,
            by_extension,
        }
    }

    /// Serialize to JSON
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

// ============================================================================
// Artifact Extractor
// ============================================================================

pub struct ArtifactExtractor;

impl ArtifactExtractor {
    /// Create a file artifact from path and content
    pub fn create_artifact(path: String, content: String, change_type: ChangeType) -> FileArtifact {
        let extension = Self::get_extension(&path);
        let line_count = content.lines().count();
        let public_symbols = Self::extract_public_symbols(&content, &extension);

        FileArtifact {
            file_path: path,
            change_type,
            content,
            public_symbols,
            extension,
            line_count,
        }
    }

    /// Get file extension
    fn get_extension(path: &str) -> String {
        path.rsplit('.')
            .next()
            .unwrap_or("")
            .to_lowercase()
    }

    /// Extract public symbols from file content
    /// This is DETERMINISTIC - no AI, no guessing
    fn extract_public_symbols(content: &str, extension: &str) -> Vec<PublicSymbol> {
        match extension {
            "ts" | "tsx" | "js" | "jsx" => Self::extract_js_ts_symbols(content),
            "rs" => Self::extract_rust_symbols(content),
            "py" => Self::extract_python_symbols(content),
            _ => Vec::new(),
        }
    }

    /// Extract symbols from TypeScript/JavaScript
    fn extract_js_ts_symbols(content: &str) -> Vec<PublicSymbol> {
        let mut symbols = Vec::new();
        let lines: Vec<&str> = content.lines().collect();

        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();
            let line_num = i + 1;

            // Export function
            if trimmed.starts_with("export function ") || trimmed.starts_with("export async function ") {
                let signature = Self::extract_full_js_signature(&lines, i);
                let is_async = trimmed.contains("async ");
                symbols.push(PublicSymbol {
                    signature,
                    symbol_type: if is_async { SymbolType::AsyncFunction } else { SymbolType::Function },
                    line: line_num,
                });
            }
            // Export const (could be component or value)
            else if trimmed.starts_with("export const ") {
                let signature = Self::extract_const_signature(trimmed);
                let is_component = Self::looks_like_component(&signature);
                symbols.push(PublicSymbol {
                    signature,
                    symbol_type: if is_component { SymbolType::Component } else { SymbolType::Const },
                    line: line_num,
                });
            }
            // Export class
            else if trimmed.starts_with("export class ") {
                let signature = Self::extract_class_signature(trimmed);
                symbols.push(PublicSymbol {
                    signature,
                    symbol_type: SymbolType::Class,
                    line: line_num,
                });
            }
            // Export interface
            else if trimmed.starts_with("export interface ") {
                let signature = Self::extract_interface_signature(&lines, i);
                symbols.push(PublicSymbol {
                    signature,
                    symbol_type: SymbolType::Interface,
                    line: line_num,
                });
            }
            // Export type
            else if trimmed.starts_with("export type ") {
                let signature = Self::extract_type_signature(&lines, i);
                symbols.push(PublicSymbol {
                    signature,
                    symbol_type: SymbolType::Type,
                    line: line_num,
                });
            }
            // Default export
            else if trimmed.starts_with("export default ") {
                symbols.push(PublicSymbol {
                    signature: trimmed.to_string(),
                    symbol_type: SymbolType::Export,
                    line: line_num,
                });
            }
            // Named export block
            else if trimmed.starts_with("export {") {
                let signature = Self::extract_export_block(&lines, i);
                symbols.push(PublicSymbol {
                    signature,
                    symbol_type: SymbolType::Export,
                    line: line_num,
                });
            }
        }

        symbols
    }

    /// Extract full function signature (handles multi-line)
    fn extract_full_js_signature(lines: &[&str], start: usize) -> String {
        let mut signature = String::new();
        let mut paren_count = 0;
        let mut started_params = false;

        for i in start..lines.len().min(start + 10) {
            let line = lines[i];
            signature.push_str(line.trim());

            for c in line.chars() {
                if c == '(' {
                    started_params = true;
                    paren_count += 1;
                } else if c == ')' {
                    paren_count -= 1;
                }
            }

            // Found complete signature when parens balance and we see return type or brace
            if started_params && paren_count == 0 {
                // Look for return type annotation
                if let Some(brace_pos) = signature.find('{') {
                    return signature[..brace_pos].trim().to_string();
                }
                // If no brace on this line, might have return type
                if i + 1 < lines.len() {
                    let next = lines[i + 1].trim();
                    if next.starts_with('{') || next.starts_with("=>") {
                        return signature.trim().to_string();
                    }
                    if next.starts_with(':') {
                        signature.push(' ');
                        signature.push_str(next);
                        if let Some(brace_pos) = signature.find('{') {
                            return signature[..brace_pos].trim().to_string();
                        }
                    }
                }
                break;
            }

            signature.push(' ');
        }

        // Clean up
        if let Some(brace_pos) = signature.find('{') {
            signature[..brace_pos].trim().to_string()
        } else {
            signature.trim().to_string()
        }
    }

    /// Extract const signature
    fn extract_const_signature(line: &str) -> String {
        // export const Name: Type = ...
        // export const Name = ...
        if let Some(eq_pos) = line.find('=') {
            let before_eq = &line[..eq_pos];
            // Check if there's a type annotation
            before_eq.trim().to_string()
        } else {
            line.to_string()
        }
    }

    /// Check if a const looks like a React component (starts with capital)
    fn looks_like_component(signature: &str) -> bool {
        // export const SomeName
        if let Some(const_pos) = signature.find("const ") {
            let after_const = &signature[const_pos + 6..];
            let name = after_const.split(|c: char| !c.is_alphanumeric() && c != '_').next().unwrap_or("");
            name.chars().next().map(|c| c.is_uppercase()).unwrap_or(false)
        } else {
            false
        }
    }

    /// Extract class signature
    fn extract_class_signature(line: &str) -> String {
        if let Some(brace_pos) = line.find('{') {
            line[..brace_pos].trim().to_string()
        } else {
            line.trim().to_string()
        }
    }

    /// Extract interface signature (may span multiple lines)
    fn extract_interface_signature(lines: &[&str], start: usize) -> String {
        let mut signature = String::new();
        let mut brace_count = 0;

        for i in start..lines.len().min(start + 30) {
            let line = lines[i];
            signature.push_str(line);
            signature.push('\n');

            brace_count += line.matches('{').count() as i32;
            brace_count -= line.matches('}').count() as i32;

            if brace_count <= 0 && i > start {
                break;
            }
        }

        signature.trim().to_string()
    }

    /// Extract type signature
    fn extract_type_signature(lines: &[&str], start: usize) -> String {
        let first_line = lines[start];

        // Simple type on one line
        if first_line.contains('=') && (first_line.ends_with(';') || first_line.contains(" | ") || first_line.contains(" & ")) {
            return first_line.trim().to_string();
        }

        // Multi-line type
        let mut signature = String::new();
        let mut brace_count = 0;
        let mut started = false;

        for i in start..lines.len().min(start + 20) {
            let line = lines[i];
            signature.push_str(line);
            signature.push('\n');

            if line.contains('{') || line.contains('=') {
                started = true;
            }

            brace_count += line.matches('{').count() as i32;
            brace_count -= line.matches('}').count() as i32;

            if started && brace_count <= 0 {
                break;
            }
        }

        signature.trim().to_string()
    }

    /// Extract export block
    fn extract_export_block(lines: &[&str], start: usize) -> String {
        let mut signature = String::new();

        for i in start..lines.len().min(start + 10) {
            let line = lines[i];
            signature.push_str(line.trim());
            signature.push(' ');

            if line.contains('}') {
                break;
            }
        }

        signature.trim().to_string()
    }

    /// Extract symbols from Rust
    fn extract_rust_symbols(content: &str) -> Vec<PublicSymbol> {
        let mut symbols = Vec::new();
        let lines: Vec<&str> = content.lines().collect();
        let mut prev_line_is_tauri_command = false;

        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();
            let line_num = i + 1;

            // Check for Tauri command attribute
            if trimmed.contains("#[tauri::command]") {
                prev_line_is_tauri_command = true;
                continue;
            }

            // Public function
            if trimmed.starts_with("pub fn ") || trimmed.starts_with("pub async fn ") {
                let signature = Self::extract_rust_fn_signature(&lines, i);
                let symbol_type = if prev_line_is_tauri_command {
                    SymbolType::TauriCommand
                } else if trimmed.contains("async ") {
                    SymbolType::AsyncFunction
                } else {
                    SymbolType::Function
                };

                symbols.push(PublicSymbol {
                    signature,
                    symbol_type,
                    line: line_num,
                });
                prev_line_is_tauri_command = false;
            }
            // Public struct
            else if trimmed.starts_with("pub struct ") {
                let signature = Self::extract_rust_struct_signature(&lines, i);
                symbols.push(PublicSymbol {
                    signature,
                    symbol_type: SymbolType::Struct,
                    line: line_num,
                });
                prev_line_is_tauri_command = false;
            }
            // Public enum
            else if trimmed.starts_with("pub enum ") {
                let signature = Self::extract_rust_struct_signature(&lines, i);
                symbols.push(PublicSymbol {
                    signature,
                    symbol_type: SymbolType::Enum,
                    line: line_num,
                });
                prev_line_is_tauri_command = false;
            }
            // Public type alias
            else if trimmed.starts_with("pub type ") {
                symbols.push(PublicSymbol {
                    signature: trimmed.to_string(),
                    symbol_type: SymbolType::Type,
                    line: line_num,
                });
                prev_line_is_tauri_command = false;
            }
            else {
                prev_line_is_tauri_command = false;
            }
        }

        symbols
    }

    /// Extract Rust function signature
    fn extract_rust_fn_signature(lines: &[&str], start: usize) -> String {
        let mut signature = String::new();

        for i in start..lines.len().min(start + 10) {
            let line = lines[i];
            signature.push_str(line.trim());

            if line.contains('{') {
                if let Some(brace_pos) = signature.find('{') {
                    return signature[..brace_pos].trim().to_string();
                }
            }

            if line.trim().ends_with(';') {
                return signature.trim().to_string();
            }

            signature.push(' ');
        }

        signature.trim().to_string()
    }

    /// Extract Rust struct/enum signature
    fn extract_rust_struct_signature(lines: &[&str], start: usize) -> String {
        let mut signature = String::new();
        let mut brace_count = 0;

        // Include derive macros
        if start > 0 {
            let prev = lines[start - 1].trim();
            if prev.starts_with("#[derive") || prev.starts_with("#[serde") {
                signature.push_str(prev);
                signature.push('\n');
            }
        }

        for i in start..lines.len().min(start + 30) {
            let line = lines[i];
            signature.push_str(line);
            signature.push('\n');

            brace_count += line.matches('{').count() as i32;
            brace_count -= line.matches('}').count() as i32;

            if brace_count <= 0 && i > start {
                break;
            }
        }

        signature.trim().to_string()
    }

    /// Extract symbols from Python
    fn extract_python_symbols(content: &str) -> Vec<PublicSymbol> {
        let mut symbols = Vec::new();

        for (i, line) in content.lines().enumerate() {
            let trimmed = line.trim();
            let line_num = i + 1;

            // Function definition (not private)
            if (trimmed.starts_with("def ") || trimmed.starts_with("async def "))
                && !trimmed.contains("def _")
            {
                let is_async = trimmed.starts_with("async ");
                symbols.push(PublicSymbol {
                    signature: trimmed.trim_end_matches(':').to_string(),
                    symbol_type: if is_async { SymbolType::AsyncFunction } else { SymbolType::Function },
                    line: line_num,
                });
            }
            // Class definition
            else if trimmed.starts_with("class ") && !trimmed.contains("class _") {
                symbols.push(PublicSymbol {
                    signature: trimmed.trim_end_matches(':').to_string(),
                    symbol_type: SymbolType::Class,
                    line: line_num,
                });
            }
        }

        symbols
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_typescript_symbol_extraction() {
        let content = r#"
export interface UserProps {
    name: string;
    age: number;
}

export async function fetchUser(id: string): Promise<User> {
    return api.get(`/users/${id}`);
}

export const UserCard: React.FC<UserProps> = ({ name, age }) => {
    return <div>{name}</div>;
};

export type UserId = string | number;
"#;

        let artifact = ArtifactExtractor::create_artifact(
            "src/user.tsx".to_string(),
            content.to_string(),
            ChangeType::Created,
        );

        assert!(!artifact.public_symbols.is_empty());

        let has_interface = artifact.public_symbols.iter()
            .any(|s| s.symbol_type == SymbolType::Interface && s.signature.contains("UserProps"));
        let has_function = artifact.public_symbols.iter()
            .any(|s| s.symbol_type == SymbolType::AsyncFunction && s.signature.contains("fetchUser"));
        let has_component = artifact.public_symbols.iter()
            .any(|s| s.symbol_type == SymbolType::Component && s.signature.contains("UserCard"));

        assert!(has_interface, "Should extract interface");
        assert!(has_function, "Should extract async function");
        assert!(has_component, "Should extract component");
    }

    #[test]
    fn test_rust_symbol_extraction() {
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

        let artifact = ArtifactExtractor::create_artifact(
            "src/user.rs".to_string(),
            content.to_string(),
            ChangeType::Created,
        );

        let has_struct = artifact.public_symbols.iter()
            .any(|s| s.symbol_type == SymbolType::Struct && s.signature.contains("pub struct User"));
        let has_fn = artifact.public_symbols.iter()
            .any(|s| s.symbol_type == SymbolType::Function && s.signature.contains("create_user"));
        let has_tauri = artifact.public_symbols.iter()
            .any(|s| s.symbol_type == SymbolType::TauriCommand && s.signature.contains("get_user"));

        assert!(has_struct, "Should extract struct");
        assert!(has_fn, "Should extract function");
        assert!(has_tauri, "Should extract Tauri command");
    }

    #[test]
    fn test_artifact_index() {
        let artifacts = vec![
            ArtifactExtractor::create_artifact("a.ts".to_string(), "".to_string(), ChangeType::Created),
            ArtifactExtractor::create_artifact("b.ts".to_string(), "".to_string(), ChangeType::Modified),
            ArtifactExtractor::create_artifact("c.rs".to_string(), "".to_string(), ChangeType::Created),
        ];

        let index = ArtifactIndex::new(artifacts);

        assert_eq!(index.total_files, 3);
        assert_eq!(index.by_extension.get("ts"), Some(&2));
        assert_eq!(index.by_extension.get("rs"), Some(&1));
    }
}
