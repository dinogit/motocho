/**
 * Work Unit Domain Model and Builder
 *
 * Transforms atomic WorkGroups into semantic WorkUnits representing
 * coherent outcome-level changes with:
 * - Responsibility classification (what capability changed)
 * - Change type classification (feature, refactor, behavior, wiring)
 * - Scope awareness (regions, features affected)
 * - Deterministic summary emission with verb control
 *
 * No AI required. All logic is deterministic and reproducible.
 */

use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};

// ============================================================================
// Domain Types
// ============================================================================

/// What system capability a file is responsible for
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Responsibility {
    StateManagement,  // /context/, /store/, Redux, Zustand patterns
    UIView,           // /page.tsx, /components/, component files
    FormValidation,   // form in path, validation logic
    ApplicationWiring, // /app.tsx, providers, bootstrap
    RegionalLogic,    // Country codes in path (CA/, US/, etc)
    ApiLogic,         // /api/, endpoints, server actions
    Styling,          // CSS, tailwind, theme
    Configuration,    // config files, env, setup
    Testing,          // __tests__, .test., .spec.
    Documentation,    // .md, README
    Utilities,        // /utils/, helpers, shared logic
}

impl Responsibility {
    fn as_str(&self) -> &'static str {
        match self {
            Responsibility::StateManagement => "state management",
            Responsibility::UIView => "UI",
            Responsibility::FormValidation => "form validation",
            Responsibility::ApplicationWiring => "application bootstrap",
            Responsibility::RegionalLogic => "regional logic",
            Responsibility::ApiLogic => "API logic",
            Responsibility::Styling => "styling",
            Responsibility::Configuration => "configuration",
            Responsibility::Testing => "tests",
            Responsibility::Documentation => "documentation",
            Responsibility::Utilities => "utilities",
        }
    }
}

/// The dominant type of change made
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ChangeType {
    /// Structural reorganization without new behavior
    Refactor,
    /// New functionality, routes, exports
    Feature,
    /// Logic changes (conditionals, state transitions)
    Behavior,
    /// Import graph changes, wiring providers
    Wiring,
}

impl ChangeType {
    /// Allowed verbs for this change type
    pub fn allowed_verbs(&self) -> &'static [&'static str] {
        match self {
            ChangeType::Refactor => &["Refactored", "Simplified", "Reorganized"],
            ChangeType::Feature => &["Implemented", "Added", "Introduced"],
            ChangeType::Behavior => &["Corrected", "Enforced", "Altered"],
            ChangeType::Wiring => &["Integrated", "Connected", "Initialized"],
        }
    }

    fn primary_verb(&self) -> &'static str {
        self.allowed_verbs()[0]
    }
}

/// One coherent outcome-level change
/// Aggregates multiple work groups that contribute to the same capability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkUnit {
    /// What this change affects
    pub responsibilities: Vec<Responsibility>,
    /// Type of change made
    pub change_type: ChangeType,
    /// Original work groups that compose this unit
    pub work_groups: Vec<String>, // subject:work_type identifiers
    /// Earliest timestamp
    pub first_timestamp: i64,
    /// Latest timestamp
    pub last_timestamp: i64,
    /// Sessions involved
    pub session_ids: HashSet<String>,
    /// Geographic/feature scope (e.g., ["CA", "US"] or ["auth", "payment"])
    pub scopes: HashSet<String>,
}

impl WorkUnit {
    /// Generate the summary bullet for this work unit
    /// Enforces template: <Verb> <capability> <scope>
    pub fn emit_bullet(&self) -> Option<String> {
        if self.responsibilities.is_empty() {
            return None;
        }

        let verb = self.change_type.primary_verb();
        let primary_responsibility = self.responsibilities[0].as_str();

        let scope_clause = if self.scopes.is_empty() {
            String::new()
        } else if self.scopes.len() == 1 {
            let scope = self.scopes.iter().next().unwrap();
            format!(" in {}", scope)
        } else {
            let mut sorted_scopes: Vec<String> = self.scopes.iter().cloned().collect();
            sorted_scopes.sort();
            format!(" across {}", sorted_scopes.join(" and "))
        };

        Some(format!(
            "{} {}{}",
            verb, primary_responsibility, scope_clause
        ))
    }
}

// ============================================================================
// Responsibility Classifier
// ============================================================================

/// Pure function: classify all responsibilities for a file path
/// A file may have multiple responsibilities
pub fn classify_responsibilities(path: &str) -> Vec<Responsibility> {
    let mut responsibilities = Vec::new();

    // Normalize path
    let path_lower = path.to_lowercase();

    // Check for state management patterns
    if path_lower.contains("context") || path_lower.contains("store") || path_lower.contains("redux")
        || path_lower.contains("zustand")
    {
        responsibilities.push(Responsibility::StateManagement);
    }

    // Check for form validation
    if path_lower.contains("form") && (path_lower.contains("validat") || path_lower.contains("context")) {
        responsibilities.push(Responsibility::FormValidation);
    }

    // Check for UI/view layer
    if path_lower.contains("page.tsx") || path_lower.contains("component") || path_lower.contains("view.tsx")
        || path_lower.contains("layout.tsx")
    {
        responsibilities.push(Responsibility::UIView);
    }

    // Check for application wiring
    if path_lower.contains("app.tsx") || path_lower.contains("provider") || path_lower.contains("bootstrap")
        || path_lower.contains("root.tsx")
    {
        responsibilities.push(Responsibility::ApplicationWiring);
    }

    // Check for regional logic (CA/, US/, etc in path)
    if path.contains("/CA/") || path.contains("/US/") || path.contains("/ca/") || path.contains("/us/")
        || path.contains("/regions/")
    {
        responsibilities.push(Responsibility::RegionalLogic);
    }

    // Check for API logic
    if path_lower.contains("/api/") || path_lower.contains("server-action") || path_lower.contains("route.ts") {
        responsibilities.push(Responsibility::ApiLogic);
    }

    // Check for styling
    if path_lower.ends_with(".css") || path_lower.contains("tailwind") || path_lower.contains("theme")
        || path_lower.contains("style")
    {
        responsibilities.push(Responsibility::Styling);
    }

    // Check for configuration
    if path_lower.contains("config") || path_lower.ends_with(".env") || path_lower.contains("tsconfig")
        || path_lower.contains("next.config")
    {
        responsibilities.push(Responsibility::Configuration);
    }

    // Check for testing
    if path_lower.contains("__tests__") || path_lower.contains(".test.") || path_lower.contains(".spec.") {
        responsibilities.push(Responsibility::Testing);
    }

    // Check for documentation
    if path_lower.ends_with(".md") || path_lower.contains("readme") {
        responsibilities.push(Responsibility::Documentation);
    }

    // Check for utilities/helpers
    if path_lower.contains("/util") || path_lower.contains("/helper") || path_lower.contains("/lib/") {
        responsibilities.push(Responsibility::Utilities);
    }

    // If no specific responsibility detected, classify by extension and path
    if responsibilities.is_empty() {
        if path_lower.ends_with(".tsx") || path_lower.ends_with(".jsx") {
            responsibilities.push(Responsibility::UIView);
        } else if path_lower.ends_with(".ts") || path_lower.ends_with(".js") {
            responsibilities.push(Responsibility::Utilities);
        }
    }

    responsibilities.dedup();
    responsibilities
}

// ============================================================================
// Change Type Classifier
// ============================================================================

/// Infer the dominant change type from work group patterns
/// Uses heuristic signals based on file types and counts
pub fn classify_change_type(subjects: &[&str], work_types: &[&str], file_count: usize) -> ChangeType {
    // If we're adding imports, wiring providers, or modifying app.tsx → Wiring
    if subjects.iter().any(|s| s.contains("app.tsx") || s.contains("provider")) {
        return ChangeType::Wiring;
    }

    // If many files modified, no new files, and subject shows refactoring → Refactor
    let has_created = work_types.contains(&"file_created");
    let total_mods: usize = work_types.iter().filter(|&&t| t == "file_modified").count();

    if !has_created && total_mods > 3 && file_count > 2 {
        return ChangeType::Refactor;
    }

    // If new files or routes created → Feature
    if has_created && file_count > 1 {
        return ChangeType::Feature;
    }

    // If modifying validation, conditional logic → Behavior
    if subjects.iter().any(|s| s.contains("validat") || s.contains("logic") || s.contains("handler")) {
        return ChangeType::Behavior;
    }

    // Default: if most modifications, likely refactor; if few, likely behavior
    if total_mods > 2 {
        ChangeType::Refactor
    } else {
        ChangeType::Behavior
    }
}

// ============================================================================
// Work Unit Builder
// ============================================================================

/// Groups work items into coherent WorkUnits
pub struct WorkUnitBuilder;

impl WorkUnitBuilder {
    /// Build work units from a flat list of work groups
    /// Groups items that:
    /// - Share responsibility overlap
    /// - Are temporally close
    /// - Contribute to same capability
    pub fn build(work_groups: &[super::WorkGroup]) -> Vec<WorkUnit> {
        if work_groups.is_empty() {
            return Vec::new();
        }

        let mut units: Vec<WorkUnit> = Vec::new();

        // Index work groups by responsibility
        let mut by_responsibility: HashMap<Responsibility, Vec<&super::WorkGroup>> = HashMap::new();

        for group in work_groups {
            let responsibilities = classify_responsibilities(&group.subject);

            // For files with no work_type responsibility, skip or handle specially
            if responsibilities.is_empty() {
                continue;
            }

            for resp in responsibilities {
                by_responsibility
                    .entry(resp)
                    .or_default()
                    .push(group);
            }
        }

        // For each responsibility bucket, create work units
        for (responsibility, groups) in by_responsibility {
            // Group by change type to avoid mixing incompatible changes
            let mut by_change_type: HashMap<ChangeType, Vec<&super::WorkGroup>> = HashMap::new();

            for group in groups {
                let subjects: Vec<&str> = vec![&group.subject];
                let work_types: Vec<&str> = vec![&group.work_type];
                let change_type = classify_change_type(&subjects, &work_types, 1);

                by_change_type
                    .entry(change_type)
                    .or_default()
                    .push(group);
            }

            // Create one unit per change type + responsibility
            for (change_type, groups) in by_change_type {
                let mut scopes = HashSet::new();

                // Extract scopes from paths (regions, feature names)
                for group in &groups {
                    extract_scopes(&group.subject, &mut scopes);
                }

                let work_unit = WorkUnit {
                    responsibilities: vec![responsibility],
                    change_type,
                    work_groups: groups.iter().map(|g| format!("{}:{}", g.subject, g.work_type)).collect(),
                    first_timestamp: groups.iter().map(|g| g.first_timestamp).min().unwrap_or(0),
                    last_timestamp: groups.iter().map(|g| g.last_timestamp).max().unwrap_or(0),
                    session_ids: groups.iter().flat_map(|g| g.sessions.clone()).collect(),
                    scopes,
                };

                units.push(work_unit);
            }
        }

        // Deduplicate and merge units with same responsibility + change_type
        units = Self::merge_units(units);

        // Sort by recency
        units.sort_by(|a, b| b.last_timestamp.cmp(&a.last_timestamp));

        units
    }

    /// Merge units with identical responsibility + change_type + primary scope
    fn merge_units(units: Vec<WorkUnit>) -> Vec<WorkUnit> {
        let mut merged: HashMap<(Responsibility, ChangeType, String), WorkUnit> = HashMap::new();

        for unit in units {
            if unit.responsibilities.is_empty() {
                continue;
            }

            let mut scope_key = String::new();
            if !unit.scopes.is_empty() {
                let mut scopes: Vec<String> = unit.scopes.iter().cloned().collect();
                scopes.sort();
                scope_key = scopes[0].clone();
            }
            let key = (unit.responsibilities[0], unit.change_type, scope_key.clone());

            merged
                .entry(key)
                .and_modify(|existing| {
                    existing.work_groups.extend(unit.work_groups.clone());
                    existing.first_timestamp = existing.first_timestamp.min(unit.first_timestamp);
                    existing.last_timestamp = existing.last_timestamp.max(unit.last_timestamp);
                    existing.session_ids.extend(unit.session_ids.clone());
                    if !scope_key.is_empty() {
                        existing.scopes.insert(scope_key.clone());
                    } else {
                        existing.scopes.extend(unit.scopes.clone());
                    }
                })
                .or_insert(unit);
        }

        merged.into_values().collect()
    }
}

/// Extract scope markers from file paths
/// Examples: CA/US from region paths, feature names from directory structure
fn extract_scopes(path: &str, scopes: &mut HashSet<String>) {
    // Region markers
    if path.contains("/CA/") {
        scopes.insert("CA".to_string());
    }
    if path.contains("/US/") {
        scopes.insert("US".to_string());
    }

    let parts: Vec<&str> = path.split('/').collect();
    let denylist = [
        "src", "components", "shared", "lib", "utils", "hooks", "context", "contexts",
        "types", "styles", "assets", "app", "pages", "components", "providers",
    ];

    let mut add_scope = |scope: &str| {
        if scope.is_empty() || scope.contains('.') || denylist.contains(&scope) {
            return;
        }
        scopes.insert(scope.to_string());
    };

    // Prefer explicit feature roots
    for i in 0..parts.len() {
        let part = parts[i];
        if part == "features" || part == "routes" {
            if let Some(next) = parts.get(i + 1) {
                add_scope(next);
                return;
            }
        }
    }

    // Named areas that are meaningful on their own
    for area in ["transcripts", "history", "reports", "docs", "plans", "services"] {
        if parts.iter().any(|p| *p == area) {
            add_scope(area);
            return;
        }
    }

    // Fallback: use the nearest non-generic directory
    if parts.len() >= 2 {
        if let Some(feature) = parts.get(parts.len() - 2) {
            add_scope(feature);
        }
    }
}

// ============================================================================
// Summary Emitter
// ============================================================================

/// Converts WorkUnits into final summary bullets with enforced invariants
pub struct SummaryEmitter;

impl SummaryEmitter {
    /// Emit final summary bullets from work units
    /// Enforces:
    /// - No generic bullets (Updated, Modified, Changed, Adjusted)
    /// - One unit = one bullet
    /// - No duplicate semantic bullets
    /// - Verb matches change type
    pub fn emit(units: &[WorkUnit]) -> Vec<String> {
        let mut bullets: Vec<String> = Vec::new();
        let mut seen_stems: HashSet<String> = HashSet::new();

        for unit in units {
            if let Some(bullet) = unit.emit_bullet() {
                // Check for semantic duplicates (normalized stems)
                let stem = Self::normalize_stem(&bullet);
                if seen_stems.contains(&stem) {
                    continue; // Skip duplicate
                }

                // Verify verb is allowed (safety check)
                let verb = unit.change_type.primary_verb();
                if !bullet.starts_with(verb) {
                    continue; // Reject if verb changed
                }

                // Reject generic bullets
                if Self::is_generic(&bullet) {
                    continue;
                }

                seen_stems.insert(stem);
                bullets.push(bullet);
            }
        }

        // Limit to 15 bullets
        bullets.truncate(15);

        bullets
    }

    /// Normalize a bullet to its semantic stem for dedup detection
    fn normalize_stem(bullet: &str) -> String {
        // Remove verb and lowercasefor comparison
        let parts: Vec<&str> = bullet.split_whitespace().collect();
        if parts.len() > 1 {
            parts[1..].join(" ").to_lowercase()
        } else {
            bullet.to_lowercase()
        }
    }

    /// Check if a bullet is generic/vague (not allowed)
    fn is_generic(bullet: &str) -> bool {
        let lower = bullet.to_lowercase();

        // Banned patterns (structured impossibility)
        lower.contains("updated app")
            || lower.contains("updated application")
            || lower.contains("refactored page")
            || lower.contains("miscellaneous")
            || lower.contains("various")
            || lower.contains("several")
            || lower == "updated"
            || lower == "modified"
            || lower == "changed"
            || lower == "adjusted"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_responsibility_classification() {
        assert!(classify_responsibilities("src/context/auth-context.tsx")
            .contains(&Responsibility::StateManagement));

        assert!(classify_responsibilities("src/features/phone-validation/page.tsx")
            .contains(&Responsibility::UIView));

        assert!(classify_responsibilities("src/CA/context/form-context.tsx")
            .contains(&Responsibility::RegionalLogic));

        assert!(classify_responsibilities("src/app.tsx").contains(&Responsibility::ApplicationWiring));
    }

    #[test]
    fn test_change_type_classification() {
        // Many modifications without creation → Refactor
        assert_eq!(
            classify_change_type(
                &["file1.ts", "file2.ts", "file3.ts", "file4.ts"],
                &["file_modified", "file_modified", "file_modified", "file_modified"],
                4
            ),
            ChangeType::Refactor
        );

        // New file creation → Feature
        assert_eq!(
            classify_change_type(
                &["new-file.tsx", "existing.tsx"],
                &["file_created", "file_modified"],
                2
            ),
            ChangeType::Feature
        );

        // app.tsx → Wiring
        assert_eq!(
            classify_change_type(
                &["src/app.tsx"],
                &["file_modified"],
                1
            ),
            ChangeType::Wiring
        );
    }

    #[test]
    fn test_generic_bullet_rejection() {
        assert!(SummaryEmitter::is_generic("Updated app"));
        assert!(SummaryEmitter::is_generic("Refactored page"));
        assert!(SummaryEmitter::is_generic("Miscellaneous fixes"));
        assert!(!SummaryEmitter::is_generic("Implemented phone validation"));
    }

    #[test]
    fn test_work_unit_bullet_generation() {
        let mut unit = WorkUnit {
            responsibilities: vec![Responsibility::FormValidation],
            change_type: ChangeType::Feature,
            work_groups: vec!["form.tsx:file_modified".to_string()],
            first_timestamp: 0,
            last_timestamp: 1000,
            session_ids: Default::default(),
            scopes: {
                let mut s = HashSet::new();
                s.insert("CA".to_string());
                s.insert("US".to_string());
                s
            },
        };

        let bullet = unit.emit_bullet();
        assert!(bullet.is_some());
        let bullet_str = bullet.unwrap();
        assert!(bullet_str.starts_with("Implemented form validation"));
        assert!(bullet_str.contains("CA"));
        assert!(bullet_str.contains("US"));
    }
}
