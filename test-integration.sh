#!/bin/bash

# Integration test for MCP server config loading fixes
# Tests the complete flow from config loading to validate_architecture

set -e

echo "🧪 Running Integration Tests for MCP Server Fixes"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
  local test_name="$1"
  local test_command="$2"

  echo -e "${YELLOW}Testing:${NC} $test_name"

  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    ((TESTS_FAILED++))
  fi
  echo ""
}

# Test 1: Build
echo "📦 Step 1: Building project..."
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Build successful${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ Build failed${NC}"
  ((TESTS_FAILED++))
  exit 1
fi
echo ""

# Test 2: Config loading
echo "⚙️  Step 2: Testing config loading..."
node test-mcp-config.js | grep -q "Config loaded successfully"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Config loads correctly${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ Config loading failed${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3: LLM Service
echo "🤖 Step 3: Testing LLM Service initialization..."
node test-mcp-config.js | grep -q "LLMService initialized successfully"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ LLMService initializes correctly${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ LLMService initialization failed${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Test 4: Check imports
echo "📚 Step 4: Testing static imports (no dynamic imports)..."
if grep -q "await import.*config-loader" cli/commands/analyze.command.ts; then
  echo -e "${RED}❌ Found dynamic import (should be static)${NC}"
  ((TESTS_FAILED++))
else
  echo -e "${GREEN}✅ Using static imports${NC}"
  ((TESTS_PASSED++))
fi
echo ""

# Test 5: Check centralized function
echo "🔧 Step 5: Testing centralized initializeConfigAndLLM function..."
if grep -q "async function initializeConfigAndLLM" src/mcp-server/index.ts; then
  echo -e "${GREEN}✅ Centralized config function exists${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ Centralized config function missing${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Test 6: Check no truncation in validate_architecture
echo "✂️  Step 6: Testing no truncation in validate_architecture..."
if grep "substring(0, 2000)" src/mcp-server/index.ts; then
  echo -e "${RED}❌ Found substring(0, 2000) - still truncating!${NC}"
  ((TESTS_FAILED++))
else
  echo -e "${GREEN}✅ No truncation found${NC}"
  ((TESTS_PASSED++))
fi
echo ""

# Test 7: Check increased max tokens
echo "🔢 Step 7: Testing increased max tokens (4096 vs 2048)..."
if grep -q "maxTokens: 4096" src/mcp-server/index.ts; then
  echo -e "${GREEN}✅ Using 4096 max tokens${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠️  maxTokens not set to 4096${NC}"
fi
echo ""

# Summary
echo "=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Generate docs: npm run cli -- analyze ."
  echo "2. Run validation test: node test-validate-architecture.js"
  echo "3. Start MCP server: npm run mcp:dev"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
