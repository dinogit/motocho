/**
 * AI Chat service commands
 *
 * Handles streaming conversations with Claude via the Anthropic API.
 * Uses Tauri events to stream response chunks back to the frontend.
 */

use serde::{Deserialize, Serialize};
use std::env;

// ============================================================================
// Type Definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user" or "assistant"
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ChatStreamEvent {
    #[serde(rename = "type")]
    pub event_type: String, // "text", "tool_use", "complete", "error"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta: Option<String>,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn get_api_key() -> Result<String, String> {
    env::var("ANTHROPIC_API_KEY").or_else(|_| {
        // Try to read from ~/.claude/config.json
        let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
        let config_path = home.join(".claude").join("config.json");

        if config_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&config_path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(api_key) = json.get("apiKey").and_then(|v| v.as_str()) {
                        return Ok(api_key.to_string());
                    }
                }
            }
        }

        Err("ANTHROPIC_API_KEY not found".to_string())
    })
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Start a chat stream session
/// Streams response via window.emit("chat-stream", event)
/// Note: Requires reqwest HTTP client for API calls
#[tauri::command]
pub async fn start_chat(
    _window: tauri::Window,
    messages: Vec<ChatMessage>,
    context: Option<String>,
    _project_id: Option<String>,
    _session_id: Option<String>,
) -> Result<String, String> {
    // For now, return a placeholder response
    // Full implementation requires reqwest feature and proper streaming setup
    let mut response = "Claude AI responses will stream here via Tauri events.".to_string();

    if let Some(ctx) = context {
        response.push_str("\n\nContext: ");
        response.push_str(&ctx);
    }

    response.push_str(&format!("\n\nReceived {} messages", messages.len()));

    // TODO: Implement actual API streaming once reqwest is available
    // This requires:
    // 1. Adding reqwest to Cargo.toml with streaming feature
    // 2. Reading ANTHROPIC_API_KEY from environment
    // 3. Streaming response chunks via window.emit("chat-stream", event)

    Ok(response)
}

/// Stream completion event (used for manual trigger if needed)
#[tauri::command]
pub async fn emit_chat_complete(
    _window: tauri::Window,
    _content: String,
) -> Result<(), String> {
    // Placeholder implementation
    // TODO: Implement actual event emission once streaming is set up
    Ok(())
}
