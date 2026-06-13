/**
 * Pre-flight check for optional security tools called at the start of
 * `archdoc analyze`.
 *
 * Intentionally minimal — no install prompts, no blocking.
 * One-time setup belongs in `archdoc config --init`.
 * Manual install belongs in `archdoc security-tools install`.
 *
 * If tools are missing, prints a single quiet warning (same log format as
 * the rest of the CLI) so the user knows the scan is running in fallback mode.
 */

import { Logger } from '../../src/utils/logger';
import { getSecurityToolsSummaryStatus } from './install-security-tools';

const logger = new Logger('Analyze');

export async function promptSecurityToolsIfNeeded(): Promise<void> {
  const { semgrep, trivy } = await getSecurityToolsSummaryStatus();

  if (semgrep.available && trivy.available) {
    return;
  }

  const missing: string[] = [];
  if (!semgrep.available) missing.push('Semgrep');
  if (!trivy.available) missing.push('Trivy');

  logger.warn(
    `Security tools not installed: ${missing.join(', ')} — running fallback scan (npm audit + built-in + LLM)`,
  );
  logger.info('   Install with: archdoc security-tools install  |  Setup: archdoc config --init\n');
}
