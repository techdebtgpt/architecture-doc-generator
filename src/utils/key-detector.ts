import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DetectedKey {
  provider: 'anthropic' | 'openai' | 'google' | 'xai';
  key: string;
  source: string;
  model?: string;
}

/**
 * Detects API keys from various IDE configurations and tools
 */
export async function detectKeys(): Promise<DetectedKey | null> {
  // 1. Check for Claude Code / Claude CLI
  const claudeKey = await detectClaudeKey();
  if (claudeKey) return claudeKey;

  // 2. Check for GitHub Copilot (often has OpenAI-compatible keys or specific tokens)
  // Note: Copilot tokens are complex and often rotate, but we can check for config
  const copilotKey = await detectCopilotKey();
  if (copilotKey) return copilotKey;

  // 3. Check for Google/Gemini (e.g. from gcloud or other tools)
  const googleKey = await detectGoogleKey();
  if (googleKey) return googleKey;

  return null;
}

/**
 * Detect Claude API key from config files
 */
async function detectClaudeKey(): Promise<DetectedKey | null> {
  const homeDir = os.homedir();
  const platform = os.platform();

  // Common paths for Claude config
  const paths = [
    // Claude Code / CLI
    path.join(homeDir, '.claude', 'config.json'),
    path.join(homeDir, '.claude', 'auth.json'),
    // Windows specific
    platform === 'win32' ? path.join(process.env.APPDATA || '', 'Claude', 'config.json') : null,
    platform === 'win32' ? path.join(process.env.APPDATA || '', 'Claude Code', 'config.json') : null,
    // macOS specific
    platform === 'darwin'
      ? path.join(homeDir, 'Library', 'Application Support', 'Claude', 'config.json')
      : null,
  ].filter((p): p is string => !!p);

  for (const configPath of paths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        // Look for various key formats in the config
        // This is a best-guess based on common structures
        if (config.apiKey || config.anthropicApiKey || config.key) {
          const key = config.apiKey || config.anthropicApiKey || config.key;
          if (typeof key === 'string' && key.startsWith('sk-ant-')) {
            return {
              provider: 'anthropic',
              key,
              source: `Claude Config (${configPath})`,
            };
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Check environment variables as a fallback (though usually handled by the app itself,
  // this helps if the user has them set globally but not in the app config)
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      key: process.env.ANTHROPIC_API_KEY,
      source: 'Environment Variable (ANTHROPIC_API_KEY)',
    };
  }

  return null;
}

/**
 * Detect GitHub Copilot token/key
 * Note: Copilot uses an oauth token usually, but sometimes users configure
 * specific keys for extensions.
 */
async function detectCopilotKey(): Promise<DetectedKey | null> {
  const homeDir = os.homedir();
  const platform = os.platform();

  // JetBrains Copilot config
  // Windows: %APPDATA%\JetBrains\<Product>\options\github-copilot.xml
  // But finding the specific product folder is hard.
  // We can try to look for a generic copilot hosts file or similar.

  // VS Code Copilot is harder to read as it's encrypted in the state.db usually.

  // However, some users might have `github-copilot-cli` or similar tools.
  const paths = [
    path.join(homeDir, '.config', 'github-copilot', 'hosts.json'),
    path.join(homeDir, '.github-copilot', 'config.json'),
  ];

  if (platform === 'win32' && process.env.LOCALAPPDATA) {
    paths.push(path.join(process.env.LOCALAPPDATA, 'github-copilot', 'config.json'));
  }

  for (const configPath of paths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        // Heuristic parsing
        if (content.includes('sk-')) {
          // If we find something that looks like an OpenAI key in a copilot config,
          // it might be a user-configured override.
          const match = content.match(/sk-[a-zA-Z0-9]{20,}/);
          if (match) {
            return {
              provider: 'openai', // Copilot often uses OpenAI models under the hood or allows overrides
              key: match[0],
              source: `GitHub Copilot Config (${configPath})`,
            };
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Detect Google/Gemini key
 */
async function detectGoogleKey(): Promise<DetectedKey | null> {
  // Check for gcloud ADC or specific gemini config
  // This is less standard, but we can check env vars or common config locations
  const homeDir = os.homedir();
  const configPath = path.join(homeDir, '.config', 'google', 'gemini_config.json'); // Hypothetical standard

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      if (config.key && config.key.startsWith('AIza')) {
        return {
          provider: 'google',
          key: config.key,
          source: `Google Config (${configPath})`,
        };
      }
    }
  } catch {
    // Ignore
  }

  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.startsWith('AIza')) {
    return {
      provider: 'google',
      key: process.env.GOOGLE_API_KEY,
      source: 'Environment Variable (GOOGLE_API_KEY)',
    };
  }

  return null;
}
