mod commands;

use commands::{
    fs_utils::*, analytics::*, history::*, transcripts::*, plans::*, files::*, mcp::*,
    skills::*, ai_chat::*, settings::*, library::*, agents::*, commands::*, plugins::*, reports::*,
    auth::*,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      // File system utilities
      read_file,
      write_file,
      read_file_bytes,
      get_file_stat,
      read_dir,
      file_exists,
      create_dir,
      delete_file,
      delete_dir,
      copy_file,
      rename_file,
      read_jsonl,
      read_jsonl_paginated,
      // Path operations
      get_home_dir,
      path_join,
      path_dirname,
      path_basename,
      path_normalize,
      // Analytics commands
      get_analytics_data,
      get_analytics_summary,
      // History commands
      get_history,
      search_history,
      get_history_stats,
      get_history_projects,
      // Transcripts commands
      get_projects,
      get_project_sessions,
      get_session_details,
      get_session_paginated,
      get_project_stats,
      delete_session,
      get_agent_transcript,
      // Plans commands
      get_plans,
      get_plan_by_id,
      // Files commands
      get_all_file_changes,
      get_file_history_stats,
      get_file_histories,
      get_sessions_with_file_changes,
      get_session_file_changes,
      get_file_change_by_hash,
      // MCP commands
      get_mcp_data,
      check_server_status,
      toggle_mcp_server,
      add_mcp_server,
      copy_mcp_to_project,
      get_all_projects,
      // Skills commands
      get_skills_data,
      copy_skill,
      delete_skill_file,
      toggle_skill,
      get_project_skills_cmd,
      bulk_copy,
      // AI Chat commands
      ask_claude_cli,
      // Settings commands
      get_settings_data,
      update_global_settings,
      update_project_settings,
      set_model,
      toggle_thinking,
      clear_model,
      // Library commands
      save_skill,
      list_skills,
      get_skill,
      delete_skill,
      get_library_tags,
      // Agents commands
      get_agents_data,
      get_agent_by_name,
      update_agent,
      // Commands
      get_commands_data,
      // Plugins commands
      get_plugins_data,
      get_plugin_details,
      // Reports commands
      generate_report,
      save_report,
      // Auth commands
      get_auth_status,
      trigger_claude_login,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
