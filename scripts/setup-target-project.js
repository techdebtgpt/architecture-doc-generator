#!/usr/bin/env node

/**
 * Setup script to configure a target project for ArchDoc MCP
 *
 * Usage:
 *   node setup-target-project.js [project-path]
 *
 * This creates:
 *   - .archdoc.config.json (with prompts for API keys)
 *   - .claude/mcp.json
 *   - .vscode/mcp.json (optional)
 *   - Updates .gitignore
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function setupTargetProject() {
  console.log('🚀 ArchDoc MCP Setup Wizard\n');
  console.log('This will configure your project for ArchDoc MCP integration.\n');

  // Get target directory
  const targetDir = process.argv[2] || process.cwd();
  console.log(`📁 Target Project: ${targetDir}\n`);

  try {
    await fs.access(targetDir);
  } catch {
    console.error(`❌ Error: Directory not found: ${targetDir}`);
    process.exit(1);
  }

  // Check if package.json exists
  const packageJsonPath = path.join(targetDir, 'package.json');
  const hasPackageJson = await fileExists(packageJsonPath);

  if (!hasPackageJson) {
    console.warn('⚠️  Warning: No package.json found. This might not be a Node.js project.');
    const proceed = await question('Continue anyway? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📋 Configuration Setup\n');

  // Get provider
  console.log('Select LLM provider:');
  console.log('  1. Anthropic (Claude)');
  console.log('  2. OpenAI (GPT)');
  console.log('  3. Google (Gemini)');
  console.log('  4. xAI (Grok)');
  const providerChoice = await question('Choice (1-4): ');

  const providerMap = {
    '1': { name: 'anthropic', models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'] },
    '2': { name: 'openai', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview'] },
    '3': { name: 'google', models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'] },
    '4': { name: 'xai', models: ['grok-beta', 'grok-2-latest'] },
  };

  const provider = providerMap[providerChoice];
  if (!provider) {
    console.error('❌ Invalid choice');
    rl.close();
    return;
  }

  console.log(`\nRecommended models for ${provider.name}:`);
  provider.models.forEach((model, i) => console.log(`  ${i + 1}. ${model}`));
  const modelChoice = await question(`Choice (1-${provider.models.length}) or custom: `);

  const modelIndex = parseInt(modelChoice) - 1;
  const model = modelIndex >= 0 && modelIndex < provider.models.length
    ? provider.models[modelIndex]
    : modelChoice;

  // Get API key
  const apiKey = await question(`\n${provider.name} API key: `);

  if (!apiKey || apiKey.length < 10) {
    console.error('❌ Invalid API key');
    rl.close();
    return;
  }

  // Search mode
  console.log('\nSearch mode:');
  console.log('  1. keyword (fast, free, traditional)');
  console.log('  2. vector (semantic search, uses embeddings)');
  const searchModeChoice = await question('Choice (1-2): ');
  const searchMode = searchModeChoice === '2' ? 'vector' : 'keyword';

  let embeddingsProvider = 'local';
  if (searchMode === 'vector') {
    console.log('\nEmbeddings provider:');
    console.log('  1. local (FREE, TF-IDF, works offline)');
    console.log('  2. openai (paid, high quality)');
    console.log('  3. google (paid, good quality)');
    const embeddingsChoice = await question('Choice (1-3): ');

    const embeddingsMap = { '1': 'local', '2': 'openai', '3': 'google' };
    embeddingsProvider = embeddingsMap[embeddingsChoice] || 'local';
  }

  // Create config
  const config = {
    llm: {
      provider: provider.name,
      model: model,
      temperature: 0.2,
      maxTokens: 4096
    },
    apiKeys: {
      [provider.name]: apiKey
    },
    searchMode: {
      mode: searchMode,
      strategy: 'smart',
      embeddingsProvider: embeddingsProvider
    },
    tracing: {
      enabled: false,
      apiKey: '',
      project: 'archdoc-analysis'
    }
  };

  console.log('\n📝 Creating configuration files...\n');

  // 1. Create .archdoc.config.json
  const configPath = path.join(targetDir, '.archdoc.config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Created .archdoc.config.json');

  // 2. Create .claude/mcp.json
  const claudeDir = path.join(targetDir, '.claude');
  await fs.mkdir(claudeDir, { recursive: true });

  const claudeMcpConfig = {
    mcpServers: {
      archdoc: {
        command: 'archdoc-mcp-server'
      }
    }
  };

  await fs.writeFile(
    path.join(claudeDir, 'mcp.json'),
    JSON.stringify(claudeMcpConfig, null, 2)
  );
  console.log('✅ Created .claude/mcp.json');

  // 3. Ask about VS Code setup
  const setupVscode = await question('\nSetup for VS Code Copilot? (y/n): ');

  if (setupVscode.toLowerCase() === 'y') {
    const vscodeDir = path.join(targetDir, '.vscode');
    await fs.mkdir(vscodeDir, { recursive: true });

    await fs.writeFile(
      path.join(vscodeDir, 'mcp.json'),
      JSON.stringify(claudeMcpConfig, null, 2)
    );
    console.log('✅ Created .vscode/mcp.json');
  }

  // 4. Update .gitignore
  const gitignorePath = path.join(targetDir, '.gitignore');
  let gitignoreContent = '';

  if (await fileExists(gitignorePath)) {
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
  }

  const gitignoreEntries = [
    '.archdoc.config.json',
    '.arch-docs/',
    '.arch-docs/**'
  ];

  let needsUpdate = false;
  for (const entry of gitignoreEntries) {
    if (!gitignoreContent.includes(entry)) {
      gitignoreContent += `\n${entry}`;
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    await fs.writeFile(gitignorePath, gitignoreContent.trim() + '\n');
    console.log('✅ Updated .gitignore');
  } else {
    console.log('✅ .gitignore already configured');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Setup Complete!');
  console.log('='.repeat(60));
  console.log('\n📋 Summary:');
  console.log(`   Project: ${targetDir}`);
  console.log(`   Provider: ${provider.name}`);
  console.log(`   Model: ${model}`);
  console.log(`   Search Mode: ${searchMode} (embeddings: ${embeddingsProvider})`);

  console.log('\n🚀 Next Steps:');
  console.log('   1. Restart your IDE (Claude Desktop, VS Code, etc.)');
  console.log('   2. Test config: @archdoc check config');
  console.log('   3. Generate docs: @archdoc generate documentation');
  console.log('   4. Query docs: @archdoc query documentation: "your question"');

  console.log('\n⚠️  Security Note:');
  console.log('   .archdoc.config.json contains your API key.');
  console.log('   It has been added to .gitignore automatically.');
  console.log('   DO NOT commit this file to version control!\n');

  rl.close();
}

setupTargetProject().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
