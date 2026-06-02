export interface DependencyInfo {
  name: string;
  version: string;
}

export interface ManifestParser {
  packageManager: string;
  matches(filename: string): boolean;
  parse(content: string): Promise<{
    production: DependencyInfo[];
    development: DependencyInfo[];
  }>;
}

export const MANIFEST_PARSERS: ManifestParser[] = [
  // 1. package.json (npm/yarn/pnpm)
  {
    packageManager: 'npm/yarn/pnpm',
    matches: (filename) => filename === 'package.json',
    parse: async (content) => {
      try {
        const pkg = JSON.parse(content);
        const production = pkg.dependencies
          ? Object.entries(pkg.dependencies).map(([name, version]) => ({
              name,
              version: String(version),
            }))
          : [];
        const development = pkg.devDependencies
          ? Object.entries(pkg.devDependencies).map(([name, version]) => ({
              name,
              version: String(version),
            }))
          : [];
        return { production, development };
      } catch {
        return { production: [], development: [] };
      }
    },
  },
  // 2. requirements.txt (pip)
  {
    packageManager: 'pip',
    matches: (filename) => filename === 'requirements.txt',
    parse: async (content) => {
      const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      const production = lines.map((line) => {
        const [name, version] = line.split(/[=<>~]/);
        return { name: name.trim(), version: version?.trim() || 'latest' };
      });
      return { production, development: [] };
    },
  },
  // 3. packages.config (NuGet)
  {
    packageManager: 'nuget',
    matches: (filename) => filename === 'packages.config',
    parse: async (content) => {
      const production: DependencyInfo[] = [];
      const matches = content.matchAll(/<package\s+id="([^"]+)"\s+version="([^"]+)"/g);
      for (const match of matches) {
        production.push({ name: match[1], version: match[2] });
      }
      return { production, development: [] };
    },
  },
  // 4. .csproj (NuGet PackageReferences)
  {
    packageManager: 'nuget',
    matches: (filename) => filename.endsWith('.csproj'),
    parse: async (content) => {
      const production: DependencyInfo[] = [];
      const matches1 = content.matchAll(/<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"/g);
      for (const match of matches1) {
        production.push({ name: match[1], version: match[2] });
      }
      const matches2 = content.matchAll(
        /<PackageReference\s+Include="([^"]+)"[^>]*>\s*<Version>([^<]+)<\/Version>/g,
      );
      for (const match of matches2) {
        production.push({ name: match[1], version: match[2] });
      }
      return { production, development: [] };
    },
  },
  // 5. go.mod (Go modules)
  {
    packageManager: 'go modules',
    matches: (filename) => filename === 'go.mod',
    parse: async (content) => {
      const production: DependencyInfo[] = [];
      const singleMatches = content.matchAll(/^\s*require\s+([^\s()]+)\s+([^\s()]+)/gm);
      for (const match of singleMatches) {
        production.push({ name: match[1], version: match[2] });
      }
      const blockMatch = content.match(/require\s*\(([\s\S]*?)\)/);
      if (blockMatch) {
        const blockLines = blockMatch[1].split('\n');
        for (const line of blockLines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('//')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
              production.push({ name: parts[0], version: parts[1] });
            }
          }
        }
      }
      return { production, development: [] };
    },
  },
  // 6. Cargo.toml (Rust Cargo)
  {
    packageManager: 'cargo',
    matches: (filename) => filename === 'Cargo.toml',
    parse: async (content) => {
      const production: DependencyInfo[] = [];
      const development: DependencyInfo[] = [];
      const lines = content.split('\n');
      let section: 'none' | 'dependencies' | 'dev-dependencies' = 'none';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[')) {
          if (trimmed === '[dependencies]') {
            section = 'dependencies';
          } else if (trimmed === '[dev-dependencies]') {
            section = 'dev-dependencies';
          } else {
            section = 'none';
          }
          continue;
        }
        if (section === 'none' || !trimmed || trimmed.startsWith('#')) continue;
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const val = parts.slice(1).join('=').trim();
          let version = 'latest';
          if (val.startsWith('{')) {
            const verMatch = val.match(/version\s*=\s*"([^"]+)"/);
            if (verMatch) version = verMatch[1];
          } else {
            version = val.replace(/"/g, '');
          }
          if (section === 'dependencies') {
            production.push({ name, version });
          } else {
            development.push({ name, version });
          }
        }
      }
      return { production, development };
    },
  },
  // 7. pom.xml (Maven)
  {
    packageManager: 'maven',
    matches: (filename) => filename === 'pom.xml',
    parse: async (content) => {
      const production: DependencyInfo[] = [];
      const depBlockRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
      const matches = content.matchAll(depBlockRegex);
      for (const match of matches) {
        const block = match[1];
        const groupId = block.match(/<groupId>([^<]+)<\/groupId>/)?.[1]?.trim();
        const artifactId = block.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1]?.trim();
        const version = block.match(/<version>([^<]+)<\/version>/)?.[1]?.trim() || 'latest';
        if (groupId && artifactId) {
          production.push({ name: `${groupId}:${artifactId}`, version });
        }
      }
      return { production, development: [] };
    },
  },
  // 8. build.gradle / build.gradle.kts (Gradle)
  {
    packageManager: 'gradle',
    matches: (filename) => filename === 'build.gradle' || filename === 'build.gradle.kts',
    parse: async (content) => {
      const production: DependencyInfo[] = [];
      const gradleDepRegex = /(?:implementation|api|compile)\s*\(?\s*['"]([^'"]+)['"]\s*\)?/g;
      const matches = content.matchAll(gradleDepRegex);
      for (const match of matches) {
        const dep = match[1];
        const parts = dep.split(':');
        if (parts.length >= 2) {
          production.push({ name: `${parts[0]}:${parts[1]}`, version: parts[2] || 'latest' });
        } else {
          production.push({ name: dep, version: 'latest' });
        }
      }
      return { production, development: [] };
    },
  },
  // 9. composer.json (PHP Composer)
  {
    packageManager: 'composer',
    matches: (filename) => filename === 'composer.json',
    parse: async (content) => {
      try {
        const pkg = JSON.parse(content);
        const production = pkg.require
          ? Object.entries(pkg.require).map(([name, version]) => ({
              name,
              version: String(version),
            }))
          : [];
        const development = pkg['require-dev']
          ? Object.entries(pkg['require-dev']).map(([name, version]) => ({
              name,
              version: String(version),
            }))
          : [];
        return { production, development };
      } catch {
        return { production: [], development: [] };
      }
    },
  },
  // 10. Gemfile (Ruby Bundler)
  {
    packageManager: 'bundler',
    matches: (filename) => filename === 'Gemfile',
    parse: async (content) => {
      const production: DependencyInfo[] = [];
      const gemRegex = /gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/g;
      const matches = content.matchAll(gemRegex);
      for (const match of matches) {
        production.push({ name: match[1], version: match[2] || 'latest' });
      }
      return { production, development: [] };
    },
  },
];
