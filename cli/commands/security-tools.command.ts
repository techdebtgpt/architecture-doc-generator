/**
 * `archdoc security-tools` — manage optional security analysis tools
 *
 *   archdoc security-tools status    Show which tools are installed and their versions
 *   archdoc security-tools install   Interactive install for missing tools (TTY-gated)
 *   archdoc security-tools install --semgrep   Install Semgrep only
 *   archdoc security-tools install --trivy     Install Trivy only
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { Logger } from '../../src/utils/logger';
import { isToolAvailable, installSemgrep, installTrivy } from '../utils/install-security-tools';

const logger = new Logger('SecurityToolsCommand');

// ---------------------------------------------------------------------------
// status subcommand
// ---------------------------------------------------------------------------

async function runStatus(): Promise<void> {
  logger.info('\n🔒 Security tools status\n');

  const [semgrep, trivy] = await Promise.all([
    isToolAvailable('semgrep'),
    isToolAvailable('trivy'),
  ]);

  const semgrepLine = semgrep.available
    ? `✅  Semgrep   ${semgrep.version ?? '(version unknown)'}`
    : '❌  Semgrep   not installed';
  const trivyLine = trivy.available
    ? `✅  Trivy     ${trivy.version ?? '(version unknown)'}`
    : '❌  Trivy     not installed';

  console.log(`   ${semgrepLine}`);
  console.log(`   ${trivyLine}\n`);

  if (semgrep.available && trivy.available) {
    logger.info('All security tools are installed. The pentest agent will use the full toolchain.');
    return;
  }

  logger.info('Some tools are missing. The pentest agent will fall back to:');
  if (!trivy.available) {
    logger.info('  • npm audit (dependency CVEs instead of Trivy)');
  }
  if (!semgrep.available) {
    logger.info('  • LLM-based SAST analysis instead of Semgrep (higher false-positive rate)');
  }
  console.log('\n  → Run `archdoc security-tools install` to install missing tools.\n');
}

// ---------------------------------------------------------------------------
// install subcommand
// ---------------------------------------------------------------------------

interface InstallOptions {
  semgrep?: boolean;
  trivy?: boolean;
}

async function runInstall(options: InstallOptions): Promise<void> {
  const installSpecific = options.semgrep || options.trivy;

  // Check current status
  const [semgrepStatus, trivyStatus] = await Promise.all([
    isToolAvailable('semgrep'),
    isToolAvailable('trivy'),
  ]);

  // If flags were passed, install exactly those tools (skip prompt)
  if (installSpecific) {
    if (options.semgrep) {
      if (semgrepStatus.available) {
        logger.info(`✅ Semgrep already installed (${semgrepStatus.version ?? 'unknown version'})`);
      } else {
        logger.info('Installing Semgrep...');
        const result = await installSemgrep();
        result.ok ? logger.info(`✅ ${result.message}`) : logger.warn(`⚠️  ${result.message}`);
        if (result.extraMessage) logger.info(result.extraMessage);
      }
    }
    if (options.trivy) {
      if (trivyStatus.available) {
        logger.info(`✅ Trivy already installed (${trivyStatus.version ?? 'unknown version'})`);
      } else {
        logger.info('Installing Trivy...');
        const result = await installTrivy();
        result.ok ? logger.info(`✅ ${result.message}`) : logger.warn(`⚠️  ${result.message}`);
        if (result.extraMessage) logger.info(result.extraMessage);
      }
    }
    return;
  }

  // No flags — interactive mode; require a real TTY
  if (!process.stdin.isTTY) {
    logger.warn(
      '⚠️  No interactive terminal detected. ' +
        'Use `archdoc security-tools install --semgrep` or `--trivy` to install non-interactively.',
    );
    process.exit(1);
  }

  if (semgrepStatus.available && trivyStatus.available) {
    logger.info(`✅ Semgrep already installed (${semgrepStatus.version ?? ''})`);
    logger.info(`✅ Trivy already installed   (${trivyStatus.version ?? ''})`);
    logger.info('\nAll security tools are up to date.');
    return;
  }

  console.log('\n🔒 Security tools for pentest analysis\n');
  console.log('Semgrep: SAST code scanner — detects injection, XSS, auth patterns.');
  console.log('Trivy:   Dependency CVE scanner — detects vulnerable packages and secrets.\n');

  let didInstallAny = false;

  if (!semgrepStatus.available) {
    const { doInstall } = await inquirer.prompt<{ doInstall: boolean }>([
      {
        type: 'confirm',
        name: 'doInstall',
        message: 'Semgrep is not installed. Install it now?',
        default: false,
      },
    ]);
    if (doInstall) {
      logger.info('Installing Semgrep...');
      const result = await installSemgrep();
      result.ok ? logger.info(`✅ ${result.message}`) : logger.warn(`⚠️  ${result.message}`);
      if (result.extraMessage) logger.info(result.extraMessage);
      didInstallAny = true;
    }
  } else {
    logger.info(`✅ Semgrep already installed (${semgrepStatus.version ?? ''})`);
  }

  if (!trivyStatus.available) {
    const { doInstall } = await inquirer.prompt<{ doInstall: boolean }>([
      {
        type: 'confirm',
        name: 'doInstall',
        message: 'Trivy is not installed. Install it now?',
        default: false,
      },
    ]);
    if (doInstall) {
      logger.info('Installing Trivy...');
      const result = await installTrivy();
      result.ok ? logger.info(`✅ ${result.message}`) : logger.warn(`⚠️  ${result.message}`);
      if (result.extraMessage) logger.info(result.extraMessage);
      didInstallAny = true;
    }
  } else {
    logger.info(`✅ Trivy already installed (${trivyStatus.version ?? ''})`);
  }

  if (!didInstallAny) {
    console.log(
      '\n   You can install them manually at any time and re-run `archdoc security-tools status`.\n',
    );
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerSecurityToolsCommand(program: Command): void {
  const secTools = program
    .command('security-tools')
    .description('Manage optional security analysis tools (Semgrep, Trivy)');

  secTools
    .command('status')
    .description('Show installation status of Semgrep and Trivy')
    .action(async () => {
      try {
        await runStatus();
      } catch (error) {
        logger.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  secTools
    .command('install')
    .description('Install missing security tools (interactive, requires TTY)')
    .option('--semgrep', 'Install Semgrep only (non-interactive)')
    .option('--trivy', 'Install Trivy only (non-interactive)')
    .action(async (options: InstallOptions) => {
      try {
        await runInstall(options);
      } catch (error) {
        logger.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Default action when `archdoc security-tools` is called with no subcommand
  secTools.action(() => {
    console.log('\nUsage:');
    console.log('  archdoc security-tools status           Check which tools are installed');
    console.log('  archdoc security-tools install          Interactive install for missing tools');
    console.log('  archdoc security-tools install --semgrep  Install Semgrep only');
    console.log('  archdoc security-tools install --trivy    Install Trivy only\n');
  });
}
