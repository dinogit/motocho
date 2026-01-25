/**
 * AI Chat service commands
 *
 * Invokes Claude Code CLI to answer questions about transcript content.
 * Uses `claude --print` for non-interactive responses.
 */

use serde::{Deserialize, Serialize};
use std::process::Command;

// ============================================================================
// Type Definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user" or "assistant"
    pub content: String,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Ask Claude CLI a question with context
/// Uses `claude --print` for non-interactive response
#[tauri::command]
pub async fn ask_claude_cli(
    context: String,
    question: String,
    history: Vec<ChatMessage>,
) -> Result<String, String> {
    // Build the prompt with context and conversation history
    let mut prompt = format!(
        "You are helping a user understand content from a Claude Code session transcript.\n\n\
        ## Context (from transcript)\n```\n{}\n```\n\n",
        context
    );

    // Add conversation history if any
    if !history.is_empty() {
        prompt.push_str("## Previous conversation\n");
        for msg in &history {
            let role_label = if msg.role == "user" { "User" } else { "Assistant" };
            prompt.push_str(&format!("{}: {}\n\n", role_label, msg.content));
        }
    }

    // Add the current question
    prompt.push_str(&format!("## Current question\n{}", question));

    // Run claude --print (non-interactive mode)
    let output = Command::new("claude")
        .args(["--print", &prompt])
        .output()
        .map_err(|e| format!("Failed to run claude CLI: {}. Make sure Claude Code is installed.", e))?;

    if output.status.success() {
        let response = String::from_utf8_lossy(&output.stdout).to_string();
        if response.trim().is_empty() {
            Err("Claude returned an empty response".to_string())
        } else {
            Ok(response)
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Claude CLI error: {}", stderr))
    }
}
