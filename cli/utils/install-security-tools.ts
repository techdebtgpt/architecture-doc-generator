/**
 * Utility helpers for checking and installing optional security tools
 * (Semgrep and Trivy) used by the penetration-testing agent.
 *
 * Design decisions:
 *  - No `shell: true` — avoids shell injection and lets Node populate
 *    `result.error` with ENOENT when a binary is not on PATH.
 *  - Never auto-runs `curl | sh` — suggests the script but lets the user
 *    run it intentionally.
 *  - Prints a PATH hint when pip --user is used on Linux, since ~/.local/bin
 *    may not be on PATH by default.
 */

import { execFile, spawnSync } from 'child_process';
import { promisify } from 'util';
import {
  getPipUserBinDir,
  resolveSemgrepBinary,
  isToolOnPath,
} from '../../src/utils/resolve-security-tool';

const execFileAsync = promisify(execFile);

export type SecurityTool = 'semgrep' | 'trivy';

export interface ToolStatus {
  available: boolean;
  version?: string;
}

export interface InstallResult {
  ok: boolean;
  message: string;
  /** Optional secondary message (e.g. PATH tip) — should be logged on its own line. */
  extraMessage?: string;
}

// ---------------------------------------------------------------------------
// Availability detection
// ---------------------------------------------------------------------------

/**
 * Check if a security tool binary is on PATH and executable.
 * Returns the first line of its version output when found.
 * Delegates to the shared isToolOnPath helper in resolve-security-tool.
 */
export const isToolAvailable = (tool: SecurityTool): Promise<ToolStatus> => isToolOnPath(tool);

/**
 * Check Semgrep and Trivy availability for the config summary.
 * Semgrep is resolved via resolveSemgrepBinary so pip-installed binaries are
 * found even when their directory is not on PATH.
 */
export async function getSecurityToolsSummaryStatus(): Promise<{
  semgrep: ToolStatus;
  trivy: ToolStatus;
}> {
  const [trivyStatus, semgrepBinary] = await Promise.all([
    isToolAvailable('trivy'),
    resolveSemgrepBinary(),
  ]);
  return {
    trivy: trivyStatus,
    semgrep: { available: semgrepBinary !== null },
  };
}

/**
 * Format a single tool for the config summary line: "Name ✅ version" or "Name ❌".
 */
export function formatSecurityToolsSummary(status: { semgrep: ToolStatus; trivy: ToolStatus }): {
  semgrepStr: string;
  trivyStr: string;
} {
  return {
    semgrepStr: status.semgrep.available
      ? `Semgrep ✅ ${status.semgrep.version ?? ''}`.trim()
      : 'Semgrep ❌',
    trivyStr: status.trivy.available ? `Trivy ✅ ${status.trivy.version ?? ''}`.trim() : 'Trivy ❌',
  };
}

/**
 * Check if Homebrew is on PATH (without shell: true).
 */
async function isBrewAvailable(): Promise<boolean> {
  try {
    await execFileAsync('brew', ['--version'], { timeout: 5_000, maxBuffer: 1024 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if python3 / pip is available for Semgrep installation.
 */
async function isPipAvailable(): Promise<boolean> {
  try {
    await execFileAsync('python3', ['-m', 'pip', '--version'], {
      timeout: 5_000,
      maxBuffer: 1024,
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Semgrep installation
// ---------------------------------------------------------------------------

/**
 * Install Semgrep.
 *  - macOS: prefers `brew install semgrep`, falls back to pip.
 *  - Linux: prefers pip (brew is optional on Linux).
 *  - Adds a PATH note when pip --user is used.
 */
/** Env vars so Homebrew runs quietly (no auto-update, no hints, non-interactive). */
const BREW_QUIET_ENV = {
  ...process.env,
  HOMEBREW_NO_AUTO_UPDATE: '1',
  HOMEBREW_NO_ENV_HINTS: '1',
  CI: '1', // non-interactive; reduces progress output
  HOMEBREW_NO_COLOR: '1',
};

/**
 * Run a brew install silently (stdio: 'pipe').
 * Returns { ok, stderr } — stderr is only shown on failure.
 */
function brewInstall(formula: string): { ok: boolean; stderr: string } {
  const r = spawnSync('brew', ['install', formula], {
    stdio: 'pipe',
    env: BREW_QUIET_ENV,
  });
  return {
    ok: r.status === 0,
    stderr: r.stderr?.toString().trim() ?? '',
  };
}

/**
 * Run a pip install silently (stdio: 'pipe').
 * Returns { ok, stderr }.
 */
function pipInstall(pkg: string): { ok: boolean; stderr: string } {
  const r = spawnSync('python3', ['-m', 'pip', 'install', '--user', pkg], {
    stdio: 'pipe',
  });
  return {
    ok: r.status === 0,
    stderr: r.stderr?.toString().trim() ?? '',
  };
}

/**
 * Detect a Linux package manager for Trivy guidance.
 */
function detectLinuxPackageManager(): 'apt' | 'yum' | 'dnf' | 'apk' | null {
  const candidates: Array<{ cmd: string; name: 'apt' | 'yum' | 'dnf' | 'apk' }> = [
    { cmd: 'apt-get', name: 'apt' },
    { cmd: 'yum', name: 'yum' },
    { cmd: 'dnf', name: 'dnf' },
    { cmd: 'apk', name: 'apk' },
  ];
  for (const c of candidates) {
    const r = spawnSync('which', [c.cmd], { stdio: 'ignore' });
    if (r.status === 0) return c.name;
  }
  return null;
}

export async function installSemgrep(): Promise<InstallResult> {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: PREFER Homebrew — pip-installed Semgrep often crashes with signal handler errors.
    if (await isBrewAvailable()) {
      const r = brewInstall('semgrep');
      if (r.ok) {
        return { ok: true, message: 'Semgrep installed via Homebrew (recommended on macOS).' };
      }
      const linkFailed = r.stderr.includes('brew link');
      if (linkFailed) {
        // Auto-fix: run brew link --overwrite to resolve conflicting files
        const linkResult = spawnSync('brew', ['link', '--overwrite', 'semgrep'], {
          stdio: 'pipe',
          env: BREW_QUIET_ENV,
        });
        if (linkResult.status === 0) {
          return { ok: true, message: 'Semgrep installed via Homebrew (resolved existing link).' };
        }
        // Link still failed — return error with manual instructions
        return {
          ok: false,
          message:
            'brew install semgrep succeeded but linking failed.\n' +
            '  Try manually: brew link --overwrite semgrep',
        };
      }
      // Brew failed completely; fall back to pip with a warning
    }
    // Fallback to pip on macOS (with warning)
    if (await isPipAvailable()) {
      const r = pipInstall('semgrep');
      if (r.ok) {
        const nowOnPath = await isToolAvailable('semgrep');
        let extraMessage: string | undefined;
        if (!nowOnPath.available) {
          const pipBin = await getPipUserBinDir();
          const tipPath = pipBin ?? '$HOME/.local/bin';
          extraMessage = `💡 Tip: If \`semgrep\` is not found, add to your shell: export PATH="${tipPath}:$PATH"`;
        }
        return {
          ok: true,
          message: 'Semgrep installed via pip.',
          extraMessage:
            (extraMessage ? extraMessage + '\n' : '') +
            '⚠️  Note: pip-installed Semgrep may have issues on macOS. If scans fail, reinstall with: brew install semgrep',
        };
      }
    }
    return {
      ok: false,
      message:
        'Could not install Semgrep.\n' +
        '  Recommended: brew install semgrep\n' +
        '  Or: python3 -m pip install --user semgrep\n' +
        '  Docs: https://semgrep.dev/docs/getting-started/',
    };
  }

  if (platform === 'linux') {
    // Linux: pip is preferred (Homebrew less common)
    if (await isPipAvailable()) {
      const r = pipInstall('semgrep');
      if (r.ok) {
        const nowOnPath = await isToolAvailable('semgrep');
        let extraMessage: string | undefined;
        if (!nowOnPath.available) {
          const pipBin = await getPipUserBinDir();
          const tipPath = pipBin ?? '$HOME/.local/bin';
          extraMessage = `💡 Tip: If \`semgrep\` is not found, add to your shell: export PATH="${tipPath}:$PATH"`;
        }
        return { ok: true, message: 'Semgrep installed via pip.', extraMessage };
      }
      // Pip failed; try Homebrew as a fallback if available
      if (await isBrewAvailable()) {
        const brew = brewInstall('semgrep');
        if (brew.ok) return { ok: true, message: 'Semgrep installed via Homebrew.' };
      }
      return {
        ok: false,
        message:
          'pip install semgrep failed.\n' +
          (r.stderr ? `  ${r.stderr}\n` : '') +
          '  Try manually: python3 -m pip install --user semgrep\n' +
          '  Docs: https://semgrep.dev/docs/getting-started/',
      };
    }

    // No pip; try Homebrew
    if (await isBrewAvailable()) {
      const r = brewInstall('semgrep');
      if (r.ok) {
        return { ok: true, message: 'Semgrep installed via Homebrew.' };
      }
      return {
        ok: false,
        message:
          'brew install semgrep failed.\n' +
          '  Or install via pip: python3 -m pip install semgrep',
      };
    }

    return {
      ok: false,
      message:
        'No pip found.\n' +
        '  Install pip: python3 -m ensurepip\n' +
        '  Then: python3 -m pip install semgrep\n' +
        '  Docs: https://semgrep.dev/docs/getting-started/',
    };
  }

  return {
    ok: false,
    message:
      'Automatic install not supported on this platform. See: https://semgrep.dev/docs/getting-started/',
  };
}

// ---------------------------------------------------------------------------
// Trivy installation
// ---------------------------------------------------------------------------

/**
 * Install Trivy.
 *  - macOS: `brew install trivy`.
 *  - Linux with brew: `brew install trivy`.
 *  - Linux without brew: prints the official install-script command for
 *    the user to run — we don't auto-pipe `curl | sh`.
 *  - Windows: shows link to releases page.
 */
export async function installTrivy(): Promise<InstallResult> {
  const platform = process.platform;

  if (platform === 'darwin') {
    if (await isBrewAvailable()) {
      const r = brewInstall('trivy');
      if (r.ok) {
        return { ok: true, message: 'Trivy installed via Homebrew.' };
      }
      return {
        ok: false,
        message:
          'brew install trivy failed.\n' +
          '  Manual install: brew install trivy\n' +
          '  Or use install script: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin',
      };
    }
    return {
      ok: false,
      message:
        'Homebrew not found.\n' +
        '  Install Homebrew: https://brew.sh  then: brew install trivy\n' +
        '  Or use install script: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin',
    };
  }

  if (platform === 'linux') {
    const pm = detectLinuxPackageManager();
    if (pm === 'apt') {
      return {
        ok: false,
        message:
          'Install Trivy (Debian/Ubuntu):\n' +
          '  sudo apt-get install wget apt-transport-https gnupg\n' +
          '  wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null\n' +
          '  echo \"deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main\" | sudo tee -a /etc/apt/sources.list.d/trivy.list\n' +
          '  sudo apt-get update && sudo apt-get install trivy',
      };
    }
    if (pm === 'yum' || pm === 'dnf') {
      return {
        ok: false,
        message:
          'Install Trivy (RHEL/CentOS/Fedora):\n' +
          '  cat << EOF | sudo tee -a /etc/yum.repos.d/trivy.repo\n' +
          '  [trivy]\n' +
          '  name=Trivy repository\n' +
          '  baseurl=https://aquasecurity.github.io/trivy-repo/rpm/releases/$basearch/\n' +
          '  gpgcheck=1\n' +
          '  enabled=1\n' +
          '  gpgkey=https://aquasecurity.github.io/trivy-repo/rpm/public.key\n' +
          '  EOF\n' +
          `  sudo ${pm} -y update && sudo ${pm} -y install trivy`,
      };
    }
    if (pm === 'apk') {
      return {
        ok: false,
        message: 'Install Trivy (Alpine):\n' + '  apk add trivy',
      };
    }
    return {
      ok: false,
      message:
        'Linux install:\n' +
        '  Use your distro package manager or the official install script:\n' +
        '  curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin\n' +
        '  Docs: https://trivy.dev/docs/latest/getting-started/installation/',
    };
  }

  if (platform === 'win32') {
    return {
      ok: false,
      message:
        'Download Trivy for Windows from: https://github.com/aquasecurity/trivy/releases\n' +
        '  Or use: winget install AquaSecurity.Trivy',
    };
  }

  return {
    ok: false,
    message:
      'Automatic install not supported on this platform. See: https://trivy.dev/docs/getting-started/installation/',
  };
}
