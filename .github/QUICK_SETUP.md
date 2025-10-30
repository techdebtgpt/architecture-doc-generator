# Quick Setup Checklist

## ✅ IMMEDIATE: Add NPM Token to GitHub

**Your npm token**: `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`

### Steps:
1. Go to: https://github.com/techdebtgpt/architecture-doc-generator/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `NPM_TOKEN`
4. Value: `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`
5. Click **"Add secret"**

## What Happens Now

### On Pull Request:
- ✅ Runs tests on Node 18.x and 20.x
- ✅ Runs linting
- ✅ Builds project
- ✅ Verifies binary exists
- ❌ Blocks merge if any check fails

### On Merge to Main:
1. ✅ Runs all tests
2. ✅ Builds project
3. 🔢 Analyzes commit messages
4. 📦 Auto-bumps version:
   - `feat!:` or `BREAKING CHANGE:` → **Major** (1.0.0 → 2.0.0)
   - `feat:` → **Minor** (0.1.0 → 0.2.0)
   - `fix:`, `chore:`, `docs:` → **Patch** (0.1.0 → 0.1.1)
5. 🏷️ Creates git tag
6. 🚀 Publishes to npm automatically
7. 📝 Creates GitHub release

## Commit Message Format

**Use conventional commits for automatic versioning:**

```bash
# For new features (minor bump)
git commit -m "feat: add new agent"

# For bug fixes (patch bump)
git commit -m "fix: resolve token counting issue"

# For breaking changes (major bump)
git commit -m "feat!: change API interface

BREAKING CHANGE: Agent interface now requires options parameter"

# For other changes (patch bump)
git commit -m "docs: update README"
git commit -m "chore: update dependencies"
git commit -m "refactor: improve error handling"
```

## Testing the Workflow

### Test 1: Push to main (will trigger release)
```bash
git push origin main
```

This will:
- Detect commit type: `ci: add automated PR checks...` → Patch bump
- Bump version: 0.1.0 → **0.1.1**
- Publish to npm
- Create GitHub release

### Test 2: Create a PR (will run checks only)
```bash
git checkout -b test/workflow
echo "# Test" >> test.md
git add test.md
git commit -m "test: verify PR checks"
git push origin test/workflow
```

Then create PR on GitHub to see checks run.

## Current Status

- ✅ Workflows created
- ✅ Committed to repository
- ⏳ **PENDING**: Add NPM_TOKEN secret
- ⏳ **PENDING**: Push to GitHub
- ⏳ **PENDING**: First automated release

## Next Command

```bash
git push origin main
```

This will trigger the first automated release (0.1.0 → 0.1.1) 🚀
