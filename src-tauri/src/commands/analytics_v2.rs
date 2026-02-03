/**
 * Multi-agent analytics (v2)
 *
 * Aggregates usage across multiple agents (Claude Code + Codex) using a
 * normalized schema and per-source breakdowns.
 */

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use tokio::fs;
use tokio::io::{AsyncBufReadExt, BufReader};

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ActivityCounts {
    pub messages: i32,
    pub tool_calls: i32,
    pub sessions: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyActivity {
    pub date: String,
    pub message_counts: HashMap<String, i32>,
    pub tool_call_counts: HashMap<String, i32>,
    pub session_counts: HashMap<String, i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyTokens {
    pub date: String,
    pub tokens_by_source: HashMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsage {
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_read_input_tokens: i64,
    pub cache_creation_input_tokens: i64,
    pub message_count: i64,
    pub web_search_requests: i32,
    #[serde(rename = "costUSD")]
    pub cost_usd: f64,
    pub context_window: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsageEntry {
    pub source: String,
    pub model_id: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_read_input_tokens: i64,
    pub cache_creation_input_tokens: i64,
    pub message_count: i64,
    pub web_search_requests: i32,
    #[serde(rename = "costUSD")]
    pub cost_usd: f64,
    pub context_window: i32,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsV2 {
    pub summary: AnalyticsSummary,
    pub daily_activity: Vec<DailyActivity>,
    pub hourly_activity: HashMap<String, HashMap<String, i32>>,
    pub daily_tokens: Vec<DailyTokens>,
    pub model_usage: Vec<ModelUsageEntry>,
}

struct SourceStats {
    source: String,
    daily_activity: HashMap<String, ActivityCounts>,
    daily_tokens: HashMap<String, i64>,
    model_usage: HashMap<String, ModelUsage>,
    hour_counts: HashMap<String, i32>,
    total_sessions: i32,
    total_messages: i32,
    total_tool_calls: i32,
    first_session_date: Option<String>,
    last_active_date: Option<String>,
}

// ============================================================================
// Pricing (Claude only)
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
    if !model_id.contains("claude") {
        return 0.0;
    }

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
// Helpers
// ============================================================================

fn update_first_last_date(first: &mut Option<String>, last: &mut Option<String>, date: &str) {
    if first.as_ref().map(|v| date < v.as_str()).unwrap_or(true) {
        *first = Some(date.to_string());
    }
    if last.as_ref().map(|v| date > v.as_str()).unwrap_or(true) {
        *last = Some(date.to_string());
    }
}

fn update_activity(map: &mut HashMap<String, ActivityCounts>, date: &str, messages: i32, tools: i32, sessions: i32) {
    let entry = map.entry(date.to_string()).or_default();
    entry.messages += messages;
    entry.tool_calls += tools;
    entry.sessions += sessions;
}

fn update_daily_tokens(map: &mut HashMap<String, i64>, date: &str, tokens: i64) {
    *map.entry(date.to_string()).or_insert(0) += tokens;
}

// ============================================================================
// Claude Code Stats (from stats-cache or project scan)
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StatsCacheFile {
    version: i32,
    last_computed_date: String,
    daily_activity: Vec<DailyActivityFile>,
    #[serde(default)]
    daily_model_tokens: Vec<DailyModelTokensFile>,
    model_usage: HashMap<String, ModelUsageFile>,
    total_sessions: i32,
    total_messages: i32,
    first_session_date: String,
    hour_counts: HashMap<String, i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DailyActivityFile {
    date: String,
    message_count: i32,
    session_count: i32,
    tool_call_count: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DailyModelTokensFile {
    date: String,
    tokens_by_model: HashMap<String, i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelUsageFile {
    input_tokens: i64,
    output_tokens: i64,
    cache_read_input_tokens: i64,
    cache_creation_input_tokens: i64,
    #[serde(default)]
    web_search_requests: i32,
    #[serde(default)]
    context_window: i32,
}

async fn load_code_stats() -> Result<SourceStats, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let stats_cache_path = home_dir.join(".claude").join("stats-cache.json");

    if stats_cache_path.exists() {
        let content = fs::read_to_string(&stats_cache_path)
            .await
            .map_err(|e| format!("Failed to read stats-cache.json: {}", e))?;
        let stats: StatsCacheFile = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse stats-cache.json: {}", e))?;

        let mut daily_activity = HashMap::new();
        let mut daily_tokens = HashMap::new();
        let mut model_usage = HashMap::new();

        for item in stats.daily_activity {
            update_activity(&mut daily_activity, &item.date, item.message_count, item.tool_call_count, item.session_count);
        }

        for item in stats.daily_model_tokens {
            let total_tokens = item.tokens_by_model.values().sum::<i64>();
            update_daily_tokens(&mut daily_tokens, &item.date, total_tokens);
        }

        for (model, usage) in stats.model_usage {
            let mut entry = ModelUsage {
                input_tokens: usage.input_tokens,
                output_tokens: usage.output_tokens,
                cache_read_input_tokens: usage.cache_read_input_tokens,
                cache_creation_input_tokens: usage.cache_creation_input_tokens,
                message_count: 0,
                web_search_requests: usage.web_search_requests,
                cost_usd: 0.0,
                context_window: usage.context_window,
            };
            entry.cost_usd = calculate_model_cost(&model, &entry);
            model_usage.insert(model, entry);
        }

        let total_tool_calls = daily_activity.values().map(|a| a.tool_calls).sum::<i32>();

        return Ok(SourceStats {
            source: "code".to_string(),
            daily_activity,
            daily_tokens,
            model_usage,
            hour_counts: stats.hour_counts,
            total_sessions: stats.total_sessions,
            total_messages: stats.total_messages,
            total_tool_calls,
            first_session_date: Some(stats.first_session_date),
            last_active_date: Some(stats.last_computed_date),
        });
    }

    aggregate_code_stats_from_projects().await
}

async fn aggregate_code_stats_from_projects() -> Result<SourceStats, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let projects_dir = home_dir.join(".claude").join("projects");

    let mut total_sessions = 0;
    let mut total_messages = 0;
    let mut total_tool_calls = 0;
    let mut model_usage: HashMap<String, ModelUsage> = HashMap::new();
    let mut daily_activity: HashMap<String, ActivityCounts> = HashMap::new();
    let mut daily_tokens: HashMap<String, i64> = HashMap::new();
    let mut hour_counts: HashMap<String, i32> = HashMap::new();
    let mut first_session_date: Option<String> = None;
    let mut last_active_date: Option<String> = None;

    if projects_dir.exists() {
        let mut entries = std::fs::read_dir(projects_dir).map_err(|e| e.to_string())?;
        while let Some(Ok(project_entry)) = entries.next() {
            if project_entry.path().is_dir() {
                let mut session_entries = std::fs::read_dir(project_entry.path()).map_err(|e| e.to_string())?;
                while let Some(Ok(session_entry)) = session_entries.next() {
                    let path = session_entry.path();
                    if !path.extension().map_or(false, |ext| ext == "jsonl") {
                        continue;
                    }

                    total_sessions += 1;
                    let file = fs::File::open(&path).await.map_err(|e| e.to_string())?;
                    let reader = BufReader::new(file);
                    let mut lines = reader.lines();
                    let mut session_first_date: Option<String> = None;

                    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                            let entry_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");
                            if entry_type != "user" && entry_type != "assistant" {
                                continue;
                            }

                            total_messages += 1;

                            if let Some(ts) = val.get("timestamp").and_then(|v| v.as_str()) {
                                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                                    let date = dt.format("%Y-%m-%d").to_string();
                                    let hour = dt.format("%H").to_string();
                                    update_first_last_date(&mut first_session_date, &mut last_active_date, &date);
                                    update_activity(&mut daily_activity, &date, 1, 0, 0);
                                    *hour_counts.entry(hour).or_insert(0) += 1;
                                    if session_first_date.is_none() {
                                        session_first_date = Some(date);
                                    }
                                }
                            }

                            if let Some(message) = val.get("message") {
                                if let Some(model) = message.get("model").and_then(|v| v.as_str()) {
                                    let usage = model_usage.entry(model.to_string()).or_insert_with(ModelUsage::default);
                                    if let Some(u) = message.get("usage") {
                                        let input = u.get("input_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                                        let output = u.get("output_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                                        let cache_read = u.get("cache_read_input_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                                        let cache_creation = u.get("cache_creation_input_tokens").and_then(|v| v.as_i64()).unwrap_or(0);

                                        usage.input_tokens += input;
                                        usage.output_tokens += output;
                                        usage.cache_read_input_tokens += cache_read;
                                        usage.cache_creation_input_tokens += cache_creation;
                                        usage.message_count += 1;
                                        usage.cost_usd = calculate_model_cost(model, usage);

                                        if let Some(ts) = val.get("timestamp").and_then(|v| v.as_str()) {
                                            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                                                let date = dt.format("%Y-%m-%d").to_string();
                                                let total = input + output + cache_read + cache_creation;
                                                update_daily_tokens(&mut daily_tokens, &date, total);
                                            }
                                        }
                                    }
                                }

                                if let Some(content) = message.get("content").and_then(|v| v.as_array()) {
                                    for block in content {
                                        if block.get("type").and_then(|v| v.as_str()) == Some("tool_use") {
                                            if let Some(ts) = val.get("timestamp").and_then(|v| v.as_str()) {
                                                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                                                    let date = dt.format("%Y-%m-%d").to_string();
                                                    update_activity(&mut daily_activity, &date, 0, 1, 0);
                                                    total_tool_calls += 1;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if let Some(date) = session_first_date {
                        update_activity(&mut daily_activity, &date, 0, 0, 1);
                    }
                }
            }
        }
    }

    Ok(SourceStats {
        source: "code".to_string(),
        daily_activity,
        daily_tokens,
        model_usage,
        hour_counts,
        total_sessions,
        total_messages,
        total_tool_calls,
        first_session_date,
        last_active_date,
    })
}

// ============================================================================
// Codex Stats
// ============================================================================

fn get_codex_sessions_dir() -> Result<std::path::PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home_dir.join(".codex").join("sessions"))
}

fn list_codex_session_files(root: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut files = Vec::new();
    let Ok(entries) = std::fs::read_dir(root) else { return files };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            files.extend(list_codex_session_files(&path));
        } else if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
            files.push(path);
        }
    }

    files
}

fn aggregate_codex_stats() -> Result<SourceStats, String> {
    let sessions_dir = get_codex_sessions_dir()?;
    let mut total_sessions = 0;
    let mut total_messages = 0;
    let mut total_tool_calls = 0;
    let mut model_usage: HashMap<String, ModelUsage> = HashMap::new();
    let mut daily_activity: HashMap<String, ActivityCounts> = HashMap::new();
    let mut daily_tokens: HashMap<String, i64> = HashMap::new();
    let mut hour_counts: HashMap<String, i32> = HashMap::new();
    let mut first_session_date: Option<String> = None;
    let mut last_active_date: Option<String> = None;

    if !sessions_dir.exists() {
        return Ok(SourceStats {
            source: "codex".to_string(),
            daily_activity,
            daily_tokens,
            model_usage,
            hour_counts,
            total_sessions: 0,
            total_messages: 0,
            total_tool_calls: 0,
            first_session_date: None,
            last_active_date: None,
        });
    }

    let files = list_codex_session_files(&sessions_dir);
    for file in files {
        total_sessions += 1;
        let content = match std::fs::read_to_string(&file) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut current_model: Option<String> = None;
        let mut session_dates: HashSet<String> = HashSet::new();

        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }
            let Ok(value) = serde_json::from_str::<serde_json::Value>(line) else { continue };
            let entry_type = value.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let timestamp = value.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");

            if entry_type == "turn_context" {
                if let Some(model) = value
                    .get("payload")
                    .and_then(|p| p.get("model"))
                    .and_then(|v| v.as_str())
                {
                    current_model = Some(model.to_string());
                }
                continue;
            }

            if entry_type == "event_msg" {
                let payload = value.get("payload").cloned().unwrap_or(serde_json::Value::Null);
                if payload.get("type").and_then(|v| v.as_str()) == Some("token_count") {
                    let info = payload.get("info").cloned().unwrap_or(serde_json::Value::Null);
                    let last = info.get("last_token_usage").cloned().unwrap_or(serde_json::Value::Null);
                    let input = last.get("input_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                    let cached = last.get("cached_input_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                    let output = last.get("output_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                    let reasoning = last.get("reasoning_output_tokens").and_then(|v| v.as_i64()).unwrap_or(0);
                    let total = last.get("total_tokens").and_then(|v| v.as_i64()).unwrap_or(input + cached + output + reasoning);
                    let context_window = info.get("model_context_window").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

                    let model_id = current_model.clone().unwrap_or_else(|| "codex".to_string());
                    let usage = model_usage.entry(model_id.clone()).or_insert_with(ModelUsage::default);
                    usage.input_tokens += input;
                    usage.output_tokens += output + reasoning;
                    usage.cache_read_input_tokens += cached;
                    usage.context_window = usage.context_window.max(context_window);

                    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(timestamp) {
                        let date = dt.format("%Y-%m-%d").to_string();
                        update_daily_tokens(&mut daily_tokens, &date, total);
                    }
                }
                continue;
            }

            if entry_type != "response_item" {
                continue;
            }

            let payload = value.get("payload").cloned().unwrap_or(serde_json::Value::Null);
            let payload_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let role = payload.get("role").and_then(|v| v.as_str()).unwrap_or("");

            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(timestamp) {
                let date = dt.format("%Y-%m-%d").to_string();
                let hour = dt.format("%H").to_string();
                update_first_last_date(&mut first_session_date, &mut last_active_date, &date);

                if payload_type == "message" {
                    total_messages += 1;
                    update_activity(&mut daily_activity, &date, 1, 0, 0);
                    *hour_counts.entry(hour).or_insert(0) += 1;
                    session_dates.insert(date.clone());

                    if role == "assistant" {
                        let model_id = current_model.clone().unwrap_or_else(|| "codex".to_string());
                        let usage = model_usage.entry(model_id).or_insert_with(ModelUsage::default);
                        usage.message_count += 1;
                    }
                } else if payload_type == "function_call" {
                    update_activity(&mut daily_activity, &date, 0, 1, 0);
                    total_tool_calls += 1;
                }
            }
        }

        for date in session_dates {
            update_activity(&mut daily_activity, &date, 0, 0, 1);
        }
    }

    Ok(SourceStats {
        source: "codex".to_string(),
        daily_activity,
        daily_tokens,
        model_usage,
        hour_counts,
        total_sessions,
        total_messages,
        total_tool_calls,
        first_session_date,
        last_active_date,
    })
}

// ============================================================================
// Merge + Output
// ============================================================================

fn build_analytics(sources: Vec<SourceStats>) -> AnalyticsV2 {
    let mut dates: HashSet<String> = HashSet::new();
    let mut total_sessions = 0;
    let mut total_messages = 0;
    let mut total_tool_calls = 0;
    let mut total_tokens: i64 = 0;
    let mut total_cost: f64 = 0.0;
    let mut first_session_date: Option<String> = None;
    let mut last_active_date: Option<String> = None;
    let mut hour_activity: HashMap<String, HashMap<String, i32>> = HashMap::new();
    let mut model_usage_entries: Vec<ModelUsageEntry> = Vec::new();
    let mut daily_tokens_map: HashMap<String, HashMap<String, i64>> = HashMap::new();
    let mut daily_activity_map: HashMap<String, DailyActivity> = HashMap::new();

    for source in sources {
        total_sessions += source.total_sessions;
        total_messages += source.total_messages;
        total_tool_calls += source.total_tool_calls;

        if let Some(first) = source.first_session_date.as_ref() {
            update_first_last_date(&mut first_session_date, &mut last_active_date, first);
        }
        if let Some(last) = source.last_active_date.as_ref() {
            update_first_last_date(&mut first_session_date, &mut last_active_date, last);
        }

        hour_activity.insert(source.source.clone(), source.hour_counts.clone());

        for (date, counts) in &source.daily_activity {
            dates.insert(date.clone());
            let entry = daily_activity_map.entry(date.clone()).or_insert(DailyActivity {
                date: date.clone(),
                message_counts: HashMap::new(),
                tool_call_counts: HashMap::new(),
                session_counts: HashMap::new(),
            });
            entry.message_counts.insert(source.source.clone(), counts.messages);
            entry.tool_call_counts.insert(source.source.clone(), counts.tool_calls);
            entry.session_counts.insert(source.source.clone(), counts.sessions);
        }

        for (date, tokens) in &source.daily_tokens {
            dates.insert(date.clone());
            let entry = daily_tokens_map.entry(date.clone()).or_insert_with(HashMap::new);
            entry.insert(source.source.clone(), *tokens);
        }

        for (model_id, usage) in source.model_usage {
            let model_tokens = usage.input_tokens
                + usage.output_tokens
                + usage.cache_read_input_tokens
                + usage.cache_creation_input_tokens;
            total_tokens += model_tokens;
            total_cost += usage.cost_usd;
            model_usage_entries.push(ModelUsageEntry {
                source: source.source.clone(),
                model_id: model_id.clone(),
                input_tokens: usage.input_tokens,
                output_tokens: usage.output_tokens,
                cache_read_input_tokens: usage.cache_read_input_tokens,
                cache_creation_input_tokens: usage.cache_creation_input_tokens,
                message_count: usage.message_count,
                web_search_requests: usage.web_search_requests,
                cost_usd: usage.cost_usd,
                context_window: usage.context_window,
            });
        }
    }

    let mut daily_activity: Vec<DailyActivity> = daily_activity_map.into_values().collect();
    daily_activity.sort_by(|a, b| a.date.cmp(&b.date));

    let mut daily_tokens: Vec<DailyTokens> = daily_tokens_map
        .into_iter()
        .map(|(date, tokens_by_source)| DailyTokens { date, tokens_by_source })
        .collect();
    daily_tokens.sort_by(|a, b| a.date.cmp(&b.date));

    model_usage_entries.sort_by(|a, b| {
        let a_tokens = a.input_tokens + a.output_tokens + a.cache_read_input_tokens + a.cache_creation_input_tokens;
        let b_tokens = b.input_tokens + b.output_tokens + b.cache_read_input_tokens + b.cache_creation_input_tokens;
        b_tokens.cmp(&a_tokens)
    });

    let days_active = dates.len() as i32;
    let average_messages_per_session = if total_sessions > 0 {
        total_messages / total_sessions
    } else {
        0
    };
    let average_tokens_per_day = if days_active > 0 {
        total_tokens / days_active as i64
    } else {
        0
    };

    let mut most_active_hour = 0;
    let mut max_hour_count = 0;
    let mut combined_hours: HashMap<String, i32> = HashMap::new();
    for counts in hour_activity.values() {
        for (hour, count) in counts {
            *combined_hours.entry(hour.clone()).or_insert(0) += *count;
        }
    }
    for (hour_str, count) in combined_hours {
        if count > max_hour_count {
            max_hour_count = count;
            most_active_hour = hour_str.parse::<i32>().unwrap_or(0);
        }
    }

    AnalyticsV2 {
        summary: AnalyticsSummary {
            total_sessions,
            total_messages,
            total_tool_calls,
            total_tokens,
            total_cost,
            average_messages_per_session,
            average_tokens_per_day,
            most_active_hour,
            days_active,
            first_session_date: first_session_date.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string()),
            last_active_date: last_active_date.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string()),
        },
        daily_activity,
        hourly_activity: hour_activity,
        daily_tokens,
        model_usage: model_usage_entries,
    }
}

// ============================================================================
// Tauri Command
// ============================================================================

#[tauri::command]
pub async fn get_analytics_v2() -> Result<AnalyticsV2, String> {
    let code = load_code_stats().await?;
    let codex = aggregate_codex_stats()?;
    Ok(build_analytics(vec![code, codex]))
}
