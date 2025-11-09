# Testing Guide: MCP Server Config & validate_architecture Fixes

This guide helps you test the recent fixes to ensure:
1. ✅ Config is loaded correctly from `.archdoc.config.json`
2. ✅ LLMService is initialized with proper config
3. ✅ Full documentation is loaded (no 2000 char truncation)
4. ✅ Vector store provides intelligent context
5. ✅ `validate_architecture` works with full context

---

## Prerequisites

1. **Config file exists**: `.archdoc.config.json` in project root
2. **API keys configured**: At least one provider (anthropic, openai, google, xai)
3. **Project built**: Run `npm run build`

---

## Test 1: Config Loading ✅

**What it tests**: Config is properly loaded and applied to environment

```bash
# Run automated test
node test-mcp-config.js
```

**Expected output**:
```
✅ Config loaded successfully
   Provider: anthropic
   Model: claude-sonnet-4-20250514
   Search Mode: keyword
   Has API Key: ✓

✅ ANTHROPIC_API_KEY is set
✅ LLMService initialized successfully
```

**What to verify**:
- ✅ Config loads without errors
- ✅ Provider and model are shown
- ✅ Environment variables are set
- ✅ LLMService initializes

---

## Test 2: Generate Documentation

**What it tests**: Documentation generation and vector store creation

```bash
# Generate documentation (this will create .arch-docs/)
npm run cli -- analyze . --verbose
```

**Expected output**:
```
📄 Config loaded successfully
🎯 Analyzing project...
✅ Documentation generated successfully!
```

**What to verify**:
- ✅ `.arch-docs/` folder is created
- ✅ Multiple `.md` files exist (architecture.md, patterns.md, etc.)
- ✅ Files are NOT empty
- ✅ Files are larger than 2000 chars (check with `ls -lh .arch-docs/`)

---

## Test 3: Full Documentation Loading ✅

**What it tests**: Documentation loads without truncation

```bash
# Run automated test
node test-validate-architecture.js
```

**Expected output**:
```
✅ architecture.md: 15234 chars (14.88 KB)
   ✓ Full content (exceeds old 2000 char limit)
✅ patterns.md: 8567 chars (8.37 KB)
   ✓ Full content (exceeds old 2000 char limit)

📊 Total documentation: 23801 chars (23.24 KB) across 2 files
   Old implementation would have used only 4000 chars max
   New implementation uses ALL 23801 chars! 🎉
```

**What to verify**:
- ✅ Character counts are > 2000 (old truncation limit)
- ✅ Total chars significantly exceed 4000 (old limit for both files)
- ✅ Vector store initializes successfully

---

## Test 4: MCP Server Startup

**What it tests**: MCP server starts with proper config

```bash
# Start MCP server
npm run mcp:dev
```

**Expected output** (in logs):
```
Starting ArchDoc MCP Server...
✅ Found configuration at c:\path\to\.archdoc.config.json
✅ Configuration valid - Provider: anthropic, Model: claude-sonnet-4-20250514
✅ MCP Server running (stdio mode)
```

**What to verify**:
- ✅ Config is found and loaded
- ✅ No errors about missing API keys
- ✅ Server starts successfully

---

## Test 5: validate_architecture via MCP Client

**What it tests**: End-to-end validation with full documentation context

### Option A: Using Claude Desktop

1. **Configure MCP in Claude Desktop**:
   - Open Claude Desktop settings
   - Add MCP server configuration
   - Point to your `archdoc-mcp` server

2. **Test command**:
   ```
   Use the validate_architecture tool to check if this file follows the architecture:
   <path to a TypeScript file in your project>
   ```

3. **What to verify**:
   - ✅ Tool executes without errors
   - ✅ Returns detailed validation (not just "no docs found")
   - ✅ References specific patterns from your architecture docs
   - ✅ Provides actionable recommendations

### Option B: Using MCP Inspector

1. **Install MCP Inspector**:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. **Start inspector**:
   ```bash
   mcp-inspector
   ```

3. **Connect to server**: Point to `node dist/src/mcp-server/index.js`

4. **Call validate_architecture**:
   ```json
   {
     "filePath": "src/mcp-server/index.ts"
   }
   ```

5. **What to verify**:
   - ✅ Returns structured response
   - ✅ No truncation errors
   - ✅ References full architecture docs

---

## Test 6: Compare Old vs New Behavior

### Old Behavior (Before Fix):
```
❌ Only 2000 chars from architecture.md
❌ Only 2000 chars from patterns.md
❌ Only 3000 chars from file being validated
❌ Total context: ~7000 chars
❌ Max response tokens: 2048
```

### New Behavior (After Fix):
```
✅ FULL architecture.md (e.g., 15,000 chars)
✅ FULL patterns.md (e.g., 8,500 chars)
✅ FULL file being validated (no limit)
✅ Smart RAG: Top 10 relevant doc sections
✅ Max response tokens: 4096
✅ Total context: 20,000+ chars!
```

---

## Debugging Issues

### Issue: "No config found"
**Solution**:
1. Check `.archdoc.config.json` exists in project root
2. Verify JSON is valid
3. Run `node test-mcp-config.js` to diagnose

### Issue: "No architecture documentation found"
**Solution**:
1. Run `npm run cli -- analyze .` first
2. Check `.arch-docs/` folder exists
3. Verify files are not empty

### Issue: "Vector store initialization failed"
**Solution**:
1. Check if `.arch-docs/` has `.md` files
2. Verify files are readable
3. Fallback will still work (loads full docs directly)

### Issue: "API key not working"
**Solution**:
1. Check `.archdoc.config.json` has correct key
2. Verify key format (starts with sk-ant-, sk-, etc.)
3. Test key with: `node test-mcp-config.js`

---

## Success Criteria ✅

All tests pass if:
- [x] Config loads correctly
- [x] Environment variables are set
- [x] LLMService initializes
- [x] Documentation files exist and are > 2000 chars each
- [x] Vector store initializes (or graceful fallback)
- [x] MCP server starts without errors
- [x] `validate_architecture` returns detailed analysis

---

## Quick Test Command

Run all automated tests:
```bash
npm run build && \
node test-mcp-config.js && \
node test-validate-architecture.js
```

---

## Next Steps

After all tests pass:
1. ✅ Try `validate_architecture` on a real file
2. ✅ Compare with previous truncated results
3. ✅ Verify recommendations are more detailed
4. ✅ Check that architecture patterns are properly referenced

🎉 **Congratulations!** Your MCP server now has proper config loading and full documentation context!
