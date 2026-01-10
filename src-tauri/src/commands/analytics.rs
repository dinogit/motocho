/**
 * Analytics service commands
 *
 * Reads and processes statistics from ~/.claude/stats-cache.json
 * Calculates cost metrics and usage summaries
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::fs;

// ============================================================================
// Type Definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyActivity {
    pub date: String,
    pub message_count: i32,
    pub session_count: i32,
    pub tool_call_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyModelTokens {
    pub date: String,
    pub tokens_by_model: HashMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsage {
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_read_input_tokens: i64,
    pub cache_creation_input_tokens: i64,
    #[serde(default)]
    pub web_search_requests: i32,
    #[serde(rename = "costUSD")]
    #[serde(default)]
    pub cost_usd: f64,
    #[serde(default)]
    pub context_window: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LongestSession {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub duration: i64,
    pub message_count: i32,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsCache {
    pub version: i32,
    pub last_computed_date: String,
    pub daily_activity: Vec<DailyActivity>,
    #[serde(default)]
    pub daily_model_tokens: Vec<DailyModelTokens>,
    pub model_usage: HashMap<String, ModelUsage>,
    pub total_sessions: i32,
    pub total_messages: i32,
    #[serde(default = "default_longest_session")]
    pub longest_session: LongestSession,
    pub first_session_date: String,
    pub hour_counts: HashMap<String, i32>,
}

fn default_longest_session() -> LongestSession {
    LongestSession {
        session_id: String::new(),
        duration: 0,
        message_count: 0,
        timestamp: String::new(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
        m if m.contains("opus") => ModelPricing {
            input: 15.0,
            output: 75.0,
            cache_write: 18.75,
            cache_read: 1.5,
        },
        m if m.contains("sonnet") => ModelPricing {
            input: 3.0,
            output: 15.0,
            cache_write: 3.75,
            cache_read: 0.3,
        },
        m if m.contains("haiku") => ModelPricing {
            input: 0.25,
            output: 1.25,
            cache_write: 0.3125,
            cache_read: 0.03,
        },
        _ => ModelPricing {
            input: 3.0,
            output: 15.0,
            cache_write: 3.75,
            cache_read: 0.3,
        },
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

async fn aggregate_stats_from_projects() -> Result<StatsCache, String> {
    println!("[Analytics] Aggregating stats from projects...");
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;
    let projects_dir = home_dir.join(".claude").join("projects");

    let mut total_sessions = 0;
    let mut total_messages = 0;
    let mut model_usage: HashMap<String, ModelUsage> = HashMap::new();
    let mut daily_activity: HashMap<String, DailyActivity> = HashMap::new();
    let mut daily_model_tokens: HashMap<String, DailyModelTokens> = HashMap::new();
    let mut hour_counts: HashMap<String, i32> = HashMap::new();
    let mut first_session_date: Option<String> = None;

    if projects_dir.exists() {
        println!("[Analytics] Projects directory exists: {:?}", projects_dir);
        let mut entries = std::fs::read_dir(projects_dir).map_err(|e| e.to_string())?;
        while let Some(Ok(project_entry)) = entries.next() {
            if project_entry.path().is_dir() {
                println!("[Analytics] Processing project: {:?}", project_entry.path());
                let mut session_entries = std::fs::read_dir(project_entry.path()).map_err(|e| e.to_string())?;
                while let Some(Ok(session_entry)) = session_entries.next() {
                    let path = session_entry.path();
                    if path.extension().map_or(false, |ext| ext == "jsonl") {
                        total_sessions += 1;
                        let file = match fs::File::open(&path).await {
                            Ok(f) => f,
                            Err(e) => {
                                println!("[Analytics] Failed to open session file {:?}: {}", path, e);
                                continue;
                            }
                        };
                        let reader = tokio::io::BufReader::new(file);
                        let mut lines = tokio::io::AsyncBufReadExt::lines(reader);

                        while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                                if val.get("type").and_then(|v| v.as_str()) == Some("user") || 
                                   val.get("type").and_then(|v| v.as_str()) == Some("assistant") {
                                    total_messages += 1;

                                    if let Some(ts) = val.get("timestamp").and_then(|v| v.as_str()) {
                                        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                                            let date = dt.format("%Y-%m-%d").to_string();
                                            let hour = dt.format("%H").to_string();
                                            
                                            if first_session_date.is_none() || date < *first_session_date.as_ref().unwrap() {
                                                first_session_date = Some(date.clone());
                                            }

                                            let activity = daily_activity.entry(date.clone()).or_insert(DailyActivity {
                                                date: date.clone(),
                                                message_count: 0,
                                                session_count: 0,
                                                tool_call_count: 0,
                                            });
                                            activity.message_count += 1;
                                            *hour_counts.entry(hour).or_insert(0) += 1;
                                        }
                                    }

                                    if let Some(message) = val.get("message") {
                                        if let Some(model) = message.get("model").and_then(|v| v.as_str()) {
                                            let usage = model_usage.entry(model.to_string()).or_insert(ModelUsage {
                                                input_tokens: 0,
                                                output_tokens: 0,
                                                cache_read_input_tokens: 0,
                                                cache_creation_input_tokens: 0,
                                                web_search_requests: 0,
                                                cost_usd: 0.0,
                                                context_window: 0,
                                            });
                                            
                                            if let Some(u) = message.get("usage") {
                                                let input = u.get("input_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                                                let output = u.get("output_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                                                let cache_read = u.get("cache_read_input_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                                                let cache_creation = u.get("cache_creation_input_tokens").and_then(|v| v.as_i64()).unwrap_or(0);

                                                usage.input_tokens += input;
                                                usage.output_tokens += output;
                                                usage.cache_read_input_tokens += cache_read;
                                                usage.cache_creation_input_tokens += cache_creation;

                                                // Update daily model tokens
                                                if let Some(ts) = val.get("timestamp").and_then(|v| v.as_str()) {
                                                    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                                                        let date = dt.format("%Y-%m-%d").to_string();
                                                        let daily_tokens = daily_model_tokens.entry(date.clone()).or_insert(DailyModelTokens {
                                                            date: date.clone(),
                                                            tokens_by_model: HashMap::new(),
                                                        });
                                                        let model_total = input + output + cache_read + cache_creation;
                                                        *daily_tokens.tokens_by_model.entry(model.to_string()).or_insert(0) += model_total;
                                                    }
                                                }
                                            }
                                        }

                                        if let Some(content) = message.get("content").and_then(|v| v.as_array()) {
                                            for block in content {
                                                if block.get("type").and_then(|v| v.as_str()) == Some("tool_use") {
                                                    // Count tool use in activity
                                                    if let Some(ts) = val.get("timestamp").and_then(|v| v.as_str()) {
                                                        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                                                            let date = dt.format("%Y-%m-%d").to_string();
                                                            if let Some(activity) = daily_activity.get_mut(&date) {
                                                                activity.tool_call_count += 1;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        println!("[Analytics] Stats aggregation complete. Total sessions: {}", total_sessions);
    } else {
        println!("[Analytics] Projects directory NOT found: {:?}", projects_dir);
    }
    let mut daily_activity_vec: Vec<DailyActivity> = daily_activity.into_values().collect();
    daily_activity_vec.sort_by(|a, b| a.date.cmp(&b.date));

    // Convert daily_model_tokens map to sorted vec
    let mut daily_model_tokens_vec: Vec<DailyModelTokens> = daily_model_tokens.into_values().collect();
    daily_model_tokens_vec.sort_by(|a, b| a.date.cmp(&b.date));

    // Calculate costs for model_usage
    for (model_id, usage) in model_usage.iter_mut() {
        usage.cost_usd = calculate_model_cost(model_id, usage);
    }

    Ok(StatsCache {
        version: 1,
        last_computed_date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        daily_activity: daily_activity_vec,
        daily_model_tokens: daily_model_tokens_vec,
        model_usage,
        total_sessions,
        total_messages,
        longest_session: LongestSession {
            session_id: String::new(),
            duration: 0,
            message_count: 0,
            timestamp: String::new(),
        },
        first_session_date: first_session_date.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string()),
        hour_counts,
    })
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

    if !stats_cache_path.exists() {
        return aggregate_stats_from_projects().await;
    }

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
