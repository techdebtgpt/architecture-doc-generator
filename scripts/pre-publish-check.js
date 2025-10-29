#!/usr/bin/env node

/**
 * Pre-publish validation script
 * Run this before publishing to npm to catch common issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-publish checks...\n');

let hasErrors = false;
const checks = [];

// Check 1: package.json exists and is valid
try {
  const pkg = require('../package.json');
  checks.push({ name: 'package.json exists', passed: true });

  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'license'];
  for (const field of requiredFields) {
    if (!pkg[field]) {
      checks.push({ name: `package.json has ${field}`, passed: false, error: `Missing ${field}` });
      hasErrors = true;
    } else {
      checks.push({ name: `package.json has ${field}`, passed: true });
    }
  }

  // Check bin field
  if (pkg.bin && pkg.bin.archdoc) {
    const binPath = path.join(__dirname, '..', pkg.bin.archdoc);
    if (fs.existsSync(binPath)) {
      checks.push({ name: 'Binary file exists', passed: true });
    } else {
      checks.push({
        name: 'Binary file exists',
        passed: false,
        error: `${pkg.bin.archdoc} not found`,
      });
      hasErrors = true;
    }
  }

  // Check files array
  if (pkg.files && pkg.files.length > 0) {
    checks.push({ name: 'Files array configured', passed: true });
    for (const file of pkg.files) {
      if (file === 'dist') {
        const distExists = fs.existsSync(path.join(__dirname, '..', 'dist'));
        if (distExists) {
          checks.push({ name: 'dist/ directory exists', passed: true });
        } else {
          checks.push({
            name: 'dist/ directory exists',
            passed: false,
            error: 'Run npm run build first',
          });
          hasErrors = true;
        }
      }
    }
  }
} catch (error) {
  checks.push({ name: 'package.json exists', passed: false, error: error.message });
  hasErrors = true;
}

// Check 2: README.md exists
if (fs.existsSync(path.join(__dirname, '..', 'README.md'))) {
  checks.push({ name: 'README.md exists', passed: true });
} else {
  checks.push({ name: 'README.md exists', passed: false, error: 'README.md not found' });
  hasErrors = true;
}

// Check 3: LICENSE exists
if (fs.existsSync(path.join(__dirname, '..', 'LICENSE'))) {
  checks.push({ name: 'LICENSE exists', passed: true });
} else {
  checks.push({ name: 'LICENSE exists', passed: false, error: 'LICENSE file not found' });
  hasErrors = true;
}

// Check 4: Git status clean
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (gitStatus.trim() === '') {
    checks.push({ name: 'Git working directory clean', passed: true });
  } else {
    checks.push({
      name: 'Git working directory clean',
      passed: false,
      error: 'Uncommitted changes',
    });
    console.log('\n⚠️  Uncommitted changes:');
    console.log(gitStatus);
    hasErrors = true;
  }
} catch (error) {
  checks.push({
    name: 'Git working directory clean',
    passed: false,
    error: 'Not a git repository',
  });
}

// Check 5: npm login
try {
  const npmUser = execSync('npm whoami', { encoding: 'utf-8' }).trim();
  checks.push({ name: 'npm authenticated', passed: true, info: `Logged in as ${npmUser}` });
} catch (error) {
  checks.push({ name: 'npm authenticated', passed: false, error: 'Run npm login first' });
  hasErrors = true;
}

// Check 6: Tests pass
try {
  console.log('\n🧪 Running tests...');
  execSync('npm test', { stdio: 'inherit' });
  checks.push({ name: 'Tests pass', passed: true });
} catch (error) {
  checks.push({ name: 'Tests pass', passed: false, error: 'Tests failed' });
  hasErrors = true;
}

// Check 7: Lint passes
try {
  console.log('\n🔍 Running linter...');
  execSync('npm run lint', { stdio: 'inherit' });
  checks.push({ name: 'Linting passes', passed: true });
} catch (error) {
  checks.push({ name: 'Linting passes', passed: false, error: 'Linting failed' });
  hasErrors = true;
}

// Check 8: Build succeeds
try {
  console.log('\n🏗️  Building...');
  execSync('npm run build', { stdio: 'inherit' });
  checks.push({ name: 'Build succeeds', passed: true });
} catch (error) {
  checks.push({ name: 'Build succeeds', passed: false, error: 'Build failed' });
  hasErrors = true;
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📋 Pre-publish Check Summary');
console.log('='.repeat(60) + '\n');

for (const check of checks) {
  const icon = check.passed ? '✅' : '❌';
  const message = check.passed
    ? `${icon} ${check.name}${check.info ? ` (${check.info})` : ''}`
    : `${icon} ${check.name}: ${check.error}`;
  console.log(message);
}

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log('\n❌ Pre-publish checks FAILED!');
  console.log('Please fix the errors above before publishing.\n');
  process.exit(1);
} else {
  console.log('\n✅ All pre-publish checks PASSED!');
  console.log('\nYou can now publish with:');
  console.log('  npm publish --access public\n');
  console.log('Or bump version and publish:');
  console.log('  npm version patch  # 0.1.0 → 0.1.1');
  console.log('  npm version minor  # 0.1.0 → 0.2.0');
  console.log('  npm version major  # 0.1.0 → 1.0.0');
  console.log('  npm publish --access public\n');
  process.exit(0);
}
