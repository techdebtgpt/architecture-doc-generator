# Vector Search for Architecture Documentation# Vector Search for Architecture Documentation

> **AI-powered semantic search with RAG (Retrieval-Augmented Generation) for finding relevant code files**> **Complete guide to semantic similarity search with RAG (Retrieval-Augmented Generation) in architecture-doc-generator**

## Table of Contents## Table of Contents

1. [Quick Start](#quick-start)1. [Quick Start](#quick-start)

2. [Overview](#overview)2. [Overview](#overview)

3. [Configuration](#configuration)3. [How It Works](#how-it-works)

4. [Performance Benchmark](#performance-benchmark)4. [Embeddings Providers](#embeddings-providers)

5. [Embeddings Providers](#embeddings-providers)5. [Configuration](#configuration)

6. [Retrieval Strategies](#retrieval-strategies)6. [Performance & Cost](#performance--cost)

7. [How It Works](#how-it-works)7. [Usage Examples](#usage-examples)

8. [Best Practices](#best-practices)8. [Advanced Features](#advanced-features)

9. [Troubleshooting](#troubleshooting)9. [Comparison: Vector vs Keyword](#comparison-vector-vs-keyword)

10. [Troubleshooting](#troubleshooting)

---11. [Best Practices](#best-practices)

12. [Technical Deep Dive](#technical-deep-dive)

## Quick Start13. [Future Enhancements](#future-enhancements)

### TL;DR---

**Use Graph + Local embeddings** - Fastest (6.1min), most accurate (84.8%), free, offline.## Quick Start

````bash### TL;DR

# Recommended configuration

archdoc analyze ./my-project --search-mode vector --retrieval-strategy graphThe architecture-doc-generator supports **semantic similarity search** using RAG with embeddings. This finds relevant code files by **meaning**, not just keywords.



# Or via config file**🏆 RECOMMENDED: Use Graph + Local** - Best accuracy (84.8%), fastest (6.1min), free ($0.00), offline. [See benchmark results](./BENCHMARK_RESULTS.md).

{

  "searchMode": {### Installation

    "mode": "vector",

    "embeddingsProvider": "local",```bash

    "strategy": "graph"npm install -g @techdebtgpt/archdoc-generator

  }```

}

```### Basic Usage



### When to Use Each Configuration```bash

# RECOMMENDED: Graph strategy with local embeddings (best overall)

| Configuration | Speed | Cost | Accuracy | Best For |archdoc analyze ./my-project --search-mode vector --retrieval-strategy graph

|--------------|-------|------|----------|----------|

| **Graph + Local** ⭐ | **6.1 min** | **FREE** | **84.8%** | **Production** (RECOMMENDED) |# Default: Uses config from .archdoc.config.json if exists

| Hybrid + Local | 6.4 min | FREE | 84.3% | Balanced semantic+structural |archdoc analyze ./my-project

| Smart + Local | 6.3 min | FREE | 84.6% | Auto-adaptive, varied codebases |

| Keyword-only | 7.3 min | FREE | 84.6% | CI/CD, no embeddings |# Configure via config file (.archdoc.config.json):

| ~~OpenAI~~ ❌ | 11.7 min | $0.29 | 82.9% | **NOT RECOMMENDED** |{

  "searchMode": {

> **📊 See [Search Strategy Benchmark](./SEARCH_STRATEGY_BENCHMARK.md) for complete analysis**    "mode": "vector",               // "vector" or "keyword"

    "embeddingsProvider": "local",  // "local" (recommended), "openai", or "google"

---    "strategy": "graph"             // "graph" (best!), "hybrid", "vector", or "smart"

  }

## Overview}



### What is Vector Search?# Hybrid strategy (semantic 60% + structural 40%)

archdoc analyze ./my-project --search-mode vector --retrieval-strategy hybrid

Vector search uses **embeddings** (numerical representations of text) to find semantically similar code files. Instead of exact keyword matching, it understands **meaning** and **context**.

# Keyword search (no embeddings, good for CI/CD)

**Example:**archdoc analyze ./my-project --search-mode keyword

````

Query: "error handling patterns"# NOT RECOMMENDED: OpenAI embeddings (slower, more expensive, lower accuracy)

# See BENCHMARK_RESULTS.md for why OpenAI underperformed

Vector Search finds:EMBEDDINGS_PROVIDER=openai OPENAI_API_KEY=sk-... archdoc analyze ./my-project

✅ error-handler.ts (no exact match, but semantically related)```

✅ exception-middleware.ts (understands "error" ≈ "exception")

✅ retry-logic.ts (understands error handling includes retries)### When to Use Each Mode

Keyword Search finds:> **⭐ NEW: Comprehensive benchmark results show Graph + Local is the winner!** See [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) for complete analysis.

✅ error-handler.ts (contains "error")

❌ exception-middleware.ts (no "error" keyword)| Mode | Best For | Speed | Accuracy (Real-World) | Cost |

❌ retry-logic.ts (no "error" keyword)| ------------------- | ------------------------------------------- | ------- | --------------------- | ----------------- |

````| **Graph + Local** ⭐ | **PRODUCTION** (best overall)             | **Fastest** (6.1min) | **Excellent (84.8%)** | **FREE** ✅       |

| **Hybrid + Local**  | Balanced semantic+structural                | Fast (6.4min)    | Very Good (84.3%)     | FREE ✅           |

### Key Features| **Smart + Local**   | Auto-adaptive, varied codebases             | Fast (6.3min)    | Very Good (84.6%)     | FREE ✅           |

| **Keyword**         | CI/CD, simple projects, no embeddings       | Fast (7.3min)    | Good (84.6%)          | FREE ✅           |

- **🆓 Free by default** - Local TF-IDF embeddings (no API key required)| **OpenAI** ❌       | **NOT RECOMMENDED** (slow, expensive, worse)| Slow (11.7min)   | Below Average (82.9%) | **3.4x MORE** ($0.29) |

- **🎯 Semantic understanding** - Finds code by meaning, not just keywords| **Google**          | Alternative to OpenAI (untested)            | Medium  | Unknown (est. 90%+)   | ~$0.005/10K files |

- **🔗 Structural awareness** - Follows imports and dependencies

- **⚡ Fast** - 6-7 minutes for 6K+ file projects---

- **🔒 Privacy-preserving** - Code never leaves your machine (with local embeddings)

- **🎨 Flexible** - Multiple strategies (graph, hybrid, vector, smart)## Overview



---### Features



## Configuration#### **Semantic Similarity Search**



### Basic Configuration- Converts code files into vector representations (embeddings)

- Finds files based on **semantic meaning** rather than exact keyword matches

**Via CLI:**- Handles synonyms, related concepts, and contextual relevance automatically

```bash

# Graph strategy (recommended)#### **Multiple Embeddings Providers**

archdoc analyze ./project --search-mode vector --retrieval-strategy graph

Supports multiple embedding providers with easy switching:

# Hybrid strategy (semantic + structural)

archdoc analyze ./project --search-mode vector --retrieval-strategy hybrid| Provider    | Model                  | Dimensions | Cost             | Best For          |

| ----------- | ---------------------- | ---------- | ---------------- | ----------------- |

# Keyword mode (no embeddings)| **Local**   | TF-IDF                 | 128        | FREE             | Default, no setup |

archdoc analyze ./project --search-mode keyword| **OpenAI**  | text-embedding-3-small | 1536       | ~$0.02/1M tokens | Highest accuracy  |

```| **Google**  | text-embedding-004     | 768        | ~$0.01/1M tokens | Cost-effective    |

| HuggingFace | all-MiniLM-L6-v2       | 384        | FREE (with key)  | Open source       |

**Via Config File (.archdoc.config.json):**| Cohere      | embed-english-v3.0     | 1024       | ~$0.10/1M tokens | Enterprise        |

```json| Voyage      | voyage-2               | 1024       | ~$0.12/1M tokens | Specialized       |

{

  "searchMode": {#### **In-Memory Vector Store**

    "mode": "vector",

    "embeddingsProvider": "local",- Uses LangChain's `MemoryVectorStore` for fast, memory-efficient storage

    "strategy": "graph"- No external database or persistent storage required

  }- Automatically initialized and cleaned up per agent execution

}

```#### **Dual Search Modes**



### Advanced ConfigurationSupports both search strategies with configurable option:



```json| Mode                   | Description                          | Speed  | Accuracy | Best For                    |

{| ---------------------- | ------------------------------------ | ------ | -------- | --------------------------- |

  "searchMode": {| **`vector`** (default) | Semantic similarity using embeddings | Slower | Higher   | Complex queries, production |

    "mode": "vector",| **`keyword`**          | Traditional keyword matching         | Faster | Lower    | Simple queries, CI/CD       |

    "embeddingsProvider": "local",

    "strategy": "hybrid",---

    "vectorWeight": 0.6,

    "graphWeight": 0.4,## How It Works

    "similarityThreshold": 0.3,

    "topK": 10,### Complete Process Flow

    "includeRelatedFiles": true,

    "maxDepth": 2```

  }┌─────────────────────────────────────────────────────────────┐

}│ 1. INITIALIZATION PHASE (Once Per Agent)                    │

```└─────────────────────────────────────────────────────────────┘

   │

**Options:**   ├─► Step 1: Filter Files

- `mode`: `"vector"` or `"keyword"`   │   ├─ Input: All project files (e.g., 500 files)

- `embeddingsProvider`: `"local"` (recommended), `"openai"`, `"google"`   │   ├─ Exclude: node_modules, dist, .git, test files

- `strategy`: `"graph"` (best!), `"hybrid"`, `"vector"`, `"smart"`   │   ├─ Size limit: Skip files > 100KB

- `vectorWeight`: Semantic similarity weight (0-1, default: 0.6)   │   └─ Output: ~150 filtered files

- `graphWeight`: Structural relationship weight (0-1, default: 0.4)   │

- `similarityThreshold`: Minimum score to include file (0-1, default: 0.3)   ├─► Step 2: Load File Contents (Batched)

- `topK`: Max files per query (default: 10)   │   ├─ Read files in batches of 50

- `includeRelatedFiles`: Include imported/importer files (default: true)   │   ├─ Truncate content to maxFileSize (50KB default)

- `maxDepth`: Dependency traversal depth (default: 2)   │   ├─ Cache content in memory (LRU cache)

   │   └─ Create LangChain Document objects

---   │

   ├─► Step 3: Generate Embeddings

## Performance Benchmark   │   ├─ LOCAL: Calculate TF-IDF vectors (instant)

   │   ├─ CLOUD: Send to API (OpenAI/Google/etc.)

### Test Environment   │   ├─ Model converts text → vector array

   │   └─ Returns: Vector array [0.123, -0.456, ...]

- **Project**: tech-debt-api (Production NestJS)   │

- **Files**: 6,187 total, 888 analyzed   └─► Step 4: Build In-Memory Vector Store

- **LLM**: Claude Haiku 4.5       ├─ Store vectors in MemoryVectorStore (RAM)

- **Agents**: 8 specialized agents       ├─ Index: ~10MB per 1000 files

       ├─ Supports fast similarity search

### Complete Results       └─ Ready for queries



| Configuration | Time | Init | Tokens | Cost | Clarity | KPI Score | Winner? |┌─────────────────────────────────────────────────────────────┐

|--------------|------|------|--------|------|---------|-----------|---------|│ 2. SEARCH PHASE (Multiple Times Per Agent)                  │

| **Graph + Local** ⭐ | **6.1 min** | 0.2s | 175,965 | **$0.08** | **84.8%** | **87.5%** | ✅ **YES** |└─────────────────────────────────────────────────────────────┘

| Hybrid + Local | 6.4 min | 0.2s | 178,545 | $0.09 | 84.3% | 87.5% | Good |   │

| Smart + Local | 6.3 min | 0.2s | 174,687 | $0.08 | 84.6% | 84.5% | Good |   ├─► Step 1: Question Embedding

| Vector + Local | 6.2 min | 0.2s | 173,252 | $0.08 | 83.1% | 85.5% | Baseline |   │   ├─ Question: "What error handling patterns?"

| Keyword-only | 7.3 min | 0s | 183,289 | $0.09 | 84.6% | 85.8% | Fallback |   │   ├─ Convert question to vector

| **OpenAI** ❌ | **11.7 min** | **90s** | 494,682 | **$0.29** | **82.9%** | **79.3%** | ❌ **NO** |   │   └─ Returns: Query vector [0.234, -0.567, ...]

   │

### Key Findings   ├─► Step 2: Similarity Search (In-Memory)

   │   ├─ Compare query vector with all file vectors

✅ **Graph + Local Wins**   │   ├─ Algorithm: Cosine similarity

- Fastest execution (6.1 min)   │   ├─ Speed: ~100ms for 1000 files

- Highest accuracy (84.8%)   │   └─ Returns: Top K files with scores

- Best KPI analysis (87.5% in 1 iteration)   │

- Most cost-effective ($0.08)   ├─► Step 3: Filter by Threshold

- Free & offline   │   ├─ Keep only scores >= 0.5

   │   ├─ Sort: Highest similarity first

❌ **OpenAI Fails**   │   └─ Output: Top 3 most relevant files

- 92% slower (11.7 min vs 6.1 min)   │

- 3.4x more expensive ($0.29 vs $0.08)   └─► Step 4: Enhancement with Dependency Graph

- 1.9% lower accuracy (82.9% vs 84.8%)       ├─ Add imported files (+0.4 relevance)

- KPI analysis unstable (3 iterations, still lowest: 79.3%)       ├─ Add importer files (+0.3 relevance)

- Context loss (8192 token limit → 1500 token/doc truncation)       ├─ Add same-module files (+0.2 relevance)

       └─ Return FileContent[] with scores

### Why Graph + Local Won

┌─────────────────────────────────────────────────────────────┐

**1. Code is Structural, Not Semantic**│ 3. CLEANUP PHASE (After Agent Completes)                    │

- Architecture defined by imports, dependencies, modules└─────────────────────────────────────────────────────────────┘

- Graph traversal captures these directly   │

- Semantic similarity misses structural patterns   └─► Clear Memory

       ├─ Delete vector store (~10MB freed)

**2. Local Embeddings Sufficient**       ├─ Clear file content cache

- TF-IDF captures keyword overlap (highly relevant for code)       └─ Reset initialization flag

- Combined with graph enhancement (imports, dependents)```

- No context loss from truncation

### Similarity Scoring

**3. OpenAI Limitations**

- 8192 token total limit requires batching (178 batches, 90s overhead)Cosine similarity scores range from 0 to 1:

- Each doc truncated to 1500 tokens (lost critical context)

- Semantic embeddings optimized for prose, not code structure- **1.0** = Perfect match (exact semantic similarity)

- Higher cost for worse results- **0.8-0.99** = Highly relevant

- **0.6-0.79** = Moderately relevant

> **📊 See [Search Strategy Benchmark](./SEARCH_STRATEGY_BENCHMARK.md) for detailed per-agent scores and technical deep-dive**- **0.5-0.59** = Somewhat relevant

- **< 0.5** = Filtered out (below threshold)

---

**How cosine similarity works:**

## Embeddings Providers

````

### Local (TF-IDF) - Recommended ⭐Vector A (query): [0.5, 0.3, 0.8]

Vector B (file): [0.6, 0.4, 0.7]

**What it is:** Free keyword-based embeddings using term frequency-inverse document frequency.

Cosine Similarity = (A · B) / (||A|| × ||B||)

**Pros:** = (0.5×0.6 + 0.3×0.4 + 0.8×0.7) / (√0.98 × √1.01)

- ✅ 100% FREE = 0.98 (highly similar!)

- ✅ Works offline```

- ✅ Privacy-preserving (code never leaves machine)

- ✅ Fast init (0.2s vs 90s for OpenAI)---

- ✅ No truncation/context loss

- ✅ Proven best for code (84.8% accuracy)## Embeddings Providers

**Cons:**### Local Embeddings (Default, FREE)

- ⚠️ No deep semantic understanding (but not needed for code!)

**Advantages:**

**Configuration:**

````json- ✅ **100% FREE** - No API key required

{- ✅ **Works offline** - No network calls

  "searchMode": {- ✅ **Privacy-preserving** - Your code never leaves your machine

    "embeddingsProvider": "local"- ✅ **Fast initialization** - No API latency

  }- ✅ **No rate limits** - Process unlimited files

}

```**Limitations:**



**When to use:** Always! Unless you have a specific reason not to.- ⚠️ Lower accuracy (70-80% vs 95% for OpenAI)

- ⚠️ No semantic understanding (keyword-based TF-IDF)

### OpenAI - NOT Recommended ❌- ⚠️ Smaller vector dimensions (128 vs 1536)



**What it is:** Cloud-based neural embeddings (text-embedding-3-small, 1536 dimensions).**When to use:**



**Pros:**- Getting started with vector search

- ✅ Deep semantic understanding (for natural language)- Privacy-sensitive codebases

- Offline/air-gapped environments

**Cons:**- Cost-conscious projects

- ❌ 3.4x more expensive ($0.29 vs $0.08)- CI/CD pipelines (fast + free)

- ❌ 92% slower (11.7 min vs 6.1 min)

- ❌ 1.9% lower accuracy (82.9% vs 84.8%)**Technical details:**

- ❌ 8192 token limit (requires batching + truncation)

- ❌ Context loss (1500 tokens/doc max)- Algorithm: TF-IDF (Term Frequency-Inverse Document Frequency)

- ❌ Network dependency- Dimensions: 128

- ❌ Privacy concerns- Implementation: Custom `LocalEmbeddings` class

- Dependencies: None (built-in)

**Configuration:**

```json### OpenAI Embeddings

{

  "embeddings": {**Advantages:**

    "openai": "sk-..."

  },- ✅ Highest accuracy (95%+ relevance)

  "searchMode": {- ✅ True semantic understanding

    "embeddingsProvider": "openai"- ✅ Handles synonyms, context, relationships

  }- ✅ Large vector space (1536 dimensions)

}

```**Requirements:**



**When to use:** Don't. Our testing proved it underperforms for code analysis.- OpenAI API key (`OPENAI_API_KEY`)



### Google (Untested)**Configuration:**



**What it is:** Google text-embedding-004 (768 dimensions).```bash

# Environment variable (fallback)

**Expected:**export OPENAI_API_KEY=sk-...

- 50% cheaper than OpenAIexport EMBEDDINGS_PROVIDER=openai

- Similar performance issues (semantic > structural)

- Untested on our benchmark# Recommended: .archdoc.config.json

{

**Configuration:**  "apiKeys": {

```json    "anthropic": "sk-ant-...",

{    "openai": "sk-..."

  "embeddings": {  },

    "google": "..."  "searchMode": {

  },    "mode": "vector",

  "searchMode": {    "embeddingsProvider": "openai",

    "embeddingsProvider": "google"    "strategy": "hybrid"

  }  }

}}

````

---**Cost:** ~$0.02 per 1M tokens (~$0.006 per 150 files)

## Retrieval Strategies### Google Embeddings

### Graph - Best Overall ⭐**Advantages:**

**What it does:** Pure dependency graph traversal (ignores semantic similarity).- ✅ High accuracy (90%+)

- ✅ Cost-effective (~50% cheaper than OpenAI)

**How it works:**- ✅ Good semantic understanding

1. Start with files matching query keywords- ✅ Efficient vector space (768 dimensions)

2. Follow import chains (A imports B)

3. Follow dependent chains (C imports A)**Requirements:**

4. Include same-module files

5. Score by structural proximity- Google API key (`GOOGLE_API_KEY`)

**Pros:\*\***Configuration:\*\*

- ✅ Highest accuracy (84.8%)

- ✅ Fastest execution (6.1 min)```bash

- ✅ Best KPI analysis (87.5%)export GOOGLE_API_KEY=...

- ✅ Captures architectural patterns naturallyexport EMBEDDINGS_PROVIDER=google

````

**Cons:**

- ⚠️ Relies on dependency graph quality**Cost:** ~$0.01 per 1M tokens (~$0.003 per 150 files)



**Configuration:**### Other Providers

```json

{**HuggingFace** (Open Source):

  "searchMode": {

    "strategy": "graph"- Free with API key

  }- Model: `all-MiniLM-L6-v2`

}- Good for experimentation

````

**Cohere** (Enterprise):

**When to use:** Production documentation, architectural analysis, default choice.

- Premium accuracy

### Hybrid - Balanced- Model: `embed-english-v3.0`

- Higher cost

**What it does:** Combines semantic similarity (60%) with structural relationships (40%).

**Voyage** (Specialized):

**Pros:**

- ✅ Balanced approach- Domain-specific models

- ✅ Good accuracy (84.3%)- Premium features

- ✅ Only 5% slower than graph- Higher cost

**Cons:**### Provider Comparison

- ⚠️ Slightly lower accuracy than graph (84.3% vs 84.8%)

````typescript

**Configuration:**// Accuracy comparison (semantic query understanding)

```jsonLocal:       ████████░░ 70-80%

{HuggingFace: ██████████ 85%

  "searchMode": {Google:      ███████████ 90%

    "strategy": "hybrid",OpenAI:      ████████████ 95%

    "vectorWeight": 0.6,Cohere:      ████████████ 95%

    "graphWeight": 0.4Voyage:      ████████████ 95%

  }

}// Cost comparison (per 10K files)

```Local:       FREE

HuggingFace: FREE

**When to use:** If you want both semantic and structural, but graph alone is proven better.Google:      $0.003-0.005

OpenAI:      $0.006-0.01

### Vector - Pure SemanticCohere:      $0.10

Voyage:      $0.12

**What it does:** Pure semantic similarity using embeddings only.

// Speed comparison (initialization for 150 files)

**Pros:**Local:       1-2s (instant TF-IDF)

- ✅ Fast (6.2 min)OpenAI:      3-5s (API latency)

- ✅ Simple conceptGoogle:      3-5s (API latency)

HuggingFace: 5-8s (API latency)

**Cons:**Cohere:      4-6s

- ⚠️ Lowest accuracy among vector strategies (83.1%)Voyage:      4-6s

- ⚠️ Misses structural patterns```



**Configuration:**---

```json

{## Configuration

  "searchMode": {

    "strategy": "vector"### Environment Variables

  }

}```bash

```# Embeddings provider (default: local)

export EMBEDDINGS_PROVIDER=local  # local, openai, google, huggingface, cohere, voyage

**When to use:** Baseline comparison, not recommended for production.

# API keys (only needed for cloud providers)

### Smart - Auto-Adaptiveexport OPENAI_API_KEY=sk-...      # For OpenAI embeddings

export GOOGLE_API_KEY=...         # For Google embeddings

**What it does:** Automatically chooses best strategy per query.export HUGGINGFACE_API_KEY=...    # For HuggingFace embeddings

export COHERE_API_KEY=...         # For Cohere embeddings

**Pros:**export VOYAGE_API_KEY=...         # For Voyage embeddings

- ✅ Adaptive to different query types

- ✅ Good accuracy (84.6%)# Search mode (default: vector)

- ✅ Fast (6.3 min)export SEARCH_MODE=vector         # vector or keyword



**Cons:**# Optional: Custom embedding model

- ⚠️ Slightly lower KPI score (84.5% vs 87.5%)export OPENAI_EMBEDDING_MODEL=text-embedding-3-large

- ⚠️ Less predictable```



**Configuration:**### Configuration File

```json

{Create `.archdoc.config.json`:

  "searchMode": {

    "strategy": "smart"```json

  }{

}  "llm": {

```    "provider": "anthropic",

    "apiKey": "sk-ant-...",

**When to use:** Experimentation, varied codebases, when unsure which strategy to use.    "embeddingsProvider": "local",

    "embeddingsApiKey": ""

### Keyword - No Embeddings  },

  "analysis": {

**What it does:** Traditional keyword matching (no vector search).    "searchMode": "vector",

    "depthMode": "normal"

**Pros:**  }

- ✅ No embeddings overhead}

- ✅ Simplest setup```

- ✅ Good accuracy (84.6%)

### CLI Usage

**Cons:**

- ⚠️ No semantic understanding```bash

- ⚠️ Slower than graph (7.3 min vs 6.1 min)# Use default (local embeddings)

- ⚠️ Can miss related filesarchdoc analyze ./my-project



**Configuration:**# Specify embeddings provider

```jsonarchdoc analyze ./my-project --embeddings-provider openai

{

  "searchMode": {# Use keyword search (no embeddings)

    "mode": "keyword"archdoc analyze ./my-project --search-mode keyword

  }

}# Quick analysis with local embeddings

```archdoc analyze ./my-project --depth quick



**When to use:** CI/CD (if embeddings unavailable), absolute simplest setup.# Deep analysis with OpenAI embeddings

archdoc analyze ./my-project --depth deep --embeddings-provider openai

---```



## How It Works### Programmatic Usage



### Complete Workflow```typescript

import { DocumentationOrchestrator } from '@techdebtgpt/archdoc-generator';

````

┌─────────────────────────────────────────┐const output = await orchestrator.generateDocumentation(projectPath, {

│ 1. INITIALIZATION (Once per agent) │ agentOptions: {

└─────────────────────────────────────────┘ searchMode: 'vector', // or 'keyword'

│ embeddingsProvider: 'openai', // or 'local', 'google', etc.

├─► Filter files (exclude node_modules, tests, etc.) },

├─► Load file contents (batched)});

├─► Generate embeddings (local: 0.2s | OpenAI: 90s)```

├─► Build vector store (in-memory)

└─► Build dependency graph### Per-Agent Configuration

┌─────────────────────────────────────────┐Agents can override search mode in their context:

│ 2. SEARCH (Multiple times per agent) │

└─────────────────────────────────────────┘```typescript

│const context: AgentContext = {

├─► Convert query to embedding // ... other context

├─► Find similar files (cosine similarity) config: {

│ └─ Score: 0.0 (unrelated) to 1.0 (identical) searchMode: 'vector', // Agent-specific override

│ embeddingsProvider: 'openai',

├─► [Graph Strategy] Enhance with structure: maxIterations: 5,

│ ├─ Add imported files (+0.4 score) clarityThreshold: 80,

│ ├─ Add importer files (+0.3 score) },

│ └─ Add same-module files (+0.2 score)};

│```

├─► Filter by threshold (default: 0.3)

├─► Sort by relevance score---

└─► Return top K files (default: 10)

## Performance & Cost

┌─────────────────────────────────────────┐

│ 3. CLEANUP (After agent completes) │### Memory Usage

└─────────────────────────────────────────┘

│#### Per-File Storage

└─► Clear vector store from memory

````

For a 50KB file:

### Similarity Scoring├─ Original content: 50KB

├─ Embedding vector:

**Cosine Similarity** (0.0 to 1.0):│  ├─ Local (128 dims × 4 bytes): 0.5KB

- **0.9-1.0**: Highly similar (almost identical)│  ├─ OpenAI (1536 dims × 4 bytes): 6KB

- **0.7-0.8**: Very relevant│  └─ Google (768 dims × 4 bytes): 3KB

- **0.5-0.6**: Moderately relevant├─ Metadata (path, filename, etc.): 0.5KB

- **0.3-0.4**: Somewhat relevant└─ Total: 1-56.5KB per file in memory

- **< 0.3**: Filtered out (below threshold)```



**Graph Enhancement** (additive):#### Total Memory for 1000 Files

- File imports target: +0.4

- File imported by target: +0.3```

- Same module as target: +0.2Local (TF-IDF):

├─ Vectors: 0.5MB

**Final Score** = min(vectorScore + graphBoost, 1.0)├─ Content (cached 50 files): 2.5MB

├─ Metadata: 0.5MB

---└─ Total: ~3-5MB



## Best PracticesOpenAI:

├─ Vectors: 6MB

### ✅ DO├─ Content (cached 50 files): 2.5MB

├─ Metadata: 0.5MB

- **Use Graph + Local for production** - Proven winner (84.8%, 6.1min, $0.08)└─ Total: ~10-15MB

- **Filter files aggressively** - Exclude node_modules, dist, tests

- **Set appropriate topK** - 10 files per query is good defaultGoogle:

- **Use keyword mode for CI/CD** - If simplicity matters more than accuracy├─ Vectors: 3MB

- **Monitor memory usage** - ~5MB per agent with local embeddings├─ Content (cached 50 files): 2.5MB

├─ Metadata: 0.5MB

### ❌ DON'T└─ Total: ~6-10MB

```

- **Don't use OpenAI embeddings** - Slower, more expensive, less accurate

- **Don't skip file filtering** - Slows initialization, adds noise### API Costs

- **Don't set topK too high** - More files = more tokens = higher cost

- **Don't expect semantic miracles** - Code is structural, graph wins#### Local Embeddings (FREE)



### Recommended Configurations```

No API calls, no costs!

**Production:**```

```json

{#### OpenAI Embeddings

  "searchMode": {

    "mode": "vector",```

    "embeddingsProvider": "local",Example: 150 files, avg 2000 tokens per file

    "strategy": "graph"├─ Total tokens: 150 × 2000 = 300,000 tokens

  }├─ Cost: 300,000 ÷ 1,000,000 × $0.02 = $0.006

}└─ ~$0.006 per agent initialization

```

Search queries (per question):

**CI/CD:**├─ Tokens: ~15 tokens

```json├─ Cost: 15 ÷ 1,000,000 × $0.02 = $0.0000003

{└─ Negligible

  "searchMode": {

    "mode": "keyword"Full documentation generation (6 agents):

  }├─ Initialization: 6 × $0.006 = $0.036

}├─ Queries: 30 × $0.0000003 = $0.00001

```└─ Total: ~$0.04

```

**Experimentation:**

```json#### Google Embeddings

{

  "searchMode": {```

    "mode": "vector",~50% of OpenAI costs:

    "embeddingsProvider": "local",├─ Per agent: ~$0.003

    "strategy": "smart"├─ Full generation: ~$0.02

  }```

}

```### Initialization Time



---```

Number of Files | Local  | OpenAI | Google | Keyword

## Troubleshooting----------------|--------|--------|--------|--------

50 files        | <1s    | 1-2s   | 1-2s   | 0s

### Issue: No results returned150 files       | 1-2s   | 3-5s   | 3-5s   | 0s

500 files       | 2-4s   | 10-15s | 10-15s | 0s

**Cause:** Similarity threshold too high or no relevant files.1000 files      | 4-8s   | 20-30s | 20-30s | 0s

```

**Solution:**

```json### Search Time (After Init)

{

  "searchMode": {```

    "similarityThreshold": 0.2  // Lower from default 0.3Operation              | Local | Cloud | Keyword

  }-----------------------|-------|-------|--------

}Single query embedding | 0ms   | 50ms  | 0ms

```Vector similarity      | 50ms  | 50ms  | 10ms

Total per search       | 50ms  | 100ms | 10ms

### Issue: High memory usage```



**Cause:** Too many files embedded.### Optimization Tips



**Solution:**#### For Vector Search

- Reduce `maxFiles` in config

- Add more exclude patterns- Use `maxFileSize` to limit file content (default 50KB)

- Use keyword mode- Set `topK` appropriately (3-5 files per question)

- Increase `similarityThreshold` to filter low-relevance matches

### Issue: Slow initialization- Use local embeddings for CI/CD pipelines

- Filter aggressively (exclude tests, build artifacts)

**Cause:** Too many files or using OpenAI embeddings.

#### For Keyword Search

**Solution:**

- Use local embeddings (0.2s vs 90s)- Faster but less accurate

- Filter more aggressively- Best for exact keyword matches

- Use keyword mode- No initialization overhead

- Use in CI/CD or for simple projects

### Issue: Poor accuracy with local embeddings

---

**This shouldn't happen!** Our testing showed local performs best (84.8%).

## Usage Examples

**If you see issues:**

1. Check file filtering (excluding wrong files?)### Example 1: Default (Free Local Embeddings)

2. Try different strategy (graph → hybrid → smart)

3. Lower similarity threshold```bash

4. **Don't** switch to OpenAI (proven worse!)archdoc analyze ./my-project

```

---

**Output:**

## Summary

```

### Quick Decision TreeIteration 2: Searching files for 3 question(s) using vector search...

Initializing vector store with local embeddings (FREE)...

```Processed 50/150 files (33.3%)

Need documentation?Processed 100/150 files (66.7%)

├─ Production quality? → Graph + Local ⭐Processed 150/150 files (100.0%)

├─ Fast iteration? → Graph + Local ⭐Vector store initialized in 1.8s with 142 documents

├─ Cost-sensitive? → Graph + Local ⭐Question: "What error handling patterns are used..." -> Found 3 file(s)

├─ Privacy-sensitive? → Graph + Local ⭐  topFile: src/middleware/error-handler.ts

├─ CI/CD pipeline? → Keyword or Graph + Local  relevance: 0.73

└─ Unsure? → Graph + Local ⭐Retrieved 8 unique file(s) (12 total matches)

````

### Key Takeaways### Example 2: OpenAI Embeddings (High Accuracy)

1. **Graph + Local is the winner** - Fastest, most accurate, cheapest```bash

2. **OpenAI embeddings don't help** - 92% slower, 3.4x more expensive, 1.9% less accurateexport OPENAI_API_KEY=sk-...

3. **Code is structural** - Graph traversal > semantic similarityarchdoc analyze ./my-project --embeddings-provider openai

4. **Local is sufficient** - TF-IDF + graph enhancement = excellent results```

5. **Keep it simple** - Default configuration works best

**Output:**

---

```

**Last Updated:** November 5, 2025  Iteration 2: Searching files for 3 question(s) using vector search...

**Benchmark Version:** 2.0 (6 configurations tested)  Initializing vector store with OpenAI embeddings...

**Tool Version:** architecture-doc-generator@0.3.25Processed 150/150 files (100.0%)

Vector store initialized in 4.2s with 142 documents

**See Also:**Question: "What error handling patterns are used..." -> Found 3 file(s)

- [Search Strategy Benchmark](./SEARCH_STRATEGY_BENCHMARK.md) - Complete performance analysis  topFile: src/middleware/error-handler.ts

- [Configuration Guide](./CONFIGURATION_GUIDE.md) - All configuration options  relevance: 0.92

- [User Guide](./USER_GUIDE.md) - Getting startedRetrieved 8 unique file(s) (12 total matches)

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

## Hybrid Retrieval (Advanced)

### What is Hybrid Retrieval?

**Hybrid retrieval** combines vector search (semantic similarity) with dependency graph analysis (structural relationships) for more comprehensive file discovery.

**Available only when `--search-mode vector` is enabled.**

### Retrieval Strategies

| Strategy | Description               | When to Use                            |
| -------- | ------------------------- | -------------------------------------- |
| `vector` | Semantic similarity only  | Finding files by content/meaning       |
| `graph`  | Dependency graph only     | Finding files by imports/relationships |
| `hybrid` | **Both combined (60/40)** | Best overall results (default)         |
| `smart`  | Auto-detect per query     | Let system choose optimal strategy     |

### Configuration

**CLI:**

```bash
# Hybrid (default when vector mode enabled)
archdoc analyze --search-mode vector --retrieval-strategy hybrid

# Pure semantic
archdoc analyze --search-mode vector --retrieval-strategy vector

# Pure structural
archdoc analyze --search-mode vector --retrieval-strategy graph

# Auto-detect
archdoc analyze --search-mode vector --retrieval-strategy smart
```

**Config file (.archdoc.config.json):**

```json
{
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local",
    "strategy": "hybrid",
    "vectorWeight": 0.6,
    "graphWeight": 0.4,
    "includeRelatedFiles": true,
    "maxDepth": 2,
    "similarityThreshold": 0.3,
    "topK": 10
  }
}
```

### How It Works

**Hybrid Strategy** (default):

1. **Vector search** finds semantically similar files (60% weight)
2. **Graph analysis** adds structurally related files (40% weight)
3. **Related files** included automatically (imports, dependents, same module)
4. **Combined scoring** ranks results by relevance

**Example:**

```typescript
Query: "authentication logic"

Vector Results (60%):
  auth-service.ts (95% similar)
  user-controller.ts (80% similar)

Graph Enhancement (+40%):
  auth-service.ts → imports: [jwt.ts, crypto.ts]
  auth-service.ts → imported by: [api-gateway.ts, middleware.ts]
  auth-service.ts → same module: [auth-middleware.ts]

Final Results (ranked by combined score):
  1. auth-service.ts (0.95 vector + 0.8 graph = 0.89)
  2. auth-middleware.ts (0.70 vector + 0.9 graph = 0.78)
  3. user-controller.ts (0.80 vector + 0.6 graph = 0.72)
  4. jwt.ts (0.60 vector + 0.7 graph = 0.64)
```

### Benefits

- **30-50% better recall** for architectural queries
- **Complete context** - includes related files even if not semantically similar
- **Structural awareness** - understands import chains and module boundaries
- **Adaptive** - smart strategy auto-selects best approach per query

### Important Note

⚠️ **Hybrid retrieval requires `--search-mode vector`**

- If `--search-mode keyword`, retrieval strategy is ignored (no vector store)
- Hybrid retrieval needs both vector store AND dependency graph

---

## Summary

### Key Takeaways

1. **Local embeddings are now default** - Free, instant, no setup required
2. **Upgrade to cloud for accuracy** - OpenAI (95%), Google (90%) when you need it
3. **Vector search finds meaning** - Not just keywords, understands context
4. **Hybrid retrieval combines semantic + structural** - Best results when vector mode enabled
5. **Memory-efficient** - 3-15MB per 1000 files depending on provider
6. **Cost-effective** - Local is free, cloud is ~$0.01 per 10K files
7. **Two modes available** - Vector (accurate) vs Keyword (fast)
8. **Easy configuration** - Environment variables or config file

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
