import chalk from 'chalk';

/**
 * Display comprehensive help information for ArchDoc Generator
 */
export function displayHelp(): void {
  console.log(chalk.bold.cyan('\n🏗️  ArchDoc Generator - AI-Powered Architecture Documentation\n'));
  console.log(
    chalk.dim(
      'Generate comprehensive architecture documentation for any codebase using AI-powered agents.\n',
    ),
  );

  // Quick Start
  console.log(chalk.bold.yellow('📖 QUICK START\n'));
  console.log(chalk.green('  1. Setup:') + '         archdoc config --init');
  console.log(chalk.green('  2. Analyze:') + '       archdoc analyze');
  console.log(chalk.green('  3. Export:') + '        archdoc export .arch-docs --format html\n');

  // Main Commands
  console.log(chalk.bold.yellow('🚀 COMMANDS\n'));

  // Analyze command
  console.log(chalk.bold('  analyze') + chalk.dim(' [path]'));
  console.log('    Generate comprehensive architecture documentation\n');
  console.log(chalk.dim('    Examples:'));
  console.log('      archdoc analyze                          # Analyze current directory');
  console.log('      archdoc analyze /path/to/project         # Analyze specific project');
  console.log('      archdoc analyze --output ./docs          # Custom output location');
  console.log('      archdoc analyze --depth deep             # Thorough analysis');
  console.log('      archdoc analyze --prompt "security"      # Focus on security\n');

  console.log(chalk.dim('    Key Options:'));
  console.log('      -o, --output <dir>              Output directory (default: .arch-docs)');
  console.log('      --prompt <text>                 Focus area for enhanced analysis');
  console.log(
    '      --depth <mode>                  Analysis depth: quick|normal|deep (default: normal)',
  );
  console.log(
    '      --search-mode <mode>            Search mode: vector|keyword (default: vector)',
  );
  console.log(
    '      --retrieval-strategy <strategy> Strategy: vector|graph|hybrid|smart (default: hybrid)',
  );
  console.log('      --provider <provider>           LLM provider: anthropic|openai|google|xai');
  console.log('      --model <model>                 Specific LLM model to use');
  console.log('      --max-cost <dollars>            Maximum cost limit (default: $5.00)');
  console.log('      --c4                            Generate C4 model');
  console.log('      --single-file                   Generate single file instead of multi-file');
  console.log(
    '      -f, --format <format>           Format: markdown|json|html (with --single-file)',
  );
  console.log('      --verbose                       Enable verbose output');
  console.log('      --no-clean                      Keep existing output directory\n');

  // Config command
  console.log(chalk.bold('  config'));
  console.log('    Manage ArchDoc configuration\n');
  console.log(chalk.dim('    Examples:'));
  console.log('      archdoc config --init            # Interactive setup wizard');
  console.log('      archdoc config --list            # Show current configuration');
  console.log('      archdoc config --validate        # Validate configuration\n');

  console.log(chalk.dim('    Options:'));
  console.log('      --init                          Run interactive configuration wizard');
  console.log('      --list                          Display current configuration');
  console.log('      --validate                      Validate configuration file\n');

  // Export command
  console.log(chalk.bold('  export') + chalk.dim(' <input>'));
  console.log('    Export documentation to different formats\n');
  console.log(chalk.dim('    Examples:'));
  console.log('      archdoc export .arch-docs --format html    # Export to HTML');
  console.log('      archdoc export docs.md --format json       # Convert to JSON');
  console.log('      archdoc export docs.md -o output.html      # Custom output path\n');

  console.log(chalk.dim('    Options:'));
  console.log('      -f, --format <format>           Output format: markdown|json|html|confluence');
  console.log('      -o, --output <path>             Output path');
  console.log('      --template <path>               Custom template file\n');

  // Analysis Depth Modes
  console.log(chalk.bold.yellow('⚙️  ANALYSIS DEPTH MODES\n'));
  console.log(
    chalk.green('  quick') + '  - Fast analysis with no refinement (2 iterations, 70% threshold)',
  );
  console.log(
    chalk.green('  normal') +
      ' - Balanced analysis with refinement (5 iterations, 80% threshold) ' +
      chalk.dim('[DEFAULT]'),
  );
  console.log(
    chalk.green('  deep') +
      '   - Thorough analysis with deep refinement (10 iterations, 90% threshold)\n',
  );

  // Search Strategies
  console.log(chalk.bold.yellow('🔍 VECTOR SEARCH STRATEGIES\n'));
  console.log(
    chalk.green('  vector') + ' - Pure semantic similarity search (local TF-IDF embeddings)',
  );
  console.log(
    chalk.green('  graph') +
      '  - Pure structural search (import graphs, dependencies) ' +
      chalk.cyan('⭐ RECOMMENDED'),
  );
  console.log(
    chalk.green('  hybrid') + ' - Combined semantic + structural (60% semantic, 40% structural)',
  );
  console.log(chalk.green('  smart') + '  - Auto-adaptive strategy (chooses best per query)\n');
  console.log(
    chalk.dim('  Benchmark winner:') +
      ' ' +
      chalk.bold('graph') +
      ' with local embeddings (84.8%, 6.1min, $0.08)',
  );
  console.log(chalk.dim('  See:') + ' docs/SEARCH_STRATEGY_BENCHMARK.md for complete analysis\n');

  // Environment Variables
  console.log(chalk.bold.yellow('🔑 ENVIRONMENT VARIABLES\n'));
  console.log('  API Keys (LLM providers):');
  console.log('    ANTHROPIC_API_KEY               Anthropic Claude API key');
  console.log('    OPENAI_API_KEY                  OpenAI GPT API key');
  console.log('    GOOGLE_API_KEY                  Google Gemini API key');
  console.log('    XAI_API_KEY                     xAI Grok API key\n');

  console.log('  Embeddings (optional, for cloud embeddings):');
  console.log('    OPENAI_EMBEDDINGS_KEY           OpenAI embeddings API key (NOT recommended)');
  console.log('    GOOGLE_EMBEDDINGS_KEY           Google embeddings API key\n');

  console.log('  LangSmith Tracing (optional):');
  console.log('    LANGCHAIN_TRACING_V2            Enable tracing (true/false)');
  console.log('    LANGCHAIN_API_KEY               LangSmith API key');
  console.log('    LANGCHAIN_PROJECT               Project name for traces\n');

  // Configuration File
  console.log(chalk.bold.yellow('📝 CONFIGURATION FILE\n'));
  console.log('  Location: ' + chalk.cyan('.archdoc.config.json') + ' (root directory)');
  console.log('  Create:   ' + chalk.cyan('archdoc config --init\n'));
  console.log(chalk.dim('  Example structure:'));
  console.log(
    chalk.dim(`  {
    "llm": {
      "provider": "anthropic",
      "model": "claude-sonnet-4"
    },
    "apiKeys": {
      "anthropic": "sk-ant-..."
    },
    "searchMode": {
      "mode": "vector",
      "embeddingsProvider": "local",
      "strategy": "graph"
    },
    "tracing": {
      "enabled": true,
      "apiKey": "lsv2_pt_...",
      "project": "my-project"
    }
  }\n`),
  );

  // Generated Documentation
  console.log(chalk.bold.yellow('📄 GENERATED DOCUMENTATION\n'));
  console.log('  Output directory: ' + chalk.cyan('.arch-docs/') + ' (default)\n');
  console.log(chalk.dim('  Multi-file structure (default):'));
  console.log('    index.md                 # Table of contents with agent summaries');
  console.log('    file-structure.md        # Project organization and file tree');
  console.log('    dependencies.md          # Dependency analysis and import graphs');
  console.log('    architecture.md          # Architecture patterns and design');
  console.log('    patterns.md              # Design patterns detected');
  console.log('    flows.md                 # Control and data flows');
  console.log('    schemas.md               # Data models and schemas');
  console.log('    security.md              # Security analysis');
  console.log('    kpi-analysis.md          # Repository KPIs and health metrics');
  console.log('    metadata.md              # Generation metadata and costs');
  console.log('    changelog.md             # Documentation update history\n');

  console.log(chalk.dim('  Single-file output (with --single-file):'));
  console.log('    architecture-docs.[md|json|html]  # All sections in one file\n');

  // Available Agents
  console.log(chalk.bold.yellow('🤖 SPECIALIZED AI AGENTS\n'));
  console.log(
    '  1. ' + chalk.cyan('file-structure') + '      - Project organization and file tree',
  );
  console.log('  2. ' + chalk.cyan('dependency-analyzer') + '  - Dependencies and import analysis');
  console.log(
    '  3. ' + chalk.cyan('architecture-analyzer') + ' - Architecture patterns and design',
  );
  console.log('  4. ' + chalk.cyan('pattern-detector') + '    - Design patterns detection');
  console.log('  5. ' + chalk.cyan('flow-visualization') + '  - Control and data flows');
  console.log('  6. ' + chalk.cyan('schema-generator') + '    - Data models and schemas');
  console.log('  7. ' + chalk.cyan('security-analyzer') + '   - Security vulnerabilities');
  console.log(
    '  8. ' +
      chalk.cyan('kpi-analyzer') +
      '        - Repository health and KPIs ' +
      chalk.yellow('[NEW]') +
      '\n',
  );

  // Resources
  console.log(chalk.bold.yellow('📚 RESOURCES\n'));
  console.log('  Documentation:    docs/USER_GUIDE.md');
  console.log('  Configuration:    docs/CONFIGURATION_GUIDE.md');
  console.log('  Vector Search:    docs/VECTOR_SEARCH.md');
  console.log('  Benchmarks:       docs/SEARCH_STRATEGY_BENCHMARK.md');
  console.log('  Website:          https://techdebtgpt.com');
  console.log('  GitHub:           https://github.com/techdebtgpt/architecture-doc-generator\n');

  // Common Workflows
  console.log(chalk.bold.yellow('💡 COMMON WORKFLOWS\n'));
  console.log(chalk.bold('  First-time setup:'));
  console.log('    1. archdoc config --init');
  console.log('    2. archdoc analyze\n');

  console.log(chalk.bold('  Quick analysis:'));
  console.log('    archdoc analyze --depth quick\n');

  console.log(chalk.bold('  Deep analysis with focus:'));
  console.log('    archdoc analyze --depth deep --prompt "security and authentication"\n');

  console.log(chalk.bold('  CI/CD pipeline:'));
  console.log(
    '    archdoc analyze --search-mode vector --retrieval-strategy graph --depth quick\n',
  );

  console.log(chalk.bold('  Custom output format:'));
  console.log('    archdoc analyze --single-file --format html -o docs/architecture.html\n');

  // Footer
  console.log(chalk.dim('━'.repeat(80)));
  console.log(
    chalk.dim('  For detailed help on a specific command: ') +
      chalk.cyan('archdoc <command> --help'),
  );
  console.log(
    chalk.dim('  For complete documentation: ') + chalk.cyan('https://techdebtgpt.com/docs'),
  );
  console.log(chalk.dim('━'.repeat(80) + '\n'));
}

/**
 * Register help command with Commander
 */
export function registerHelpCommand(program: any): void {
  program
    .command('help')
    .description('Display comprehensive help information')
    .action(() => {
      displayHelp();
    });
}
