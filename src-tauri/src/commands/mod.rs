/**
 * Command modules for Tauri backend
 * Each module exports Tauri commands for a specific service
 */

pub mod fs_utils;
pub mod analytics;
pub mod history;
pub mod transcripts;
pub mod plans;
pub mod files;
pub mod mcp;
pub mod skills;
pub mod ai_chat;
pub mod settings;
pub mod library;
pub mod agents;
pub mod commands;

// Re-export all commands
pub use fs_utils::*;
pub use analytics::*;
pub use history::*;
pub use transcripts::*;
pub use plans::*;
pub use files::*;
pub use mcp::*;
pub use skills::*;
pub use ai_chat::*;
pub use settings::*;
pub use library::*;
pub use agents::*;
pub use commands::*;
