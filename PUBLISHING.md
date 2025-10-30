# Publishing Guide for @archdoc/generator

## Prerequisites

### 1. npm Account Setup

```bash
# Create an npm account if you don't have one
# Visit: https://www.npmjs.com/signup

# Login to npm
npm login
# Enter: username, password, email, 2FA code (if enabled)

# Verify login
npm whoami
```

### 2. Organization Setup (for @archdoc scope)

```bash
# Check if you have access to @archdoc organization
npm access list packages

# If organization doesn't exist, create it:
# Visit: https://www.npmjs.com/org/create
# Or use: npm org add @archdoc <username>
```

## Pre-Publishing Checklist

Run the automated pre-publish check:

```bash
npm run prepublish:check
```

This script verifies:

- [ ] package.json exists and has correct name/version
- [ ] README.md exists
- [ ] LICENSE file exists (Apache-2.0)
- [ ] dist/ directory exists (built artifacts)
- [ ] git working directory is clean
- [ ] npm authentication is valid
- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

Manual checklist:

- [ ] All 7 agents working (file-structure, dependency-analyzer, pattern-detector, flow-visualization, schema-generator, architecture-analyzer, security-analyzer)
- [ ] CHANGELOG.md updated (if you maintain one)
- [ ] Version number bumped appropriately
- [ ] GitHub repo URL is correct in package.json
- [ ] All changes committed to git

## Publishing Process

### Option 1: Manual Publishing (First Time)

```bash
# 1. Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# 2. Run tests and build
npm test
npm run build

# 3. Verify package contents
npm pack --dry-run

# 4. Test install locally (optional but recommended)
npm pack
npm install -g ./archdoc-generator-0.1.0.tgz
archdoc --version
npm uninstall -g @archdoc/generator

# 5. Publish to npm
npm publish --access public

# Note: --access public is required for scoped packages like @archdoc/generator
# Without it, npm will try to publish as private (requires paid plan)

# 6. Verify publication
npm view @archdoc/generator
npm info @archdoc/generator
```

### Option 2: Automated Version Bump & Publish

```bash
# Patch version (0.1.0 → 0.1.1) - bug fixes
npm version patch -m "chore: release v%s"

# Minor version (0.1.0 → 0.2.0) - new features, backward compatible
npm version minor -m "feat: release v%s"

# Major version (0.1.0 → 1.0.0) - breaking changes
npm version major -m "chore: release v%s"

# This will:
# 1. Run prepublishOnly (build, lint, test)
# 2. Update version in package.json
# 3. Create git commit with version tag
# 4. Run postversion (git push + push tags)

# Then publish
npm publish --access public
```

## Post-Publishing

### 1. Verify Installation

```bash
# Test in a new directory
cd /tmp
mkdir test-install
cd test-install
npm install @archdoc/generator
npx archdoc --version
npx archdoc config --init
```

### 2. Create GitHub Release

```bash
# Tag is already created by npm version
# Go to: https://github.com/ritech/architecture-doc-generator/releases/new
# Select the tag (e.g., v0.1.0)
# Add release notes
# Publish release
```

### 3. Update Documentation

- Update installation instructions in README.md
- Add npm badge: `[![npm version](https://badge.fury.io/js/%40archdoc%2Fgenerator.svg)](https://www.npmjs.com/package/@archdoc/generator)`
- Update examples with latest version

## Publishing to Private Repository

Since your GitHub repo is private, you have two options:

### Option A: Make GitHub Repo Public

```bash
# On GitHub:
# Settings → Danger Zone → Change repository visibility → Make public
```

### Option B: Keep Private, Publish to npm Only

The npm package can be public even if GitHub repo is private. Users can:

- Install from npm: `npm install @archdoc/generator`
- Cannot clone or see source code on GitHub (unless granted access)

**Note**: The repository URL in package.json should point to a public repo or be accessible to your users. If keeping GitHub private, consider:

1. Removing repository field from package.json
2. Or pointing to public documentation site
3. Or creating a public mirror repo

## Troubleshooting

### Error: 403 Forbidden

```bash
# You don't have permission to publish
# Solution: Verify npm login and organization access
npm whoami
npm access list packages
```

### Error: Package already exists

```bash
# Package name is taken
# Solution: Change package name in package.json
# Or use a different scope (e.g., @yourcompany/generator)
```

### Error: Need to provide one-time password

```bash
# 2FA is enabled on your npm account
# Solution: Add --otp flag
npm publish --access public --otp=123456
```

### Error: Private packages require a paid subscription

```bash
# Scoped packages default to private
# Solution: Always use --access public flag
npm publish --access public
```

## Version Management Strategy

### Semantic Versioning (SemVer)

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, backward compatible

### Pre-release Versions

```bash
# Alpha release: 0.1.0-alpha.0
npm version prerelease --preid=alpha
npm publish --tag alpha

# Beta release: 0.1.0-beta.0
npm version prerelease --preid=beta
npm publish --tag beta

# Install pre-release
npm install @archdoc/generator@alpha
npm install @archdoc/generator@beta
```

## CI/CD Integration (Future)

For automated publishing via GitHub Actions:

```yaml
# .github/workflows/publish.yml
name: Publish to npm
on:
  release:
    types: [created]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Quick Reference

```bash
# Check current version
npm version

# Check what will be published
npm pack --dry-run

# Publish with 2FA
npm publish --access public --otp=123456

# Unpublish (within 72 hours only!)
npm unpublish @archdoc/generator@0.1.0

# Deprecate a version
npm deprecate @archdoc/generator@0.1.0 "Please upgrade to 0.1.1"

# Check package stats
npm view @archdoc/generator
npm info @archdoc/generator
npm show @archdoc/generator versions
npm show @archdoc/generator time

# View downloads
npx npm-stats @archdoc/generator
```

## Support & Resources

- npm Documentation: https://docs.npmjs.com/
- Semantic Versioning: https://semver.org/
- npm Best Practices: https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry
