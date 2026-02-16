# Frontend Integration & Deployment Guide

## 🎯 Overview

This guide explains how the **React-based Interactive Dashboard** integrates with ArchDoc CLI, how users interact with it, and deployment options.

---

## 🏗️ Architecture: How It All Fits Together

```
┌─────────────────────────────────────────────────────────────┐
│                    USER WORKFLOW                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Run ArchDoc CLI Analysis                          │
│  $ archdoc analyze ./my-project                             │
│                                                             │
│  - Analyzes codebase with 8+ agents                        │
│  - Generates JSON cache files                              │
│  - Outputs: .archdoc/cache/*.json                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Generate Interactive Dashboard                    │
│  $ archdoc export --format html-interactive                 │
│                                                             │
│  - Reads JSON cache files                                  │
│  - Generates static React site                             │
│  - Outputs: ./archdoc-dashboard/ (HTML/CSS/JS)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: View Dashboard (Choose One)                       │
│                                                             │
│  Option A: Local Preview                                   │
│  $ archdoc serve                                            │
│  → Opens http://localhost:3000                             │
│                                                             │
│  Option B: Deploy to Hosting                               │
│  $ archdoc deploy --platform github-pages                   │
│  → Deploys to https://username.github.io/project-docs      │
│                                                             │
│  Option C: Manual Deployment                               │
│  - Upload ./archdoc-dashboard/ to any static host          │
│  - Works with: Netlify, Vercel, S3, Azure, etc.            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 How the Frontend Works

### **1. Static Site Generation (No Backend Required)**

The dashboard is a **100% static site** - just HTML, CSS, and JavaScript files:

```
archdoc-dashboard/
├── index.html                 # Entry point
├── assets/
│   ├── index-[hash].js       # React app bundle
│   ├── index-[hash].css      # Styles
│   └── ...
└── archdoc-data/             # JSON data files
    ├── architecture-analysis.json
    ├── dependency-graph.json
    ├── user-flows.json
    ├── security-analysis.json
    ├── metrics.json
    ├── drift-history.json
    ├── pentest-analysis.json
    └── threat-model.json
```

**Key Points:**
- ✅ No server needed (just static files)
- ✅ No database (reads from JSON files)
- ✅ No API calls (all data is local)
- ✅ Works offline (PWA support)
- ✅ Fast loading (<3s initial load)

### **2. Data Flow**

```
CLI Analysis → JSON Cache → Dashboard Generation → Static Site
```

**Example:**

```bash
# 1. Analyze your project
$ cd /path/to/my-project
$ archdoc analyze .

✓ File Structure Agent completed (150 files analyzed)
✓ Dependency Analyzer completed (45 dependencies found)
✓ Security Agent completed (3 vulnerabilities found)
...
✓ Analysis complete! Results saved to .archdoc/cache/

# 2. Generate dashboard
$ archdoc export --format html-interactive --output ./docs-site

✓ Reading cache files...
✓ Generating React dashboard...
✓ Building static site...
✓ Dashboard generated at ./docs-site/
✓ Total size: 2.3 MB (gzipped: 450 KB)

# 3. Preview locally
$ archdoc serve ./docs-site

✓ Server running at http://localhost:3000
✓ Press Ctrl+C to stop
```

---

## 👤 User Workflow

### **Scenario 1: Developer Exploring Architecture**

**Goal:** Understand the codebase architecture

1. **Run Analysis** (one-time or periodic):
   ```bash
   archdoc analyze ./my-project
   ```

2. **Generate Dashboard**:
   ```bash
   archdoc export --format html-interactive
   ```

3. **Open Dashboard**:
   ```bash
   archdoc serve
   # Opens browser at http://localhost:3000
   ```

4. **Explore**:
   - View architecture map (dependency graph)
   - Search for specific components
   - Check file dependencies
   - Review user flows

### **Scenario 2: Security Team Performing Pentest**

**Goal:** Identify vulnerabilities and attack surfaces

1. **Run Security Analysis**:
   ```bash
   archdoc analyze ./my-project --agents pentest,security,dependencies
   ```

2. **Generate Dashboard**:
   ```bash
   archdoc export --format html-interactive
   ```

3. **Open Security Views**:
   - Navigate to **Attack Surface** page
   - Filter high-risk endpoints
   - Review vulnerabilities in **Vulnerability Explorer**
   - Analyze threat model (STRIDE matrix)

4. **Export Report**:
   ```bash
   archdoc export --format pentest-report --output pentest-findings.pdf
   ```

### **Scenario 3: Team Sharing Documentation**

**Goal:** Share architecture docs with the team

1. **Run Analysis**:
   ```bash
   archdoc analyze ./my-project
   ```

2. **Deploy to GitHub Pages**:
   ```bash
   archdoc deploy --platform github-pages
   ```

   This automatically:
   - Generates the dashboard
   - Pushes to `gh-pages` branch
   - Enables GitHub Pages
   - Provides URL: `https://username.github.io/my-project-docs`

3. **Share URL** with team members

4. **Update Periodically**:
   ```bash
   # Re-run analysis and redeploy
   archdoc analyze ./my-project
   archdoc deploy --platform github-pages
   ```

---

## 🚀 Deployment Options

### **Option 1: GitHub Pages** (Recommended for Open Source)

**Pros:** Free, automatic HTTPS, easy updates
**Cons:** Public only (unless GitHub Pro)

```bash
# One-time setup
archdoc deploy --platform github-pages --setup

# Deploy/update
archdoc analyze ./my-project
archdoc deploy --platform github-pages
```

**Result:** `https://username.github.io/project-docs`

---

### **Option 2: Netlify** (Recommended for Teams)

**Pros:** Free tier, automatic deploys, custom domains, password protection
**Cons:** Requires Netlify account

```bash
# One-time setup
archdoc deploy --platform netlify --setup

# Deploy/update
archdoc analyze ./my-project
archdoc deploy --platform netlify
```

**Result:** `https://my-project-docs.netlify.app`

**Advanced:** Connect to Git for automatic deploys:
```bash
# In your repo root
echo "archdoc analyze . && archdoc export --format html-interactive --output ./public" > build.sh

# netlify.toml
[build]
  command = "sh build.sh"
  publish = "public"
```

Now every Git push triggers a new analysis and deployment!

---

### **Option 3: Vercel** (Recommended for Next.js Projects)

**Pros:** Fast CDN, automatic deploys, serverless functions (future features)
**Cons:** Requires Vercel account

```bash
archdoc deploy --platform vercel
```

---

### **Option 4: Self-Hosted** (Recommended for Enterprise)

**Pros:** Full control, private hosting, custom infrastructure
**Cons:** Requires server management

```bash
# Generate dashboard
archdoc export --format html-interactive --output ./dashboard

# Upload to your server (example with rsync)
rsync -avz ./dashboard/ user@your-server.com:/var/www/archdoc/

# Or use Docker
docker run -p 8080:80 -v ./dashboard:/usr/share/nginx/html nginx
```

---

### **Option 5: AWS S3 + CloudFront**

**Pros:** Scalable, fast CDN, pay-as-you-go
**Cons:** AWS complexity

```bash
# Generate dashboard
archdoc export --format html-interactive --output ./dashboard

# Upload to S3
aws s3 sync ./dashboard/ s3://my-archdoc-bucket/ --delete

# Enable static website hosting
aws s3 website s3://my-archdoc-bucket/ --index-document index.html
```

---

## 🔄 Update Workflow

### **Manual Updates**

```bash
# 1. Re-run analysis (e.g., after code changes)
archdoc analyze ./my-project

# 2. Regenerate dashboard
archdoc export --format html-interactive

# 3. Redeploy
archdoc deploy --platform github-pages
```

### **Automated Updates (CI/CD)**

**GitHub Actions Example:**

```yaml
# .github/workflows/archdoc.yml
name: Update Architecture Docs

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install ArchDoc
        run: npm install -g @archdoc/cli

      - name: Run Analysis
        run: archdoc analyze . --config .archdoc/config.json
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Generate Dashboard
        run: archdoc export --format html-interactive --output ./docs-site

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs-site
```

Now your architecture docs update automatically on every push!

---

## 🔐 Access Control

### **Public Documentation**
- GitHub Pages (public repos)
- Netlify (public sites)
- No authentication needed

### **Private Documentation**

**Option 1: Netlify Password Protection**
```bash
archdoc deploy --platform netlify --password "team-secret-123"
```

**Option 2: GitHub Pages (Private Repos)**
- Requires GitHub Pro/Team
- Only org members can access

**Option 3: Self-Hosted with Auth**
- Use Nginx with basic auth
- Use OAuth proxy (e.g., oauth2-proxy)
- Integrate with corporate SSO

**Example: Nginx Basic Auth**
```nginx
server {
  listen 80;
  server_name archdoc.company.com;

  root /var/www/archdoc;

  auth_basic "Architecture Documentation";
  auth_basic_user_file /etc/nginx/.htpasswd;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## 📊 Integration with Existing Tools

### **1. Confluence Integration**

Export to Confluence instead of (or in addition to) the dashboard:

```bash
archdoc export --format confluence --space ARCH
```

### **2. Notion Integration**

```bash
archdoc export --format notion --database <database-id>
```

### **3. Slack Notifications**

```bash
# In CI/CD, notify team when docs are updated
archdoc analyze . && \
archdoc deploy --platform netlify && \
curl -X POST $SLACK_WEBHOOK -d '{"text":"Architecture docs updated!"}'
```

---

## 🎨 Customization

### **Branding**

```bash
# Custom logo and colors
archdoc export --format html-interactive \
  --logo ./company-logo.png \
  --primary-color "#FF6B35" \
  --title "MyCompany Architecture"
```

### **Custom Domain**

**GitHub Pages:**
```bash
# Add CNAME file
echo "docs.mycompany.com" > ./docs-site/CNAME
archdoc deploy --platform github-pages
```

**Netlify:**
```bash
archdoc deploy --platform netlify --domain docs.mycompany.com
```

---

## 💡 Best Practices

### **1. Version Control the Dashboard**

**Option A:** Commit generated dashboard to repo
```bash
# Generate dashboard
archdoc export --format html-interactive --output ./docs

# Commit to repo
git add docs/
git commit -m "Update architecture docs"
git push
```

**Option B:** Generate on-demand (don't commit)
- Add `docs/` to `.gitignore`
- Generate in CI/CD only
- Keeps repo clean

### **2. Incremental Updates**

```bash
# Only analyze changed files (faster)
archdoc analyze . --incremental
```

### **3. Multiple Environments**

```bash
# Development
archdoc analyze ./src --env dev --output .archdoc/dev/

# Production
archdoc analyze ./src --env prod --output .archdoc/prod/

# Generate separate dashboards
archdoc export --format html-interactive --input .archdoc/dev/ --output ./docs-dev
archdoc export --format html-interactive --input .archdoc/prod/ --output ./docs-prod
```

---

## 🐛 Troubleshooting

### **Dashboard Not Loading**

1. Check browser console for errors
2. Verify JSON files exist in `archdoc-data/`
3. Check file permissions (must be readable)
4. Try clearing browser cache

### **Deployment Failed**

```bash
# Check CLI version
archdoc --version

# Verify credentials
archdoc deploy --platform github-pages --dry-run

# Check logs
archdoc deploy --platform netlify --verbose
```

### **Data Not Updating**

```bash
# Clear cache and re-analyze
rm -rf .archdoc/cache/
archdoc analyze . --force
```

---

## 📈 Performance Tips

1. **Enable Gzip Compression** (reduces size by ~70%)
2. **Use CDN** (faster global access)
3. **Lazy Load Pages** (faster initial load)
4. **Cache JSON Files** (browser caching)
5. **Optimize Images** (compress screenshots/diagrams)

---

## 🔗 Summary

**Simple Workflow:**
```bash
# 1. Analyze
archdoc analyze ./my-project

# 2. Generate
archdoc export --format html-interactive

# 3. Deploy
archdoc deploy --platform github-pages
```

**Result:** Beautiful, interactive architecture documentation accessible at a URL!

**Key Takeaways:**
- ✅ Dashboard is **static** (no backend needed)
- ✅ Data comes from **JSON cache files**
- ✅ Deploy anywhere (GitHub Pages, Netlify, S3, etc.)
- ✅ Update via CLI or CI/CD
- ✅ Works offline (PWA)
- ✅ Fast and secure

---

## 💬 Questions?

- 📚 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/techdebtgpt/architecture-doc-generator/issues)
- 💬 [Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
