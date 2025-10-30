# Agent Self-Refinement Workflow

This document describes how agents autonomously improve their analysis through iterative refinement.

## Overview

Each agent follows a self-correcting workflow that:

1. Generates an initial analysis
2. Evaluates its own quality
3. Identifies specific gaps
4. Searches for relevant code
5. Refines the analysis
6. Repeats until quality thresholds are met

## Workflow Steps

### **Step 1: Initial Analysis**

- Agent receives project context (files, structure, dependencies)
- Generates first analysis using LLM with agent-specific guidelines
- Produces raw analysis text covering what the agent understands so far

### **Step 2: Quality Evaluation**

- LLM evaluates the analysis on two dimensions:
  - **Clarity Score (0-100)**: How well-explained and structured
  - **Completeness Score (0-100)**: How much information is covered
- Identifies specific gaps:
  - **Missing Information**: Topics not covered at all
  - **Unclear Areas**: Topics covered but poorly explained

### **Step 3: Stopping Decision**

Agent stops refining if ANY condition is met:

- **Clarity >= 80**: Analysis is good enough
- **Iterations >= 5**: Maximum refinement limit reached
- **Improvement < 10**: Each iteration must improve clarity by at least 10 points
- **No gaps found**: Both missing info and unclear areas are empty

If no stopping condition met, continue to Step 4

### **Step 4: Question Generation**

- For each identified gap, generates 2-3 targeted questions
- Questions focus on:
  - Where in code is this implemented?
  - What patterns/approaches are used?
  - How does it integrate with other components?
- Limits to 5 questions maximum per iteration to stay focused

### **Step 5: File Search**

- For each question, searches project file tree
- Scoring mechanism:
  - Keywords in file path: +10 points
  - Keywords in directory: +5 points
  - Special relevance (e.g., "test" in question + `.test.ts` file): +15 points
- Returns top 5-10 most relevant files per question
- Removes duplicate files across questions

### **Step 6: File Retrieval**

- Reads content of matched files
- Prioritizes by relevance score
- Truncates large files if needed to fit constraints

### **Step 7: Analysis Refinement**

- LLM receives:
  - Original analysis
  - Identified gaps
  - Questions generated
  - Relevant file contents
- Generates improved analysis that:
  - Keeps good parts from original
  - Fills identified gaps with code evidence
  - Makes unclear areas more specific
  - Adds depth while maintaining structure

### **Step 8: Loop Back**

- Increment iteration counter
- Go back to Step 2 (evaluate the refined analysis)
- Repeat until stopping condition met

### **Step 9: Final Result**

- Returns analysis with metadata:
  - Final clarity score
  - Number of iterations performed
  - Confidence score (based on clarity and iterations)
  - Execution time

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Execution Starts                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │  1. Initial Analysis  │
          │  Generate first draft │
          └───────────┬───────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │  2. Evaluate Quality  │
          │  - Clarity Score      │
          │  - Identify Gaps      │
          └───────────┬───────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │  3. Check Stopping    │
          │  Conditions           │
          └───────────┬───────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
    ┌───────────────┐   ┌──────────────────┐
    │  STOP         │   │  CONTINUE        │
    │  Return       │   │  (if clarity<80  │
    │  Analysis     │   │   & iter<5, etc) │
    └───────────────┘   └────────┬─────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  4. Generate Questions │
                    │  (2-3 per gap, max 5)  │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  5. Search File Tree   │
                    │  (keyword scoring)     │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  6. Retrieve Files     │
                    │  (read top matches)    │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  7. Refine Analysis    │
                    │  (fill gaps with code) │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  8. Loop Back          │
                    │  (iteration++)         │
                    └────────────┬───────────┘
                                 │
                                 └──────────┐
                                            │
                      ┌─────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │  Back to Step 2       │
          │  (Evaluate again)     │
          └───────────────────────┘
```

## Quality Metrics

### Clarity Score (0-100)

**What it measures**: Writing quality, structure, and understandability

**Criteria**:

- Clear organization and flow
- Proper explanations of concepts
- Good use of examples
- No ambiguous language
- Professional documentation style

**Stopping threshold**: 80 (configurable)

### Completeness Score (0-100)

**What it measures**: Topic coverage breadth

**Criteria**:

- All major topics addressed
- No obvious missing sections
- Sufficient depth for each topic
- Comprehensive overview

**Usage**: Identifies gaps, not used for stopping

### Improvement Delta

**What it measures**: Progress between iterations

**Calculation**: `currentClarityScore - previousClarityScore`

**Stopping threshold**: < 10 points (diminishing returns)

### Iteration Count

**What it measures**: Number of refinement cycles

**Range**: 1-5

**Stopping threshold**: >= 5 (hard limit)

### Confidence (0.0-1.0)

**What it measures**: Agent's self-assessed quality

**Formula**:

```
baseConfidence = clarityScore / 100
iterationPenalty = (iterations - 1) × 0.05
quickBonus = (iterations <= 2) ? 0.1 : 0

confidence = CLAMP(baseConfidence - iterationPenalty + quickBonus, 0.0, 1.0)
```

**Interpretation**:

- `0.9-1.0`: Very high confidence
- `0.8-0.9`: High confidence
- `0.7-0.8`: Good confidence
- `< 0.7`: Lower confidence (more iterations or lower clarity)

## Configuration

### Default Settings

```json
{
  "refinement": {
    "enabled": true,
    "maxIterations": 5,
    "clarityThreshold": 80,
    "minImprovement": 10
  }
}
```

### Customization

You can adjust these via CLI or config file:

**Via Config** (`.archdoc.config.json`):

```json
{
  "refinement": {
    "enabled": true,
    "maxIterations": 3, // Fewer iterations = faster, less thorough
    "clarityThreshold": 85, // Higher = more strict quality
    "minImprovement": 15 // Higher = stops sooner if not improving much
  }
}
```

**Via CLI**:

```bash
archdoc analyze ./project \
  --refinement-iterations 3 \
  --refinement-threshold 85 \
  --refinement-improvement 15
```

## Example Execution

### Iteration 1

```
Initial Analysis Generated (1,245 chars)
├─ Evaluation:
│  ├─ Clarity: 65/100
│  └─ Completeness: 60/100
├─ Gaps Identified:
│  ├─ Missing: authentication mechanism
│  ├─ Missing: rate limiting strategy
│  └─ Unclear: database connection pooling
├─ Questions Generated: 5 questions
├─ Files Found: 12 relevant files
├─ Files Retrieved: 8 files (4,200 tokens)
└─ Refinement Complete → Clarity improved to 75 (+10)
   Decision: CONTINUE (clarity < 80)
```

### Iteration 2

```
Refined Analysis (2,890 chars)
├─ Evaluation:
│  ├─ Clarity: 75/100
│  └─ Completeness: 72/100
├─ Gaps Identified:
│  ├─ Missing: caching strategy
│  └─ Unclear: error handling patterns
├─ Questions Generated: 3 questions
├─ Files Found: 8 relevant files
├─ Files Retrieved: 6 files (3,100 tokens)
└─ Refinement Complete → Clarity improved to 84 (+9)
   Decision: STOP (clarity >= 80 ✓)
```

### Final Result

```
✓ Analysis Complete
  ├─ Clarity Score: 84/100
  ├─ Iterations: 2
  ├─ Confidence: 0.89
  ├─ Total Files Analyzed: 14
  ├─ Total Characters: 2,890
  └─ Execution Time: 45.2s
```

## Key Design Principles

### Self-Correcting

- Agent evaluates its own output
- No human intervention required
- Autonomous quality improvement

### Targeted Improvement

- Only asks questions about specific gaps
- Doesn't search blindly
- Efficient use of context

### Evidence-Based

- Uses actual code files to fill gaps
- Grounds analysis in project reality
- Not making assumptions

### Quality-Aware

- Knows when analysis is good enough
- Multiple stopping conditions
- Balances quality vs. cost/time

### Resource-Conscious

- Stops when improvements become minimal
- Respects iteration limits
- Prioritizes most relevant files

## Troubleshooting

### Agent stops too early

- **Increase** `clarityThreshold` (e.g., 85 or 90)
- **Decrease** `minImprovement` (e.g., 5)
- **Increase** `maxIterations` (e.g., 7)

### Agent iterates too much

- **Decrease** `clarityThreshold` (e.g., 75)
- **Increase** `minImprovement` (e.g., 15)
- **Decrease** `maxIterations` (e.g., 3)

### Low confidence scores

- Normal for complex projects
- Consider manual review if confidence < 0.7
- May need more context or different agent

### Analysis still has gaps

- Check if relevant files exist in project
- Consider adding custom agents
- Review file search scoring logic

## Related Documentation

- [Agent Development Guide](./AGENT_REFACTORING_GUIDE.md)
- [Custom Agents API](./API.md#creating-custom-agents)
- [Configuration Reference](./USER_GUIDE.md#configuration)
