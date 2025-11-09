@echo off
setlocal enabledelayedexpansion

:: Integration test for MCP server config loading fixes
:: Tests the complete flow from config loading to validate_architecture

echo.
echo 🧪 Running Integration Tests for MCP Server Fixes
echo ==================================================
echo.

set TESTS_PASSED=0
set TESTS_FAILED=0

:: Test 1: Build
echo 📦 Step 1: Building project...
call npm run build >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  echo ✅ Build successful
  set /a TESTS_PASSED+=1
) else (
  echo ❌ Build failed
  set /a TESTS_FAILED+=1
  exit /b 1
)
echo.

:: Test 2: Config loading
echo ⚙️  Step 2: Testing config loading...
node test-mcp-config.js | findstr "Config loaded successfully" >nul
if %ERRORLEVEL% EQU 0 (
  echo ✅ Config loads correctly
  set /a TESTS_PASSED+=1
) else (
  echo ❌ Config loading failed
  set /a TESTS_FAILED+=1
)
echo.

:: Test 3: LLM Service
echo 🤖 Step 3: Testing LLM Service initialization...
node test-mcp-config.js | findstr "LLMService initialized successfully" >nul
if %ERRORLEVEL% EQU 0 (
  echo ✅ LLMService initializes correctly
  set /a TESTS_PASSED+=1
) else (
  echo ❌ LLMService initialization failed
  set /a TESTS_FAILED+=1
)
echo.

:: Test 4: Check static imports
echo 📚 Step 4: Testing static imports (no dynamic imports)...
findstr /C:"await import.*config-loader" cli\commands\analyze.command.ts >nul
if %ERRORLEVEL% NEQ 0 (
  echo ✅ Using static imports
  set /a TESTS_PASSED+=1
) else (
  echo ❌ Found dynamic import (should be static)
  set /a TESTS_FAILED+=1
)
echo.

:: Test 5: Check centralized function
echo 🔧 Step 5: Testing centralized initializeConfigAndLLM function...
findstr /C:"async function initializeConfigAndLLM" src\mcp-server\index.ts >nul
if %ERRORLEVEL% EQU 0 (
  echo ✅ Centralized config function exists
  set /a TESTS_PASSED+=1
) else (
  echo ❌ Centralized config function missing
  set /a TESTS_FAILED+=1
)
echo.

:: Test 6: Check no truncation
echo ✂️  Step 6: Testing no truncation in validate_architecture...
findstr "substring(0, 2000)" src\mcp-server\index.ts >nul
if %ERRORLEVEL% NEQ 0 (
  echo ✅ No truncation found
  set /a TESTS_PASSED+=1
) else (
  echo ❌ Found substring(0, 2000) - still truncating!
  set /a TESTS_FAILED+=1
)
echo.

:: Test 7: Check increased max tokens
echo 🔢 Step 7: Testing increased max tokens (4096 vs 2048)...
findstr "maxTokens: 4096" src\mcp-server\index.ts >nul
if %ERRORLEVEL% EQU 0 (
  echo ✅ Using 4096 max tokens
  set /a TESTS_PASSED+=1
) else (
  echo ⚠️  maxTokens not set to 4096
)
echo.

:: Summary
echo ==================================================
echo 📊 Test Summary
echo ==================================================
echo Passed: %TESTS_PASSED%
echo Failed: %TESTS_FAILED%
echo.

if %TESTS_FAILED% EQU 0 (
  echo 🎉 All tests passed!
  echo.
  echo Next steps:
  echo 1. Generate docs: npm run cli -- analyze .
  echo 2. Run validation test: node test-validate-architecture.js
  echo 3. Start MCP server: npm run mcp:dev
  exit /b 0
) else (
  echo ❌ Some tests failed
  exit /b 1
)