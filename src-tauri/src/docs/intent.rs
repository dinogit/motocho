/**
 * Stage 1: Raw Data Collection
 *
 * This module is now a PURE DATA COLLECTOR. It does NOT extract or interpret intent.
 * All intent distillation is done by the AI in the writer stage.
 *
 * Input:
 *   - CLAUDE.md content (if present)
 *   - First N user messages from each selected session (verbatim)
 *
 * Output:
 *   - RawIntentData: raw CLAUDE.md content + raw user messages
 *
 * The AI will:
 *   1. Distill intent from these raw sources (goals, constraints, UX intent, scope)
 *   2. Use distilled intent as the PRIMARY structure for documentation
 *   3. Map code artifacts as EVIDENCE supporting the intent
 *
 * RULES:
 *   - Rust does NO keyword matching or pattern extraction
 *   - Rust does NO categorization or grouping
 *   - All interpretation is deferred to the AI
 */

use serde::{Deserialize, Serialize};
use std::path::Path;

// ============================================================================
// Raw Data Types (No Interpretation)
// ============================================================================

/// Raw data collected from project sources - NO interpretation done here
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawIntentData {
    /// Full CLAUDE.md content (if present)
    pub claude_md_content: Option<String>,
    /// Raw user messages from sessions (verbatim, first N per session)
    pub user_messages: Vec<String>,
    /// Number of sessions processed
    pub session_count: usize,
    /// Whether any data was found
    pub has_data: bool,
}

impl RawIntentData {
    /// Create from collected sources
    pub fn new(
        claude_md_content: Option<String>,
        user_messages: Vec<String>,
        session_count: usize,
    ) -> Self {
        let has_data = claude_md_content.is_some() || !user_messages.is_empty();
        Self {
            claude_md_content,
            user_messages,
            session_count,
            has_data,
        }
    }

    /// Check if we have enough raw data for AI to work with
    pub fn has_sufficient_data(&self) -> bool {
        self.claude_md_content.is_some() || !self.user_messages.is_empty()
    }

    /// Get a summary for logging
    pub fn summary(&self) -> String {
        format!(
            "claude_md={}, messages={}, sessions={}",
            self.claude_md_content.is_some(),
            self.user_messages.len(),
            self.session_count
        )
    }
}

// ============================================================================
// Data Collector (replaces IntentExtractor)
// ============================================================================

pub struct DataCollector;

impl DataCollector {
    /// Collect raw data from sources - NO interpretation
    pub fn collect(
        claude_md_content: Option<String>,
        user_messages: Vec<String>,
        session_count: usize,
    ) -> RawIntentData {
        RawIntentData::new(claude_md_content, user_messages, session_count)
    }
}

// ============================================================================
// CLAUDE.md Reader
// ============================================================================

/// Read CLAUDE.md from a project directory
pub fn read_claude_md(project_cwd: &Path) -> Option<String> {
    let claude_md_path = project_cwd.join("CLAUDE.md");
    if claude_md_path.exists() {
        std::fs::read_to_string(&claude_md_path).ok()
    } else {
        // Try lowercase
        let claude_md_lower = project_cwd.join("claude.md");
        if claude_md_lower.exists() {
            std::fs::read_to_string(&claude_md_lower).ok()
        } else {
            None
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
    fn test_no_data() {
        let data = DataCollector::collect(None, vec![], 0);
        assert!(!data.has_sufficient_data());
        assert!(!data.has_data);
    }

    #[test]
    fn test_claude_md_only() {
        let claude_md = "# Project\n\nThis is a test project.".to_string();
        let data = DataCollector::collect(Some(claude_md.clone()), vec![], 1);

        assert!(data.has_sufficient_data());
        assert!(data.has_data);
        assert_eq!(data.claude_md_content, Some(claude_md));
        assert!(data.user_messages.is_empty());
    }

    #[test]
    fn test_messages_only() {
        let messages = vec![
            "I want to add a new feature for exporting reports.".to_string(),
            "Can you implement dark mode?".to_string(),
        ];

        let data = DataCollector::collect(None, messages.clone(), 1);

        assert!(data.has_sufficient_data());
        assert!(data.has_data);
        assert!(data.claude_md_content.is_none());
        assert_eq!(data.user_messages.len(), 2);
    }

    #[test]
    fn test_both_sources() {
        let claude_md = "# Project\n\nTest project.".to_string();
        let messages = vec!["Add feature X".to_string()];

        let data = DataCollector::collect(Some(claude_md), messages, 2);

        assert!(data.has_sufficient_data());
        assert_eq!(data.session_count, 2);
    }
}
