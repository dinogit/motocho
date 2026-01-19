#!/bin/bash
set -e

# Release script for Claude Code Dashboard
# Usage: ./release.sh <version>
# Example: ./release.sh 0.2.0

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Error: Version number required"
  echo "Usage: ./release.sh <version>"
  echo "Example: ./release.sh 0.2.0"
  exit 1
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: Must be on main branch to release. Current branch: $CURRENT_BRANCH"
  exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean. Commit or stash changes first."
  git status --short
  exit 1
fi

echo "🚀 Preparing release v$VERSION..."

# Update version in tauri.conf.json
echo "📝 Updating version in tauri.conf.json..."
jq --arg version "$VERSION" '.version = $version' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json

# Update version in Cargo.toml
echo "📝 Updating version in Cargo.toml..."
sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
rm src-tauri/Cargo.toml.bak

# Commit version bump
echo "💾 Committing version bump..."
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to $VERSION"

# Create and push tag
echo "🏷️  Creating tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"

echo ""
echo "✅ Release prepared!"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git log -1"
echo "  2. Push to GitHub: git push origin main --tags"
echo ""
echo "This will trigger the GitHub Actions workflow to:"
echo "  - Build macOS (universal) and Windows (x64) installers"
echo "  - Create a GitHub release with the installers attached"
echo ""