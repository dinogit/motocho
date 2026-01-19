# Release Process

This project uses GitHub Actions to automatically build and release the desktop app.

## How to Create a Release

### Option 1: Use the Release Script (Recommended)

```bash
./release.sh 0.2.0
```

This will:
1. ✅ Check you're on `main` branch
2. ✅ Ensure working directory is clean
3. ✅ Update version in `tauri.conf.json` and `Cargo.toml`
4. ✅ Commit the version bump
5. ✅ Create a git tag `v0.2.0`

Then push to trigger the release:
```bash
git push origin main --tags
```

### Option 2: Manual Process

1. **Update version numbers:**
   ```bash
   # Edit src-tauri/tauri.conf.json
   "version": "0.2.0"

   # Edit src-tauri/Cargo.toml
   version = "0.2.0"
   ```

2. **Commit and tag:**
   ```bash
   git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
   git commit -m "chore: bump version to 0.2.0"
   git tag -a v0.2.0 -m "Release v0.2.0"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main --tags
   ```

## What Happens Next

When you push a version tag (e.g., `v0.2.0`), GitHub Actions will:

1. **Build for multiple platforms:**
   - macOS: Universal binary (Intel + Apple Silicon)
   - Windows: x64 installer

2. **Create installers:**
   - macOS: `.dmg` file
   - Windows: `.msi` installer

3. **Create GitHub Release:**
   - Release title: "Claude Code Dashboard v0.2.0"
   - Installers attached as downloadable assets
   - Automatically published (not a draft)

## Monitoring the Release

1. Go to **Actions** tab in GitHub
2. Click on the running workflow
3. Monitor the build progress for each platform
4. When complete, find the release under **Releases**

## Versioning

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version (1.0.0): Breaking changes
- **MINOR** version (0.2.0): New features, backwards compatible
- **PATCH** version (0.1.1): Bug fixes

## Code Signing (Optional)

For production releases, consider adding code signing:

### macOS
- Add `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` secrets
- Update workflow with signing configuration

### Windows
- Add `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD` secrets
- Update workflow with signing configuration

See [Tauri documentation](https://v2.tauri.app/distribute/sign/) for details.

## Troubleshooting

**Build fails?**
- Check the Actions logs for errors
- Ensure version numbers match in `tauri.conf.json` and `Cargo.toml`
- Verify all dependencies are properly declared

**Release not created?**
- Ensure tag starts with `v` (e.g., `v0.2.0`, not `0.2.0`)
- Check GitHub Actions has `write` permissions for releases
- Verify `GITHUB_TOKEN` is available (it's automatic)