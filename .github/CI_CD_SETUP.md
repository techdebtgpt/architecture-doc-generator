# GitHub Actions CI/CD Setup Guide

This project uses GitHub Actions for automated testing and publishing.

## Workflows

### 1. PR Check (`.github/workflows/pr-check.yml`)

**Trigger**: On every pull request to `main` or `develop`

**What it does**:
- ✅ Runs tests on Node.js 18.x and 20.x
- ✅ Runs ESLint
- ✅ Builds the project
- ✅ Verifies binary file exists
- ✅ Uploads coverage to Codecov (optional)
- ✅ Runs security audit

**Required secrets**: 
- `CODECOV_TOKEN` (optional, for code coverage)

---

### 2. Release & Publish (`.github/workflows/release.yml`)

**Trigger**: On every push to `main` branch

**What it does**:
1. ✅ Runs all tests
2. ✅ Runs linting
3. ✅ Builds the project
4. 🔢 **Automatically determines version bump** based on commit messages:
   - **Major** (1.0.0 → 2.0.0): `feat!:`, `BREAKING CHANGE:`, or `breaking:`
   - **Minor** (0.1.0 → 0.2.0): `feat:` or `feature:`
   - **Patch** (0.1.0 → 0.1.1): `fix:`, `chore:`, `docs:`, `refactor:`, etc.
5. 📦 Bumps version in `package.json`
6. 🏷️ Creates git tag
7. 🚀 Publishes to npm
8. 📝 Creates GitHub release

**Required secrets**:
- `NPM_TOKEN` (required for npm publishing)

---

## Setup Instructions

### Step 1: Add npm Token to GitHub Secrets

1. **Generate npm access token**:
   ```bash
   npm login
   npm token create --read-only=false
   ```
   Or use existing token: `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`

2. **Add to GitHub**:
   - Go to: `https://github.com/techdebtgpt/architecture-doc-generator/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token (starts with `npm_...`)
   - Click "Add secret"

### Step 2: Add Codecov Token (Optional)

1. **Sign up at**: https://codecov.io/
2. **Add repository**: techdebtgpt/architecture-doc-generator
3. **Get token** from Codecov dashboard
4. **Add to GitHub**:
   - Name: `CODECOV_TOKEN`
   - Value: Your Codecov token

### Step 3: Test the Workflows

#### Test PR Check:
```bash
# Create a test branch
git checkout -b test/ci-workflow

# Make a small change
echo "# Test" >> test-file.md
git add test-file.md
git commit -m "test: verify CI workflow"

# Push and create PR
git push origin test/ci-workflow
# Then create PR on GitHub
```

#### Test Release Workflow:
```bash
# Make sure you're on main
git checkout main

# Make a change with conventional commit
git commit --allow-empty -m "feat: test automated release workflow"
git push origin main

# Watch GitHub Actions tab for automatic release
```

---

## Commit Message Convention

Use **Conventional Commits** format for automatic version bumping:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types that trigger releases:

| Type | Bump | Example |
|------|------|---------|
| `feat!:` or `BREAKING CHANGE:` | **Major** (1.0.0 → 2.0.0) | `feat!: change API interface` |
| `feat:` | **Minor** (0.1.0 → 0.2.0) | `feat: add new agent` |
| `fix:` | **Patch** (0.1.0 → 0.1.1) | `fix: correct token counting` |
| `chore:` | **Patch** | `chore: update dependencies` |
| `docs:` | **Patch** | `docs: update README` |
| `refactor:` | **Patch** | `refactor: improve error handling` |
| `perf:` | **Patch** | `perf: optimize agent execution` |
| `test:` | **Patch** | `test: add unit tests` |

### Examples:

**Major version bump (breaking changes)**:
```bash
git commit -m "feat!: change agent interface signature

BREAKING CHANGE: Agent.execute() now requires AgentExecutionOptions parameter"
```

**Minor version bump (new features)**:
```bash
git commit -m "feat: add security analyzer agent

- Detects authentication vulnerabilities
- Identifies hardcoded secrets
- Analyzes API security"
```

**Patch version bump (bug fixes)**:
```bash
git commit -m "fix: resolve empty file generation issue

- Skip empty markdown files
- Add proper data checks before writing"
```

---

## Skip CI

To push without triggering workflows:
```bash
git commit -m "docs: update README [skip ci]"
```

---

## Workflow Status Badges

Add to your README.md:

```markdown
![PR Check](https://github.com/techdebtgpt/architecture-doc-generator/workflows/PR%20Check/badge.svg)
![Release](https://github.com/techdebtgpt/architecture-doc-generator/workflows/Release%20&%20Publish/badge.svg)
[![npm version](https://badge.fury.io/js/@techdebtgpt%2Farchdoc-generator.svg)](https://www.npmjs.com/package/@techdebtgpt/archdoc-generator)
[![codecov](https://codecov.io/gh/techdebtgpt/architecture-doc-generator/branch/main/graph/badge.svg)](https://codecov.io/gh/techdebtgpt/architecture-doc-generator)
```

---

## Troubleshooting

### Release workflow not running
- Check commit message follows conventional commits format
- Ensure you're pushing to `main` branch
- Verify `NPM_TOKEN` secret is set correctly

### npm publish fails
- Verify token has publish permissions: `npm token list`
- Check token hasn't expired
- Ensure package name isn't already taken

### Version conflict
- Manual version bumps will conflict with automated releases
- Always let CI handle versioning
- If needed, use `[skip ci]` for manual version changes

### Tests fail in CI but pass locally
- Ensure `NODE_ENV` is not set to production in CI
- Check for missing environment variables
- Verify all dependencies are in `package.json` (not global installs)

---

## Manual Release (Emergency)

If automated release fails:

```bash
# 1. Bump version manually
npm version patch  # or minor/major

# 2. Push with tags
git push origin main --follow-tags

# 3. Publish to npm
npm publish --access public

# 4. Create GitHub release manually
# Go to: https://github.com/techdebtgpt/architecture-doc-generator/releases/new
```

---

## Next Steps

1. ✅ Add `NPM_TOKEN` secret to GitHub
2. ✅ Test PR workflow with a test branch
3. ✅ Test release workflow with a commit to main
4. ✅ Add status badges to README
5. ⏭️ Consider adding:
   - Automated changelog generation
   - Slack/Discord notifications
   - Performance benchmarks
   - E2E tests against real projects
