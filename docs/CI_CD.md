# CI/CD Guide

This guide provides an overview of the automated CI/CD pipeline for the Architecture Doc Generator, which uses GitHub Actions to test, build, and publish the package.

## Workflows

The repository uses two main workflows to automate quality assurance and releases.

### 1. Pull Request Validation

- **Workflow File**: `.github/workflows/pr-check.yml`
- **Trigger**: Runs on every pull request targeting the `main` branch.
- **Purpose**: To ensure that all contributions meet the project's quality standards before being merged.

**Key Steps**:

- **Matrix Testing**: Runs tests across multiple Node.js versions (e.g., 18.x, 20.x).
- **Linting**: Checks the code for style and formatting issues using ESLint.
- **Building**: Compiles the TypeScript code to ensure it builds successfully.
- **Security Audit**: Scans for vulnerabilities in dependencies using `npm audit`.

If any of these checks fail, the pull request is blocked from merging until the issues are resolved.

### 2. Automated Releases

- **Workflow File**: `.github/workflows/release.yml`
- **Trigger**: Runs on every push to the `main` branch.
- **Purpose**: To automate the versioning and publishing process to npm.

**Key Steps**:

1.  **Analyze Commits**: The workflow inspects commit messages since the last release to determine the version bump type (major, minor, or patch) based on the [Conventional Commits](https://www.conventionalcommits.org/) standard.
2.  **Bump Version**: Automatically updates the `package.json` version number.
3.  **Create Git Tag**: Tags the new version in the repository.
4.  **Publish to npm**: Publishes the new version to the npm registry.
5.  **Create GitHub Release**: Creates a corresponding release on GitHub with auto-generated release notes.

## ⚙️ Setup

To enable the automated release workflow, you need to configure the following secrets in your repository settings under `Settings > Secrets and variables > Actions`.

1.  **`PAT_TOKEN`** (Personal Access Token):
    - **Purpose**: Allows the workflow to push version bump commits and tags back to the repository.
    - **How to create**: Generate a new token from your GitHub developer settings with `repo` and `workflow` scopes.

2.  **`NPM_TOKEN`**:
    - **Purpose**: Authenticates with npm to publish the package.
    - **How to create**: Generate a new token from your npm account settings with "Publish" permissions.

## ✍️ Commit Message Conventions

For the automated release workflow to function correctly, all commit messages **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

- `feat:`: A new feature (results in a **minor** version bump).
- `fix:`: A bug fix (results in a **patch** version bump).
- `docs:`, `chore:`, `refactor:`, `test:`: Other changes (result in a **patch** version bump).
- `BREAKING CHANGE:`: A commit that introduces a breaking change (results in a **major** version bump).

**Example**:

```bash
# A new feature
git commit -m "feat: add support for flow visualization"

# A bug fix
git commit -m "fix: correct token counting for Claude 4.5"
```

## ⏩ Manual Control

### Skipping CI

To push a commit without triggering the CI/CD workflows, include `[skip ci]` in your commit message.

```bash
git commit -m "docs: update internal notes [skip ci]"
```

### Manual Release

In case of a workflow failure, you can perform a manual release:

1.  Ensure your local `main` branch is up-to-date.
2.  Run `npm version <patch|minor|major>` to bump the version.
3.  Run `npm run build`.
4.  Run `npm publish --access public`.
5.  Push the new commit and tag to GitHub: `git push origin main --follow-tags`.
6.  Manually create a release on GitHub using the new tag.
