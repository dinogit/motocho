/**
 * Analytics service commands
 *
 * Reads and processes statistics from ~/.claude/stats-cache.json
 * Calculates cost metrics and usage summaries
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;

// ============================================================================
// Type Definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyActivity {
    pub date: String,
    pub message_count: i32,
    pub session_count: i32,
    pub tool_call_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyModelTokens {
    pub date: String,
    pub tokens_by_model: HashMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelUsage {
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_read_input_tokens: i64,
    pub cache_creation_input_tokens: i64,
    pub web_search_requests: i32,
    pub cost_usd: f64,
    pub context_window: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LongestSession {
    pub session_id: String,
    pub duration: i64,
    pub message_count: i32,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsCache {
    pub version: i32,
    pub last_computed_date: String,
    pub daily_activity: Vec<DailyActivity>,
    pub daily_model_tokens: Vec<DailyModelTokens>,
    pub model_usage: HashMap<String, ModelUsage>,
    pub total_sessions: i32,
    pub total_messages: i32,
    pub longest_session: LongestSession,
    pub first_session_date: String,
    pub hour_counts: HashMap<String, i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsSummary {
    pub total_sessions: i32,
    pub total_messages: i32,
    pub total_tool_calls: i32,
    pub total_tokens: i64,
    pub total_cost: f64,
    pub average_messages_per_session: i32,
    pub average_tokens_per_day: i64,
    pub most_active_hour: i32,
    pub days_active: i32,
    pub first_session_date: String,
    pub last_active_date: String,
}

// ============================================================================
// Pricing Configuration
// ============================================================================

struct ModelPricing {
    input: f64,
    output: f64,
    cache_write: f64,
    cache_read: f64,
}

fn get_model_pricing(model_id: &str) -> ModelPricing {
    match model_id {
        "claude-opus-4-5-20251101" => ModelPricing {
            input: 5.0,
            output: 25.0,
            cache_write: 6.25,
            cache_read: 0.5,
        },
        "claude-sonnet-4-5-20241022" | "claude-sonnet-4-20250514" | "claude-3-5-sonnet-20241022" => {
            ModelPricing {
                input: 3.0,
                output: 15.0,
                cache_write: 3.75,
                cache_read: 0.3,
            }
        }
        "claude-haiku-4-5-20241022" | "claude-3-5-haiku-20241022" => ModelPricing {
            input: 1.0,
            output: 5.0,
            cache_write: 1.25,
            cache_read: 0.1,
        },
        _ => {
            // Default pricing
            ModelPricing {
                input: 3.0,
                output: 15.0,
                cache_write: 3.75,
                cache_read: 0.3,
            }
        }
    }
}

fn calculate_model_cost(model_id: &str, usage: &ModelUsage) -> f64 {
    let pricing = get_model_pricing(model_id);

    let input_cost = (usage.input_tokens as f64 / 1_000_000.0) * pricing.input;
    let output_cost = (usage.output_tokens as f64 / 1_000_000.0) * pricing.output;
    let cache_write_cost =
        (usage.cache_creation_input_tokens as f64 / 1_000_000.0) * pricing.cache_write;
    let cache_read_cost =
        (usage.cache_read_input_tokens as f64 / 1_000_000.0) * pricing.cache_read;

    input_cost + output_cost + cache_write_cost + cache_read_cost
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get raw analytics data from stats-cache.json
#[tauri::command]
pub async fn get_analytics_data() -> Result<StatsCache, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let stats_cache_path = home_dir.join(".claude").join("stats-cache.json");

    let content = fs::read_to_string(&stats_cache_path)
        .await
        .map_err(|e| format!("Failed to read stats-cache.json: {}", e))?;

    let stats: StatsCache = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stats-cache.json: {}", e))?;

    Ok(stats)
}

/// Get computed analytics summary
#[tauri::command]
pub async fn get_analytics_summary() -> Result<AnalyticsSummary, String> {
    let stats = get_analytics_data().await?;

    // Calculate total tool calls
    let total_tool_calls = stats
        .daily_activity
        .iter()
        .map(|d| d.tool_call_count)
        .sum::<i32>();

    // Calculate total tokens and cost from model usage
    let mut total_tokens: i64 = 0;
    let mut total_cost: f64 = 0.0;

    for (model_id, usage) in &stats.model_usage {
        let model_tokens = usage.input_tokens
            + usage.output_tokens
            + usage.cache_read_input_tokens
            + usage.cache_creation_input_tokens;
        total_tokens += model_tokens;
        total_cost += calculate_model_cost(model_id, usage);
    }

    // Find most active hour
    let mut most_active_hour = 0;
    let mut max_hour_count = 0;
    for (hour_str, count) in &stats.hour_counts {
        if *count > max_hour_count {
            max_hour_count = *count;
            most_active_hour = hour_str
                .parse::<i32>()
                .unwrap_or(0);
        }
    }

    let days_active = stats.daily_activity.len() as i32;
    let average_messages_per_session = if stats.total_sessions > 0 {
        stats.total_messages / stats.total_sessions
    } else {
        0
    };
    let average_tokens_per_day = if days_active > 0 {
        total_tokens / days_active as i64
    } else {
        0
    };

    Ok(AnalyticsSummary {
        total_sessions: stats.total_sessions,
        total_messages: stats.total_messages,
        total_tool_calls,
        total_tokens,
        total_cost,
        average_messages_per_session,
        average_tokens_per_day,
        most_active_hour,
        days_active,
        first_session_date: stats.first_session_date,
        last_active_date: stats.last_computed_date,
    })
}
