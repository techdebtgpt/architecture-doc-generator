/**
 * Shared helper for resolving optional security tool binaries (Semgrep, Trivy).
 *
 * Semgrep can be installed via pip --user, which puts the binary in a directory
 * that is NOT on the default PATH (e.g. ~/Library/Python/3.11/bin on macOS).
 * This module resolves the binary to its full path so that both the CLI and the
 * VulnerabilityDetectionService can invoke it without requiring the user to
 * manually add anything to their PATH.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

/**
 * Ask Python where it puts --user scripts for the running python3.
 * Returns the bin directory (e.g. /Users/foo/Library/Python/3.11/bin) or null.
 */
export async function getPipUserBinDir(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'python3',
      ['-c', 'import site, os; print(os.path.join(site.getuserbase(), "bin"))'],
      { timeout: 5_000, maxBuffer: 512 },
    );
    const dir = stdout.trim();
    return dir.length > 0 ? dir : null;
  } catch {
    return null;
  }
}

/** Return true if `filePath` exists and is executable by the current user. */
export function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build candidate absolute paths for semgrep when it is NOT on PATH.
 * Checks (in order):
 *   1. The pip --user bin dir reported by Python itself (most accurate).
 *   2. ~/.local/bin  (Linux default for pip --user).
 *   3. ~/Library/Python/<ver>/bin  (macOS default for pip --user).
 *   4. Homebrew Cellar (macOS/Linux) — for brew-installed but unlinked semgrep.
 */
export async function getSemgrepCandidatePaths(): Promise<string[]> {
  const candidates: string[] = [];

  const pipBin = await getPipUserBinDir();
  if (pipBin) candidates.push(path.join(pipBin, 'semgrep'));

  if (process.env.HOME) {
    const home = process.env.HOME;
    candidates.push(path.join(home, '.local', 'bin', 'semgrep'));

    if (process.platform === 'darwin') {
      const pyLib = path.join(home, 'Library', 'Python');
      if (fs.existsSync(pyLib)) {
        try {
          for (const ver of fs.readdirSync(pyLib)) {
            if (/^\d+\.\d+$/.test(ver)) {
              candidates.push(path.join(pyLib, ver, 'bin', 'semgrep'));
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  // Homebrew Cellar fallback (for brew-installed but unlinked semgrep)
  const brewPrefixes = ['/usr/local/Cellar', '/opt/homebrew/Cellar'];
  for (const cellar of brewPrefixes) {
    const semgrepCellar = path.join(cellar, 'semgrep');
    if (fs.existsSync(semgrepCellar)) {
      try {
        // Get the latest installed version directory
        const versions = fs.readdirSync(semgrepCellar).filter((v) => /^\d/.test(v));
        if (versions.length > 0) {
          // Sort descending to get newest version first
          versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
          candidates.push(path.join(semgrepCellar, versions[0], 'bin', 'semgrep'));
        }
      } catch {
        /* ignore */
      }
    }
  }

  return candidates;
}

/**
 * Check if a binary is available on PATH by running `binary --version`.
 * Returns { available, version } or { available: false }.
 */
export async function isToolOnPath(
  binary: string,
): Promise<{ available: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execFileAsync(binary, ['--version'], {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return { available: true, version: stdout.trim().split('\n')[0] };
  } catch {
    return { available: false, error: `${binary} not found or not executable` };
  }
}

/**
 * Resolves the semgrep binary to use for running scans.
 *
 * Returns:
 *   - `'semgrep'`        if the bare name works (it is on PATH).
 *   - An absolute path   if found in a pip/user directory off PATH.
 *   - `null`             if semgrep is not installed anywhere we can find.
 *
 * Use the return value as the first argument to execFile/spawn so the
 * tool is invoked correctly regardless of the user's PATH.
 */
export async function resolveSemgrepBinary(): Promise<string | null> {
  // Fast path: semgrep is already on PATH.
  try {
    await execFileAsync('semgrep', ['--version'], { timeout: 10_000, maxBuffer: 4096 });
    return 'semgrep';
  } catch {
    /* not on PATH — fall through to pip/user lookup */
  }

  // Slow path: search known pip/user locations.
  const candidates = await getSemgrepCandidatePaths();
  const seen = new Set<string>();
  for (const bin of candidates) {
    if (seen.has(bin)) continue;
    seen.add(bin);
    if (isExecutable(bin)) return bin;
  }

  return null;
}
