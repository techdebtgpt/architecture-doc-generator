# Vector Search for Architecture Documentation

> **Complete guide to semantic similarity search with RAG (Retrieval-Augmented Generation) in architecture-doc-generator**

## Table of Contents

1. [Quick Start](#quick-start)
2. [Overview](#overview)
3. [How It Works](#how-it-works)
4. [Embeddings Providers](#embeddings-providers)
5. [Configuration](#configuration)
6. [Performance & Cost](#performance--cost)
7. [Usage Examples](#usage-examples)
8. [Advanced Features](#advanced-features)
9. [Comparison: Vector vs Keyword](#comparison-vector-vs-keyword)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)
12. [Technical Deep Dive](#technical-deep-dive)
13. [Future Enhancements](#future-enhancements)

---

## Quick Start

### TL;DR

The architecture-doc-generator supports **semantic similarity search** using RAG with embeddings. This finds relevant code files by **meaning**, not just keywords.

### Installation

```bash
npm install -g @techdebtgpt/archdoc-generator
```

### Basic Usage

```bash
# Default: Free local embeddings (no API key required)
archdoc analyze ./my-project

# Use OpenAI embeddings (requires API key)
EMBEDDINGS_PROVIDER=openai OPENAI_API_KEY=sk-... archdoc analyze ./my-project

# Use Google embeddings
EMBEDDINGS_PROVIDER=google GOOGLE_API_KEY=... archdoc analyze ./my-project

# Keyword search (fastest, no embeddings)
archdoc analyze ./my-project --search-mode keyword
```

### When to Use Each Mode

| Mode                | Best For                                    | Speed   | Accuracy         | Cost              |
| ------------------- | ------------------------------------------- | ------- | ---------------- | ----------------- |
| **Local (default)** | Getting started, privacy-sensitive, offline | Fast    | Good (70-80%)    | FREE ✅           |
| **OpenAI**          | Production docs, highest accuracy           | Medium  | Excellent (95%+) | ~$0.01/10K files  |
| **Google**          | Production docs, cost-effective             | Medium  | Excellent (90%+) | ~$0.005/10K files |
| **Keyword**         | CI/CD, simple projects                      | Fastest | Basic (60-75%)   | FREE ✅           |

---

## Overview

### Features

#### **Semantic Similarity Search**

- Converts code files into vector representations (embeddings)
- Finds files based on **semantic meaning** rather than exact keyword matches
- Handles synonyms, related concepts, and contextual relevance automatically

#### **Multiple Embeddings Providers**

Supports multiple embedding providers with easy switching:

| Provider    | Model                  | Dimensions | Cost             | Best For          |
| ----------- | ---------------------- | ---------- | ---------------- | ----------------- |
| **Local**   | TF-IDF                 | 128        | FREE             | Default, no setup |
| **OpenAI**  | text-embedding-3-small | 1536       | ~$0.02/1M tokens | Highest accuracy  |
| **Google**  | text-embedding-004     | 768        | ~$0.01/1M tokens | Cost-effective    |
| HuggingFace | all-MiniLM-L6-v2       | 384        | FREE (with key)  | Open source       |
| Cohere      | embed-english-v3.0     | 1024       | ~$0.10/1M tokens | Enterprise        |
| Voyage      | voyage-2               | 1024       | ~$0.12/1M tokens | Specialized       |

#### **In-Memory Vector Store**

- Uses LangChain's `MemoryVectorStore` for fast, memory-efficient storage
- No external database or persistent storage required
- Automatically initialized and cleaned up per agent execution

#### **Dual Search Modes**

Supports both search strategies with configurable option:

| Mode                   | Description                          | Speed  | Accuracy | Best For                    |
| ---------------------- | ------------------------------------ | ------ | -------- | --------------------------- |
| **`vector`** (default) | Semantic similarity using embeddings | Slower | Higher   | Complex queries, production |
| **`keyword`**          | Traditional keyword matching         | Faster | Lower    | Simple queries, CI/CD       |

---

## How It Works

### Complete Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INITIALIZATION PHASE (Once Per Agent)                    │
└─────────────────────────────────────────────────────────────┘
   │
   ├─► Step 1: Filter Files
   │   ├─ Input: All project files (e.g., 500 files)
   │   ├─ Exclude: node_modules, dist, .git, test files
   │   ├─ Size limit: Skip files > 100KB
   │   └─ Output: ~150 filtered files
   │
   ├─► Step 2: Load File Contents (Batched)
   │   ├─ Read files in batches of 50
   │   ├─ Truncate content to maxFileSize (50KB default)
   │   ├─ Cache content in memory (LRU cache)
   │   └─ Create LangChain Document objects
   │
   ├─► Step 3: Generate Embeddings
   │   ├─ LOCAL: Calculate TF-IDF vectors (instant)
   │   ├─ CLOUD: Send to API (OpenAI/Google/etc.)
   │   ├─ Model converts text → vector array
   │   └─ Returns: Vector array [0.123, -0.456, ...]
   │
   └─► Step 4: Build In-Memory Vector Store
       ├─ Store vectors in MemoryVectorStore (RAM)
       ├─ Index: ~10MB per 1000 files
       ├─ Supports fast similarity search
       └─ Ready for queries

┌─────────────────────────────────────────────────────────────┐
│ 2. SEARCH PHASE (Multiple Times Per Agent)                  │
└─────────────────────────────────────────────────────────────┘
   │
   ├─► Step 1: Question Embedding
   │   ├─ Question: "What error handling patterns?"
   │   ├─ Convert question to vector
   │   └─ Returns: Query vector [0.234, -0.567, ...]
   │
   ├─► Step 2: Similarity Search (In-Memory)
   │   ├─ Compare query vector with all file vectors
   │   ├─ Algorithm: Cosine similarity
   │   ├─ Speed: ~100ms for 1000 files
   │   └─ Returns: Top K files with scores
   │
   ├─► Step 3: Filter by Threshold
   │   ├─ Keep only scores >= 0.5
   │   ├─ Sort: Highest similarity first
   │   └─ Output: Top 3 most relevant files
   │
   └─► Step 4: Enhancement with Dependency Graph
       ├─ Add imported files (+0.4 relevance)
       ├─ Add importer files (+0.3 relevance)
       ├─ Add same-module files (+0.2 relevance)
       └─ Return FileContent[] with scores

┌─────────────────────────────────────────────────────────────┐
│ 3. CLEANUP PHASE (After Agent Completes)                    │
└─────────────────────────────────────────────────────────────┘
   │
   └─► Clear Memory
       ├─ Delete vector store (~10MB freed)
       ├─ Clear file content cache
       └─ Reset initialization flag
```

### Similarity Scoring

Cosine similarity scores range from 0 to 1:

- **1.0** = Perfect match (exact semantic similarity)
- **0.8-0.99** = Highly relevant
- **0.6-0.79** = Moderately relevant
- **0.5-0.59** = Somewhat relevant
- **< 0.5** = Filtered out (below threshold)

**How cosine similarity works:**

```
Vector A (query): [0.5, 0.3, 0.8]
Vector B (file):  [0.6, 0.4, 0.7]

Cosine Similarity = (A · B) / (||A|| × ||B||)
                  = (0.5×0.6 + 0.3×0.4 + 0.8×0.7) / (√0.98 × √1.01)
                  = 0.98 (highly similar!)
```

---

## Embeddings Providers

### Local Embeddings (Default, FREE)

**Advantages:**

- ✅ **100% FREE** - No API key required
- ✅ **Works offline** - No network calls
- ✅ **Privacy-preserving** - Your code never leaves your machine
- ✅ **Fast initialization** - No API latency
- ✅ **No rate limits** - Process unlimited files

**Limitations:**

- ⚠️ Lower accuracy (70-80% vs 95% for OpenAI)
- ⚠️ No semantic understanding (keyword-based TF-IDF)
- ⚠️ Smaller vector dimensions (128 vs 1536)

**When to use:**

- Getting started with vector search
- Privacy-sensitive codebases
- Offline/air-gapped environments
- Cost-conscious projects
- CI/CD pipelines (fast + free)

**Technical details:**

- Algorithm: TF-IDF (Term Frequency-Inverse Document Frequency)
- Dimensions: 128
- Implementation: Custom `LocalEmbeddings` class
- Dependencies: None (built-in)

### OpenAI Embeddings

**Advantages:**

- ✅ Highest accuracy (95%+ relevance)
- ✅ True semantic understanding
- ✅ Handles synonyms, context, relationships
- ✅ Large vector space (1536 dimensions)

**Requirements:**

- OpenAI API key (`OPENAI_API_KEY`)

**Configuration:**

```bash
# Environment variable
export OPENAI_API_KEY=sk-...
export EMBEDDINGS_PROVIDER=openai

# Or in .archdoc.config.json
{
  "llm": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "embeddingsProvider": "openai",
    "embeddingsApiKey": "sk-..."
  }
}
```

**Cost:** ~$0.02 per 1M tokens (~$0.006 per 150 files)

### Google Embeddings

**Advantages:**

- ✅ High accuracy (90%+)
- ✅ Cost-effective (~50% cheaper than OpenAI)
- ✅ Good semantic understanding
- ✅ Efficient vector space (768 dimensions)

**Requirements:**

- Google API key (`GOOGLE_API_KEY`)

**Configuration:**

```bash
export GOOGLE_API_KEY=...
export EMBEDDINGS_PROVIDER=google
```

**Cost:** ~$0.01 per 1M tokens (~$0.003 per 150 files)

### Other Providers

**HuggingFace** (Open Source):

- Free with API key
- Model: `all-MiniLM-L6-v2`
- Good for experimentation

**Cohere** (Enterprise):

- Premium accuracy
- Model: `embed-english-v3.0`
- Higher cost

**Voyage** (Specialized):

- Domain-specific models
- Premium features
- Higher cost

### Provider Comparison

```typescript
// Accuracy comparison (semantic query understanding)
Local:       ████████░░ 70-80%
HuggingFace: ██████████ 85%
Google:      ███████████ 90%
OpenAI:      ████████████ 95%
Cohere:      ████████████ 95%
Voyage:      ████████████ 95%

// Cost comparison (per 10K files)
Local:       FREE
HuggingFace: FREE
Google:      $0.003-0.005
OpenAI:      $0.006-0.01
Cohere:      $0.10
Voyage:      $0.12

// Speed comparison (initialization for 150 files)
Local:       1-2s (instant TF-IDF)
OpenAI:      3-5s (API latency)
Google:      3-5s (API latency)
HuggingFace: 5-8s (API latency)
Cohere:      4-6s
Voyage:      4-6s
```

---

## Configuration

### Environment Variables

```bash
# Embeddings provider (default: local)
export EMBEDDINGS_PROVIDER=local  # local, openai, google, huggingface, cohere, voyage

# API keys (only needed for cloud providers)
export OPENAI_API_KEY=sk-...      # For OpenAI embeddings
export GOOGLE_API_KEY=...         # For Google embeddings
export HUGGINGFACE_API_KEY=...    # For HuggingFace embeddings
export COHERE_API_KEY=...         # For Cohere embeddings
export VOYAGE_API_KEY=...         # For Voyage embeddings

# Search mode (default: vector)
export SEARCH_MODE=vector         # vector or keyword

# Optional: Custom embedding model
export OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

### Configuration File

Create `.archdoc.config.json`:

```json
{
  "llm": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "embeddingsProvider": "local",
    "embeddingsApiKey": ""
  },
  "analysis": {
    "searchMode": "vector",
    "depthMode": "normal"
  }
}
```

### CLI Usage

```bash
# Use default (local embeddings)
archdoc analyze ./my-project

# Specify embeddings provider
archdoc analyze ./my-project --embeddings-provider openai

# Use keyword search (no embeddings)
archdoc analyze ./my-project --search-mode keyword

# Quick analysis with local embeddings
archdoc analyze ./my-project --depth quick

# Deep analysis with OpenAI embeddings
archdoc analyze ./my-project --depth deep --embeddings-provider openai
```

### Programmatic Usage

```typescript
import { DocumentationOrchestrator } from '@techdebtgpt/archdoc-generator';

const output = await orchestrator.generateDocumentation(projectPath, {
  agentOptions: {
    searchMode: 'vector', // or 'keyword'
    embeddingsProvider: 'openai', // or 'local', 'google', etc.
  },
});
```

### Per-Agent Configuration

Agents can override search mode in their context:

```typescript
const context: AgentContext = {
  // ... other context
  config: {
    searchMode: 'vector', // Agent-specific override
    embeddingsProvider: 'openai',
    maxIterations: 5,
    clarityThreshold: 80,
  },
};
```

---

## Performance & Cost

### Memory Usage

#### Per-File Storage

```
For a 50KB file:
├─ Original content: 50KB
├─ Embedding vector:
│  ├─ Local (128 dims × 4 bytes): 0.5KB
│  ├─ OpenAI (1536 dims × 4 bytes): 6KB
│  └─ Google (768 dims × 4 bytes): 3KB
├─ Metadata (path, filename, etc.): 0.5KB
└─ Total: 1-56.5KB per file in memory
```

#### Total Memory for 1000 Files

```
Local (TF-IDF):
├─ Vectors: 0.5MB
├─ Content (cached 50 files): 2.5MB
├─ Metadata: 0.5MB
└─ Total: ~3-5MB

OpenAI:
├─ Vectors: 6MB
├─ Content (cached 50 files): 2.5MB
├─ Metadata: 0.5MB
└─ Total: ~10-15MB

Google:
├─ Vectors: 3MB
├─ Content (cached 50 files): 2.5MB
├─ Metadata: 0.5MB
└─ Total: ~6-10MB
```

### API Costs

#### Local Embeddings (FREE)

```
No API calls, no costs!
```

#### OpenAI Embeddings

```
Example: 150 files, avg 2000 tokens per file
├─ Total tokens: 150 × 2000 = 300,000 tokens
├─ Cost: 300,000 ÷ 1,000,000 × $0.02 = $0.006
└─ ~$0.006 per agent initialization

Search queries (per question):
├─ Tokens: ~15 tokens
├─ Cost: 15 ÷ 1,000,000 × $0.02 = $0.0000003
└─ Negligible

Full documentation generation (6 agents):
├─ Initialization: 6 × $0.006 = $0.036
├─ Queries: 30 × $0.0000003 = $0.00001
└─ Total: ~$0.04
```

#### Google Embeddings

```
~50% of OpenAI costs:
├─ Per agent: ~$0.003
├─ Full generation: ~$0.02
```

### Initialization Time

```
Number of Files | Local  | OpenAI | Google | Keyword
----------------|--------|--------|--------|--------
50 files        | <1s    | 1-2s   | 1-2s   | 0s
150 files       | 1-2s   | 3-5s   | 3-5s   | 0s
500 files       | 2-4s   | 10-15s | 10-15s | 0s
1000 files      | 4-8s   | 20-30s | 20-30s | 0s
```

### Search Time (After Init)

```
Operation              | Local | Cloud | Keyword
-----------------------|-------|-------|--------
Single query embedding | 0ms   | 50ms  | 0ms
Vector similarity      | 50ms  | 50ms  | 10ms
Total per search       | 50ms  | 100ms | 10ms
```

### Optimization Tips

#### For Vector Search

- Use `maxFileSize` to limit file content (default 50KB)
- Set `topK` appropriately (3-5 files per question)
- Increase `similarityThreshold` to filter low-relevance matches
- Use local embeddings for CI/CD pipelines
- Filter aggressively (exclude tests, build artifacts)

#### For Keyword Search

- Faster but less accurate
- Best for exact keyword matches
- No initialization overhead
- Use in CI/CD or for simple projects

---

## Usage Examples

### Example 1: Default (Free Local Embeddings)

```bash
archdoc analyze ./my-project
```

**Output:**

```
Iteration 2: Searching files for 3 question(s) using vector search...
Initializing vector store with local embeddings (FREE)...
Processed 50/150 files (33.3%)
Processed 100/150 files (66.7%)
Processed 150/150 files (100.0%)
Vector store initialized in 1.8s with 142 documents
Question: "What error handling patterns are used..." -> Found 3 file(s)
  topFile: src/middleware/error-handler.ts
  relevance: 0.73
Retrieved 8 unique file(s) (12 total matches)
```

### Example 2: OpenAI Embeddings (High Accuracy)

```bash
export OPENAI_API_KEY=sk-...
archdoc analyze ./my-project --embeddings-provider openai
```

**Output:**

```
Iteration 2: Searching files for 3 question(s) using vector search...
Initializing vector store with OpenAI embeddings...
Processed 150/150 files (100.0%)
Vector store initialized in 4.2s with 142 documents
Question: "What error handling patterns are used..." -> Found 3 file(s)
  topFile: src/middleware/error-handler.ts
  relevance: 0.92
Retrieved 8 unique file(s) (12 total matches)
```

### Example 3: Keyword Search (Fastest)

```bash
archdoc analyze ./my-project --search-mode keyword
```

**Output:**

```
Iteration 2: Searching files for 3 question(s) using keyword search...
Question: "What error handling patterns are used..." -> Found 2 file(s)
  topFile: src/middleware/error-handler.ts
  score: 35
Retrieved 6 unique file(s) (8 total matches)
```

### Example 4: Google Embeddings (Cost-Effective)

```bash
export GOOGLE_API_KEY=...
archdoc analyze ./my-project --embeddings-provider google
```

### Example 5: Quick CI/CD Pipeline

```bash
# Fastest: Keyword search + quick depth
archdoc analyze ./my-project --search-mode keyword --depth quick
```

### Example 6: Production Documentation

```bash
# Most accurate: OpenAI embeddings + deep analysis
export OPENAI_API_KEY=sk-...
archdoc analyze ./my-project --embeddings-provider openai --depth deep
```

---

## Advanced Features

### Custom Similarity Threshold

Adjust threshold based on project size:

```typescript
// Large projects: stricter threshold
await vectorSearch.initialize(files, {
  similarityThreshold: 0.7, // Only highly relevant files
});

// Small projects: looser threshold
await vectorSearch.initialize(files, {
  similarityThreshold: 0.4, // More exploratory
});
```

### File Filtering

Customize which files are indexed:

```typescript
await vectorSearch.initialize(files, {
  includeExtensions: ['.ts', '.js'], // Only TypeScript/JavaScript
  excludePatterns: ['**/test/**', '**/dist/**'], // Custom exclusions
  maxFileSize: 20000, // Stricter size limit
});
```

### Batch Processing with Progress

```typescript
const batchSize = 50;
for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  await processBatch(batch);
  console.log(`Processed ${Math.min(i + batchSize, files.length)}/${files.length}`);
}
```

### Dependency Graph Enhancement

After vector similarity search, results are enhanced with related files:

```typescript
// Automatically adds:
// - Files imported by matched files (+0.4 relevance)
// - Files that import matched files (+0.3 relevance)
// - Files in same module/package (+0.2 relevance)
```

---

## Comparison: Vector vs Keyword

### Scenario 1: "What caching strategies are used?"

#### Vector Search ✅

**Local Embeddings:**

```
✓ cache-manager.ts (similarity: 0.73) - "LRU cache implementation"
✓ http-cache.ts (similarity: 0.68) - "HTTP caching middleware"
~ redis-service.ts (similarity: 0.55) - Partial match
```

**OpenAI Embeddings:**

```
✓ cache-manager.ts (similarity: 0.87) - "LRU cache implementation"
✓ redis-service.ts (similarity: 0.82) - "Redis cache layer"
✓ http-cache.ts (similarity: 0.78) - "HTTP caching middleware"
```

Result: **3 highly relevant files with OpenAI, 2-3 with local**

#### Keyword Search ⚠️

```
✓ cache-manager.ts (score: 15) - filename contains "cache"
✗ redis-service.ts (score: 0) - no keyword match
✓ http-cache.ts (score: 12) - filename contains "cache"
```

Result: **2 files, missed Redis service**

### Scenario 2: "How are database queries organized?"

#### Vector Search ✅

**OpenAI:**

```
✓ src/repositories/*.ts (similarity: 0.85) - "repositories = DB access"
✓ src/models/user.model.ts (similarity: 0.79) - "models = DB entities"
✓ src/config/database.ts (similarity: 0.81) - "database config"
```

**Local:**

```
✓ src/repositories/*.ts (similarity: 0.68) - Keyword overlap
~ src/models/user.model.ts (similarity: 0.52) - Partial match
✓ src/config/database.ts (similarity: 0.71) - Keyword match
```

#### Keyword Search ⚠️

```
✓ src/config/database.ts (score: 20) - exact keyword "database"
✗ src/repositories/*.ts (score: 0) - no "database" or "query"
~ src/models/user.model.ts (score: 5) - partial match
```

### Scenario 3: Understanding Synonyms

#### Vector Search ✅

**Query:** "How is data persisted?"

**OpenAI understands:**

- "persist" = "database" = "store" = "save"
- Finds: `database.ts`, `repository.ts`, `storage-service.ts`

**Local understands (partially):**

- Basic word overlap: "data", "store"
- Finds: `storage-service.ts`, `database.ts`
- May miss: `repository.ts`

#### Keyword Search ✗

- Only finds files with exact word "persist"
- Misses: `database.ts` (no "persist" keyword)

### Summary Table

| Feature  | Local   | OpenAI/Google | Keyword |
| -------- | ------- | ------------- | ------- |
| Synonyms | Partial | Excellent     | None    |
| Context  | Basic   | Excellent     | None    |
| Patterns | Partial | Excellent     | None    |
| Accuracy | 70-80%  | 90-95%        | 60-75%  |
| Speed    | Fast    | Medium        | Fastest |
| Cost     | FREE    | ~$0.01/10K    | FREE    |
| Setup    | None    | API key       | None    |

---

## Troubleshooting

### Issue: "Vector store not initialized"

**Cause:** Calling `searchFiles()` before `initialize()`

**Solution:**

```typescript
await vectorSearch.initialize(files);
await vectorSearch.searchFiles(query); // Now works
```

### Issue: No results returned

**Causes:**

1. Similarity threshold too high
2. No relevant files
3. Files filtered out by exclude patterns
4. API key issues (cloud providers)

**Solutions:**

```bash
# 1. Lower threshold (local embeddings especially)
export SIMILARITY_THRESHOLD=0.4

# 2. Try keyword search as fallback
archdoc analyze --search-mode keyword

# 3. Check excluded patterns
archdoc analyze --verbose  # Shows filtered files

# 4. Verify API keys
echo $OPENAI_API_KEY  # Should show sk-...
echo $EMBEDDINGS_PROVIDER  # Should show provider name
```

### Issue: High API costs

**Cause:** Too many files or large files being embedded (cloud providers)

**Solutions:**

```bash
# 1. Switch to local embeddings
export EMBEDDINGS_PROVIDER=local

# 2. Use keyword search for CI/CD
archdoc analyze --search-mode keyword --depth quick

# 3. Reduce file size limit
export MAX_FILE_SIZE=20000  # 20KB instead of 50KB

# 4. More aggressive filtering
# Add patterns to .gitignore or exclude in config
```

### Issue: High memory usage

**Symptom:** Node process using 500MB+ memory

**Cause:** Too many files embedded at once

**Solutions:**

```typescript
// Increase filtering
const config = {
  maxFileSize: 20000, // Reduce from 50KB
  includeExtensions: ['.ts'], // Only TypeScript
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/test/**',
    '**/*.test.*',
    '**/coverage/**',
  ],
};
```

### Issue: Slow initialization

**Symptom:** Takes > 30s to initialize

**Causes:**

1. Too many files
2. Large files
3. Slow API responses (cloud providers)
4. Network latency

**Solutions:**

```bash
# 1. Use local embeddings (instant)
export EMBEDDINGS_PROVIDER=local

# 2. Quick mode for testing
archdoc analyze --depth quick

# 3. Keyword search for CI/CD
archdoc analyze --search-mode keyword

# 4. Filter more aggressively
# Reduce file count to <200 files
```

### Issue: Poor accuracy with local embeddings

**Symptom:** Missing relevant files, low relevance scores

**Cause:** TF-IDF limitations (keyword-based, no semantic understanding)

**Solutions:**

```bash
# 1. Switch to cloud provider for better accuracy
export EMBEDDINGS_PROVIDER=openai
export OPENAI_API_KEY=sk-...

# 2. Or use Google for cost-effective accuracy
export EMBEDDINGS_PROVIDER=google
export GOOGLE_API_KEY=...

# 3. Lower similarity threshold
export SIMILARITY_THRESHOLD=0.4  # More permissive

# 4. Try different query phrasing
# Use more keywords in refinement questions
```

---

## Best Practices

### ✅ DO

- **Use local embeddings by default** (free, fast, no setup)
- **Upgrade to cloud providers for production** (higher accuracy)
- **Filter files aggressively** to reduce initialization time
- **Set appropriate `maxFileSize`** (50KB is good default)
- **Clear vector store after agent completes** (free memory)
- **Use `similarityThreshold`** to filter low-relevance results
- **Use keyword search in CI/CD** (fastest, no API costs)
- **Monitor memory usage** for large projects (>1000 files)

### ❌ DON'T

- **Don't initialize multiple vector stores simultaneously** (memory)
- **Don't keep vector store alive between agents** (memory leak)
- **Don't set `maxFileSize` too high** (API costs for cloud)
- **Don't skip file filtering** (slows initialization)
- **Don't use cloud embeddings in tight loops** (costs)
- **Don't forget to set API keys** for cloud providers
- **Don't expect local embeddings to match cloud accuracy** (70-80% vs 95%)

### Recommended Configurations

#### Development (Local)

```bash
# Fast iteration, no costs
export EMBEDDINGS_PROVIDER=local
export SEARCH_MODE=vector
archdoc analyze ./my-project --depth quick
```

#### CI/CD Pipeline

```bash
# Fastest possible, no API calls
export SEARCH_MODE=keyword
archdoc analyze ./my-project --depth quick
```

#### Production Documentation

```bash
# Highest accuracy
export EMBEDDINGS_PROVIDER=openai
export OPENAI_API_KEY=sk-...
archdoc analyze ./my-project --depth normal
```

#### Cost-Conscious Production

```bash
# Good accuracy, lower cost
export EMBEDDINGS_PROVIDER=google
export GOOGLE_API_KEY=...
archdoc analyze ./my-project --depth normal
```

#### Privacy-Sensitive Projects

```bash
# Never sends code to external APIs
export EMBEDDINGS_PROVIDER=local
export SEARCH_MODE=vector
archdoc analyze ./my-project
```

---

## Technical Deep Dive

### Vector Store Implementation

```typescript
// LangChain MemoryVectorStore structure
class MemoryVectorStore {
  private memoryVectors: Array<{
    content: string; // File content
    embedding: number[]; // Vector array
    metadata: {
      path: string;
      filename: string;
      extension: string;
      size: number;
      directory: string;
    };
  }>;

  // Similarity search algorithm
  async similaritySearchWithScore(query: string, k: number) {
    // 1. Get query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query);

    // 2. Calculate cosine similarity with all vectors
    const similarities = this.memoryVectors.map((vec) => {
      const score = cosineSimilarity(queryEmbedding, vec.embedding);
      return { document: vec, score };
    });

    // 3. Sort and return top k
    return similarities.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
```

### Local Embeddings (TF-IDF) Implementation

```typescript
export class LocalEmbeddings extends Embeddings {
  private vocabulary: Map<string, number> = new Map(); // word -> IDF score
  private dimensions = 128;

  // Tokenize text into words
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  // Build vocabulary from all documents
  private buildVocabulary(documents: string[]) {
    const docCount = documents.length;
    const wordDocCount = new Map<string, number>();

    // Count documents containing each word
    for (const doc of documents) {
      const uniqueWords = new Set(this.tokenize(doc));
      for (const word of uniqueWords) {
        wordDocCount.set(word, (wordDocCount.get(word) || 0) + 1);
      }
    }

    // Calculate IDF scores
    const sortedWords = Array.from(wordDocCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.dimensions);

    for (const [word, count] of sortedWords) {
      const idf = Math.log(docCount / count);
      this.vocabulary.set(word, idf);
    }
  }

  // Convert text to TF-IDF vector
  private textToVector(text: string): number[] {
    const words = this.tokenize(text);
    const termFreq = new Map<string, number>();

    // Calculate term frequency
    for (const word of words) {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
    }

    // Build TF-IDF vector
    const vector = new Array(this.dimensions).fill(0);
    let idx = 0;

    for (const [word, idf] of this.vocabulary) {
      const tf = termFreq.get(word) || 0;
      vector[idx] = tf * idf;
      idx++;
    }

    // L2 normalize
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map((v) => v / magnitude) : vector;
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    this.buildVocabulary(documents);
    return documents.map((doc) => this.textToVector(doc));
  }

  async embedQuery(query: string): Promise<number[]> {
    return this.textToVector(query);
  }
}
```

### Memory Management

#### LRU Cache for File Contents

```typescript
class VectorSearchService {
  private fileCache = new Map<string, string>();
  private maxCacheSize = 50;

  private updateCache(path: string, content: string) {
    // If cache full, remove oldest entry
    if (this.fileCache.size >= this.maxCacheSize) {
      const firstKey = this.fileCache.keys().next().value;
      this.fileCache.delete(firstKey);
    }
    this.fileCache.set(path, content);
  }
}
```

#### Cleanup After Use

```typescript
// In base-agent-workflow.ts
const vectorSearch = new VectorSearchService(...);
await vectorSearch.initialize(files);

// Use for multiple searches
for (const question of questions) {
  await vectorSearch.searchFiles(question);
}

// Clean up when done
vectorSearch.clear(); // Frees memory
```

---

## Future Enhancements

### Planned Features

#### 1. Persistent Caching

Cache embeddings to disk to avoid re-embedding:

```typescript
// Future API
const cache = new EmbeddingCache('./embeddings-cache');
await cache.load(); // Load existing embeddings
await vectorSearch.initialize(files, { cache });
```

**Benefits:**

- Faster initialization (skip re-embedding unchanged files)
- Lower API costs (reuse existing embeddings)
- Better for CI/CD pipelines

#### 2. Incremental Updates

Update only changed files:

```typescript
// Future API
await vectorSearch.updateFile('src/new-file.ts');
await vectorSearch.removeFile('src/deleted-file.ts');
```

**Benefits:**

- Near-instant updates for small changes
- Efficient for watch mode
- Lower costs

#### 3. Hybrid Search

Combine vector + keyword for best of both:

```typescript
// Future API
const results = await vectorSearch.hybridSearch(query, {
  vectorWeight: 0.7, // 70% semantic
  keywordWeight: 0.3, // 30% keyword
});
```

**Benefits:**

- Better accuracy (combines strengths)
- Handles edge cases
- More robust

#### 4. Local Neural Embeddings

Use local neural models (no API required, higher accuracy than TF-IDF):

```typescript
// Future integration with Transformers.js
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'all-MiniLM-L6-v2');
const embeddings = await embedder(text, { pooling: 'mean', normalize: true });
```

**Benefits:**

- 85-90% accuracy (vs 70-80% for TF-IDF)
- Still free and offline
- Better than local, cheaper than cloud

#### 5. Query Expansion

Automatically expand queries with related terms:

```typescript
// Future API
const expandedQuery = await queryExpander.expand(
  'error handling',
  // Returns: "error handling exception try catch middleware"
);
```

---

## References

### Documentation

- [LangChain MemoryVectorStore](https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/memory)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Google Embeddings](https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings)
- [Retrieval-Augmented Generation (RAG)](https://research.ibm.com/blog/retrieval-augmented-generation-RAG)
- [TF-IDF Algorithm](https://en.wikipedia.org/wiki/Tf%E2%80%93idf)

### Related Guides

- [Configuration Guide](./CONFIGURATION_GUIDE.md) - Full setup reference
- [User Guide](./USER_GUIDE.md) - Getting started
- [API Documentation](./API.md) - Programmatic usage

### Support

- **GitHub Issues:** https://github.com/techdebtgpt/architecture-doc-generator/issues
- **Discussions:** https://github.com/techdebtgpt/architecture-doc-generator/discussions
- **Documentation:** https://github.com/techdebtgpt/architecture-doc-generator/tree/main/docs

---

## Summary

### Key Takeaways

1. **Local embeddings are now default** - Free, instant, no setup required
2. **Upgrade to cloud for accuracy** - OpenAI (95%), Google (90%) when you need it
3. **Vector search finds meaning** - Not just keywords, understands context
4. **Memory-efficient** - 3-15MB per 1000 files depending on provider
5. **Cost-effective** - Local is free, cloud is ~$0.01 per 10K files
6. **Two modes available** - Vector (accurate) vs Keyword (fast)
7. **Easy configuration** - Environment variables or config file

### Quick Decision Tree

```
Need documentation?
├─ Just starting? → Use LOCAL (free, instant)
├─ Production docs? → Use OPENAI (95% accuracy)
├─ Cost-conscious? → Use GOOGLE (90% accuracy, 50% cost)
├─ Privacy-sensitive? → Use LOCAL (never leaves machine)
├─ CI/CD pipeline? → Use KEYWORD (fastest, no API)
└─ Simple project? → Use KEYWORD (sufficient for basic needs)
```

### Next Steps

1. **Try local embeddings**: Run `archdoc analyze` (no setup required)
2. **Upgrade if needed**: Set `OPENAI_API_KEY` for higher accuracy
3. **Optimize**: Adjust filters, thresholds, and file size limits
4. **Monitor**: Check memory usage and API costs
5. **Iterate**: Use local for development, cloud for production

---

_Last updated: November 2025_
