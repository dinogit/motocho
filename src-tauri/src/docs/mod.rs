/**
 * Documentation Generator - Intent-First Architecture
 *
 * Stage 1: Raw Data Collection (Rust)
 *   - Input: CLAUDE.md + user messages
 *   - Output: RawIntentData (verbatim, no interpretation)
 *   - Rust does NO keyword matching or pattern extraction
 *
 * Stage 2: Artifact Indexing (Rust, Deterministic)
 *   - Input: session logs
 *   - Output: file_path, change_type, content, public_symbols
 *   - No categorization, no guessing
 *
 * Stage 3: Intent Distillation + Writing (AI ONLY)
 *   - Input: RawIntentData + ArtifactIndex
 *   - AI distills intent from raw data (goals, constraints, scope, decisions)
 *   - AI uses distilled intent as PRIMARY document structure
 *   - Code artifacts serve as EVIDENCE, not drivers
 *
 * HARD SEPARATION:
 *   - Rust: data collection, prompt assembly, fallback output
 *   - AI: ALL interpretation, intent distillation, grouping, prose, structure
 */

pub mod intent;
pub mod artifacts;
pub mod writer;

// Re-export main types
pub use intent::{DataCollector, RawIntentData, read_claude_md};
pub use artifacts::{ArtifactExtractor, ArtifactIndex, FileArtifact, ChangeType, PublicSymbol};
pub use writer::{DocumentationWriter, WriterInput, WriterOutput};
