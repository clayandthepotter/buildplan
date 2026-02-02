# BuildPlan Documentation System

This directory contains all project documentation that is automatically maintained through our CI/CD pipeline.

## 📚 Documentation Structure

### Core Documentation Files

| File | Purpose | Update Frequency | Automation Level |
|------|---------|------------------|------------------|
| **CHANGELOG.md** | Version history and release notes | Every commit to main | Fully automated |
| **API.md** | REST API endpoint documentation | Code changes + manual | Semi-automated |
| **ARCHITECTURE.md** | System architecture and design | Architecture changes | Semi-automated |

### Supporting Documentation

- `../README.md` - Project overview and getting started (root)
- `../WARP.md` - Development log and technical decisions (root)
- `../TODO.md` - Task tracking and project management (root)

---

## 🤖 Auto-Documentation Pipeline

Our GitHub Actions workflow (`.github/workflows/auto-docs.yml`) automatically maintains documentation:

### Automated Updates

#### On Every Push to Main

1. **CHANGELOG.md**
   - Extracts commit messages since last release
   - Updates [Unreleased] section with recent changes
   - Commits and pushes updates

2. **API.md**
   - Updates "Last Updated" timestamp
   - (Future) Extracts endpoints from route files
   - Validates API schema consistency

3. **ARCHITECTURE.md**
   - Detects changes to Prisma schema, TypeScript files, configs
   - Updates metadata and timestamps
   - Generates architecture insights

4. **WARP.md**
   - Appends development log entries
   - Records commit hashes and changed files
   - Creates chronological development history

#### On Every Pull Request

1. **Documentation Validation**
   - Ensures all required docs exist
   - Validates markdown formatting
   - Checks for broken links
   - Scans for TODO/FIXME markers in code

---

## 📝 Manual Documentation Guidelines

### When to Update Manually

**CHANGELOG.md**:
- When creating a new release/version
- To categorize unreleased changes into proper sections (Added, Changed, Fixed, etc.)
- To add migration guides for breaking changes

**API.md**:
- When adding new endpoints (automation will extract from code later)
- When changing request/response schemas
- When updating authentication methods
- To add examples and usage notes

**ARCHITECTURE.md**:
- When making significant architectural decisions
- When adding new services or components
- When changing data models or database design
- When updating infrastructure or deployment strategy

### Documentation Standards

#### Commit Message Convention
For documentation changes:
```
docs: <description>

Examples:
- docs: Update API.md with new authentication endpoint
- docs: Add architecture decision record for queue system
- docs: Release version 0.2.0 in CHANGELOG
```

#### Markdown Guidelines

1. **Headings**: Use ATX-style headers (`#`, `##`, `###`)
2. **Code Blocks**: Always specify language for syntax highlighting
3. **Links**: Use relative paths for internal docs
4. **Examples**: Include real, working examples when possible
5. **Dates**: Use ISO 8601 format (YYYY-MM-DD)

#### Version Numbers

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards-compatible)
- **PATCH**: Bug fixes (backwards-compatible)

---

## 🔄 Workflow Details

### CHANGELOG.md Automation

```yaml
Trigger: Push to main
Process:
1. Extract commits since last tag/release
2. Filter out merge commits
3. Update [Unreleased] section
4. Commit with [skip ci] to prevent loops
```

### API.md Automation

```yaml
Trigger: Push to main
Process:
1. Check for route files in src/routes
2. Extract endpoint definitions (future)
3. Update metadata timestamps
4. Validate schema consistency
```

### ARCHITECTURE.md Automation

```yaml
Trigger: Push to main (with architecture file changes)
Process:
1. Detect changes to:
   - prisma/schema.prisma
   - src/**/*.ts
   - package.json
   - docker files
2. Update timestamp metadata
3. Generate metrics (model count, file count)
```

### WARP.md Automation

```yaml
Trigger: Push to main
Process:
1. Generate log entry with:
   - Commit hash
   - Commit message
   - Changed files list
2. Append to WARP.md before footer
3. Maintain chronological history
```

---

## 🛠️ Local Development

### Previewing Documentation Changes

Before committing, preview your markdown locally:

```bash
# Install markdown preview tool (optional)
npm install -g marked

# Preview a doc file
marked docs/API.md > preview.html
open preview.html
```

### Running Validation Locally

```bash
# Check all docs exist
ls -la README.md docs/CHANGELOG.md docs/API.md docs/ARCHITECTURE.md WARP.md TODO.md

# Validate markdown (basic)
for file in docs/*.md; do
  if [ ! -s "$file" ]; then
    echo "ERROR: $file is empty"
  fi
done
```

### Manual CHANGELOG Release Process

When creating a new release:

1. **Move Unreleased to Versioned Section**:
   ```markdown
   ## [0.2.0] - 2026-02-15
   
   ### Added
   - Authentication system with JWT
   - Organization management
   
   ### Changed
   - Updated database schema for multi-tenancy
   ```

2. **Create Git Tag**:
   ```bash
   git tag -a v0.2.0 -m "Release version 0.2.0"
   git push origin v0.2.0
   ```

3. **Update GitHub Release**:
   - Copy changelog section to GitHub release notes
   - Add any additional context or screenshots

---

## 📋 Documentation Checklist

### Before Each Commit
- [ ] Update relevant documentation if you changed:
  - [ ] API endpoints → API.md
  - [ ] Data models → ARCHITECTURE.md
  - [ ] Architecture decisions → ARCHITECTURE.md
  - [ ] Breaking changes → CHANGELOG.md

### Before Each Release
- [ ] Move [Unreleased] changes to new version section in CHANGELOG.md
- [ ] Update version numbers in:
  - [ ] package.json
  - [ ] API.md header
  - [ ] CHANGELOG.md
- [ ] Create git tag
- [ ] Generate GitHub release with changelog

### Quarterly Review
- [ ] Review and update ARCHITECTURE.md for accuracy
- [ ] Archive old WARP.md entries if too long
- [ ] Update README.md roadmap section
- [ ] Prune completed TODOs from TODO.md

---

## 🔗 Related Resources

- [Keep a Changelog](https://keepachangelog.com/) - Changelog format standard
- [Semantic Versioning](https://semver.org/) - Version numbering standard
- [GitHub Actions](https://docs.github.com/en/actions) - CI/CD documentation
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message standard

---

## 🐛 Troubleshooting

### Automation Not Running

**Problem**: Docs not updating after push to main

**Solutions**:
1. Check GitHub Actions tab for workflow errors
2. Verify `[skip ci]` is not in commit message
3. Ensure workflow file exists at `.github/workflows/auto-docs.yml`
4. Check repository settings → Actions → General → Workflow permissions

### Merge Conflicts in Docs

**Problem**: CHANGELOG.md has merge conflicts

**Solution**:
```bash
# Accept both changes, then manually organize
git checkout --ours docs/CHANGELOG.md  # Keep your version
# or
git checkout --theirs docs/CHANGELOG.md  # Keep their version

# Then manually merge the unreleased sections
```

### Documentation Out of Sync

**Problem**: Docs don't reflect current code

**Solution**:
1. Manually trigger workflow: Actions tab → Auto-Documentation Pipeline → Run workflow
2. Or force update:
   ```bash
   git commit --allow-empty -m "docs: Force documentation update"
   git push
   ```

---

**Last Updated**: 2026-02-02  
**Maintained By**: BuildPlan Team
