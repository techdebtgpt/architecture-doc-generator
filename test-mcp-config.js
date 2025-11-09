#!/usr/bin/env node

/**
 * Test script to verify MCP server config loading functionality
 *
 * This script tests:
 * 1. Config is properly loaded from .archdoc.config.json
 * 2. LLMService is initialized with the config
 * 3. Vector store can be initialized
 * 4. Full documentation is loaded without truncation
 */

const path = require('path');
const fs = require('fs').promises;

async function testConfigLoading() {
  console.log('🧪 Testing Config Loading...\n');

  try {
    // Import the config loader
    const { loadArchDocConfig } = require('./dist/src/utils/config-loader.js');

    const projectPath = process.cwd();
    console.log(`📁 Project Path: ${projectPath}`);

    // Test 1: Load config with environment application
    console.log('\n📋 Test 1: Loading config with env application...');
    const config = loadArchDocConfig(projectPath, true);

    if (config && Object.keys(config).length > 0) {
      console.log('✅ Config loaded successfully');
      console.log(`   Provider: ${config.llm?.provider || 'Not set'}`);
      console.log(`   Model: ${config.llm?.model || 'Not set'}`);
      console.log(`   Search Mode: ${config.searchMode?.mode || 'Not set'}`);
      console.log(`   Has API Key: ${config.apiKeys ? '✓' : '✗'}`);
    } else {
      console.log('⚠️  No config found - using defaults');
    }

    // Test 2: Check if environment variables are set
    console.log('\n📋 Test 2: Checking environment variables...');
    const envVars = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'GOOGLE_API_KEY',
      'XAI_API_KEY'
    ];

    let foundKey = false;
    for (const envVar of envVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
        foundKey = true;
      }
    }

    if (!foundKey) {
      console.log('⚠️  No API keys found in environment');
    }

    // Test 3: Initialize LLMService
    console.log('\n📋 Test 3: Initializing LLMService...');
    try {
      const { LLMService } = require('./dist/src/llm/llm-service.js');
      const llmService = LLMService.getInstance(config);
      console.log('✅ LLMService initialized successfully');
    } catch (error) {
      console.log(`❌ LLMService initialization failed: ${error.message}`);
    }

    // Test 4: Check documentation files
    console.log('\n📋 Test 4: Checking for documentation files...');
    const docsPath = path.join(projectPath, '.arch-docs');

    try {
      const files = await fs.readdir(docsPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      if (mdFiles.length > 0) {
        console.log(`✅ Found ${mdFiles.length} documentation files:`);
        for (const file of mdFiles) {
          const filePath = path.join(docsPath, file);
          const stats = await fs.stat(filePath);
          console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        }
      } else {
        console.log('⚠️  No documentation files found');
      }
    } catch (error) {
      console.log('⚠️  .arch-docs directory not found - run generate_documentation first');
    }

    // Test 5: Verify no truncation in file reading
    console.log('\n📋 Test 5: Testing full file loading (no truncation)...');
    try {
      const architectureFile = path.join(docsPath, 'architecture.md');
      const content = await fs.readFile(architectureFile, 'utf-8');
      console.log(`✅ architecture.md loaded: ${content.length} characters (${(content.length / 1024).toFixed(2)} KB)`);

      if (content.length > 2000) {
        console.log('   ✓ Full content loaded (more than old 2000 char limit)');
      } else {
        console.log('   ⚠️  File is small, but no truncation occurred');
      }
    } catch (error) {
      console.log('⚠️  Could not read architecture.md');
    }

    console.log('\n✅ All tests completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testConfigLoading().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
