mod commands;

use commands::fs_utils::*;
use commands::analytics::*;
use commands::history::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
