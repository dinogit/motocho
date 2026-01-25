/**
 * Claude CLI Authentication commands
 *
 * Handles checking auth status and triggering login flow.
 * Claude CLI stores credentials in macOS Keychain under "Claude Code-credentials".
 */

use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStatus {
    pub authenticated: bool,
    pub email: Option<String>,
    pub plan: Option<String>,
    pub username: Option<String>,
}

/// Check if user is authenticated with Claude CLI
/// Uses macOS `security` command to read from Keychain
#[tauri::command]
pub async fn get_auth_status() -> Result<AuthStatus, String> {
    // Get current username for keychain lookup
    let username = whoami::username();

    // Use security CLI to read from keychain - this respects ACLs and can prompt for access
    let output = Command::new("security")
        .args([
            "find-generic-password",
            "-s", "Claude Code-credentials",
            "-a", &username,
            "-w", // Output only the password
        ])
        .output();

    match output {
        Ok(result) if result.status.success() => {
            let credentials_json = String::from_utf8_lossy(&result.stdout).trim().to_string();

            // Parse the JSON credentials
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&credentials_json) {
                // Extract plan from claudeAiOauth.subscriptionType
                let plan = json.get("claudeAiOauth")
                    .and_then(|o| o.get("subscriptionType"))
                    .and_then(|p| p.as_str())
                    .map(|s| capitalize_first(s));

                return Ok(AuthStatus {
                    authenticated: true,
                    email: None, // Email not accessible via public API
                    plan,
                    username: Some(username.clone()),
                });
            }

            // If we got data but couldn't parse it, still authenticated
            Ok(AuthStatus {
                authenticated: true,
                email: None,
                plan: None,
                username: Some(username.clone()),
            })
        }
        _ => {
            // No credentials in keychain or access denied
            Ok(AuthStatus {
                authenticated: false,
                email: None,
                plan: None,
                username: None,
            })
        }
    }
}

/// Capitalize first letter of a string
fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

/// Trigger Claude login in terminal
#[tauri::command]
pub async fn trigger_claude_login() -> Result<String, String> {
    // Open a terminal window and run claude login
    // This varies by platform

    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args([
                "-e",
                r#"tell application "Terminal"
                    activate
                    do script "claude login"
                end tell"#,
            ])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try common terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xterm"];
        let mut success = false;

        for term in terminals {
            if Command::new(term)
                .args(["--", "claude", "login"])
                .spawn()
                .is_ok()
            {
                success = true;
                break;
            }
        }

        if !success {
            return Err("Could not find a terminal emulator".to_string());
        }
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", "claude login"])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    Ok("Login initiated in terminal".to_string())
}
