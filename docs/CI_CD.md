# CI/CD Automation Guide

This project uses GitHub Actions for automated testing, building, and publishing to npm.

## Overview

Two automated workflows handle the entire CI/CD pipeline:

1. **PR Check Workflow** - Validates all pull requests
2. **Release Workflow** - Automatically versions and publishes on merge to main

---

## Workflows

### 1. PR Check (`.github/workflows/pr-check.yml`)

**Trigger**: Every pull request to `main` or `develop`

**Purpose**: Ensure code quality before merging

**Steps**:

- ✅ Runs tests on Node.js 18.x and 20.x (matrix testing)
- ✅ Runs ESLint linting
- ✅ Builds the project
- ✅ Verifies binary file exists (`dist/cli/index.js`)
- ✅ Uploads coverage to Codecov (optional)
- ✅ Runs security audit (`npm audit`)

**Result**: PR is blocked from merging if any check fails

---

### 2. Release & Publish (`.github/workflows/release.yml`)

**Trigger**: Every push to `main` branch (except commits with `[skip ci]`)

**Purpose**: Automatically version, tag, and publish releases

**Steps**:

1. **Test & Build**
   - Runs all tests
   - Runs linting
   - Builds the project

2. **Determine Version Bump**
   - Analyzes commit messages since last tag
   - Uses Conventional Commits format to determine bump type:
     - `feat!:` or `BREAKING CHANGE:` → **Major** (1.0.0 → 2.0.0)
     - `feat:` or `feature:` → **Minor** (0.1.0 → 0.2.0)
     - `fix:`, `chore:`, `docs:`, `refactor:` → **Patch** (0.1.0 → 0.1.1)

3. **Bump Version**
   - Updates `package.json` version
   - Creates git commit: `chore(release): bump version to X.Y.Z [skip ci]`
   - Creates git tag

4. **Publish**
   - Publishes to npm registry with `--access public`
   - Creates GitHub Release with auto-generated notes

5. **Push Changes**
   - Pushes version bump commit and tag to repository

---

## Setup Instructions

### Required: Add npm Token

1. **Get your npm token**:

   ```bash
   npm login
   npm token create
   ```

   Or use existing token if you have one.

2. **Add to GitHub Secrets**:
   - Navigate to: `https://github.com/YOUR_ORG/architecture-doc-generator/settings/secrets/actions`
   - Click **"New repository secret"**
   - Name: `NPM_TOKEN`
   - Value: Your npm token (starts with `npm_...`)
   - Click **"Add secret"**

### Optional: Add Codecov Token

For code coverage reporting:

1. Sign up at [codecov.io](https://codecov.io/)
2. Add your repository
3. Get token from Codecov dashboard
4. Add to GitHub Secrets:
   - Name: `CODECOV_TOKEN`
   - Value: Your Codecov token

---

## Commit Message Convention

Use **Conventional Commits** format for automatic version detection.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type                           | Version Bump | Example                             |
| ------------------------------ | ------------ | ----------------------------------- |
| `feat!:` or `BREAKING CHANGE:` | **Major**    | `feat!: redesign API interface`     |
| `feat:` or `feature:`          | **Minor**    | `feat: add security analyzer agent` |
| `fix:` or `bugfix:`            | **Patch**    | `fix: resolve token counting issue` |
| `chore:`                       | **Patch**    | `chore: update dependencies`        |
| `docs:`                        | **Patch**    | `docs: update user guide`           |
| `refactor:`                    | **Patch**    | `refactor: improve error handling`  |
| `perf:`                        | **Patch**    | `perf: optimize agent execution`    |
| `test:`                        | **Patch**    | `test: add unit tests for scanner`  |
| `style:`                       | **Patch**    | `style: format code with prettier`  |

### Examples

**Major Version Bump (Breaking Changes)**:

```bash
git commit -m "feat!: change agent interface signature

BREAKING CHANGE: Agent.execute() now requires AgentExecutionOptions parameter.
Update all agent implementations accordingly."
```

**Minor Version Bump (New Features)**:

```bash
git commit -m "feat: add security analyzer agent

- Detects authentication vulnerabilities
- Identifies hardcoded secrets
- Analyzes API security patterns
- Supports 8+ languages"
```

**Patch Version Bump (Bug Fixes)**:

```bash
git commit -m "fix: resolve empty file generation issue

- Skip generating empty markdown files
- Add data validation before file write
- Update multi-file formatter logic"
```

**Patch Version Bump (Documentation)**:

```bash
git commit -m "docs: add CI/CD automation guide

Consolidate setup instructions into single docs/CI_CD.md file"
```

---

## Skip CI Execution

To push commits without triggering workflows:

```bash
git commit -m "chore: update config [skip ci]"
git push origin main
```

The `[skip ci]` flag in the commit message prevents both workflows from running.

---

## Testing Workflows

### Test PR Check Workflow

1. Create a feature branch:

   ```bash
   git checkout -b test/ci-workflow
   ```

2. Make a change:

   ```bash
   echo "# Test CI" >> test.md
   git add test.md
   git commit -m "test: verify PR check workflow"
   ```

3. Push and create PR:

   ```bash
   git push origin test/ci-workflow
   ```

4. Open GitHub and create a pull request from `test/ci-workflow` to `main`

5. Watch the **Checks** tab on the PR to see tests, linting, and build run

### Test Release Workflow

1. Ensure you're on main:

   ```bash
   git checkout main
   git pull origin main
   ```

2. Make a change with conventional commit:

   ```bash
   git commit --allow-empty -m "feat: test automated release"
   git push origin main
   ```

3. Watch GitHub Actions:
   - Go to **Actions** tab in GitHub
   - See "Release & Publish" workflow running
   - Verify version bump (should go from 0.1.0 → 0.1.1)
   - Check npm: `npm view @techdebtgpt/archdoc-generator`
   - Check Releases: See new GitHub release created

---

## Workflow Status Badges

Add these badges to your `README.md`:

```markdown
![PR Check](https://github.com/techdebtgpt/architecture-doc-generator/workflows/PR%20Check/badge.svg)
![Release](https://github.com/techdebtgpt/architecture-doc-generator/workflows/Release%20&%20Publish/badge.svg)
[![npm version](https://badge.fury.io/js/@techdebtgpt%2Farchdoc-generator.svg)](https://www.npmjs.com/package/@techdebtgpt/archdoc-generator)
[![codecov](https://codecov.io/gh/techdebtgpt/architecture-doc-generator/branch/main/graph/badge.svg)](https://codecov.io/gh/techdebtgpt/architecture-doc-generator)
```

---

## Troubleshooting

### Release workflow not running

- **Check**: Commit message follows conventional commits format
- **Check**: You're pushing to `main` branch (not a feature branch)
- **Check**: Commit doesn't contain `[skip ci]`
- **Check**: `NPM_TOKEN` secret is set correctly in GitHub

### npm publish fails with 401/403

- **Verify**: Token has publish permissions: `npm token list`
- **Check**: Token hasn't expired (check expiration date)
- **Ensure**: You're logged in as correct user: `npm whoami`
- **Verify**: Organization exists and you have access

### Version conflict / already published

- Manual version bumps conflict with automated releases
- **Solution**: Always let CI handle versioning
- **Never**: Run `npm version` manually
- If you need to skip: Use `[skip ci]` in commit message

### Tests pass locally but fail in CI

- **Check**: `NODE_ENV` is not set to production in CI
- **Verify**: All dependencies are in `package.json` (not global installs)
- **Ensure**: No local `.env` files affecting tests
- **Check**: Node version matches (CI uses 18.x and 20.x)

### Build fails: "dist/ is ignored"

- **Cause**: `dist/` is in `.gitignore` (correct behavior)
- **Solution**: Ensure `package.json` has no `version` or `postversion` scripts
- **Note**: CI builds fresh `dist/` folder during workflow

---

## Manual Release (Emergency)

If automated release fails and you need to publish manually:

```bash
# 1. Ensure you're on main with latest code
git checkout main
git pull origin main

# 2. Bump version manually
npm version patch  # or minor/major

# 3. Build the project
npm run build

# 4. Publish to npm
npm publish --access public

# 5. Push version bump and tag
git push origin main --follow-tags

# 6. Create GitHub release manually
# Navigate to: https://github.com/YOUR_ORG/architecture-doc-generator/releases/new
# - Tag: Select the version tag you just created
# - Title: "Release vX.Y.Z"
# - Description: Add release notes
# - Click "Publish release"
```

---

## Future Enhancements

Consider adding these features to your CI/CD pipeline:

- **Automated Changelog**: Generate `CHANGELOG.md` from conventional commits
- **Notifications**: Slack/Discord notifications on release
- **Performance Benchmarks**: Track performance metrics over time
- **E2E Tests**: Test against real projects in CI
- **Dependency Updates**: Automated Dependabot PRs
- **Security Scanning**: CodeQL, Snyk, or similar tools
- **Pre-release Channels**: Beta/alpha releases for testing

---

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing Guide](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
