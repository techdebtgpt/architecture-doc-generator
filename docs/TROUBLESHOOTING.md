# Troubleshooting

## Archdoc analyze fails with Google Gemini 2.5 Pro + OpenAI Embeddings

### Symptom

When running `archdoc analyze` with **Google Gemini 2.5 Pro** as the LLM and **OpenAI Embeddings**, the architecture-analyzer agent may fail with:

```
TypeError: Cannot read properties of undefined (reading 'length')
    at mapGenerateContentResultToChatResult (.../node_modules/@langchain/google-genai/dist/utils/common.cjs:229:32)
```

### Root cause

The error occurs inside **`@langchain/google-genai`** (the LangChain integration for Google's Generative AI SDK), not in Archdoc itself.

- **Where it happens:** In `mapGenerateContentResultToChatResult` in `dist/utils/common.cjs`. The code assumes every response candidate has a `content.parts` array.
- **Why it breaks:** With **Gemini 2.5 Pro**, the Google API can sometimes return a candidate where `content` has no `parts` (or `parts` is undefined). This can happen when:
  - The response was blocked by a safety filter (`finishReason: SAFETY`)
  - The output token limit was reached (`finishReason: MAX_TOKENS`) and the API returns no parts
  - Other API/response reasons

Helper steps (e.g. security pattern discovery, architecture style) and clarity evaluation use increased token limits to reduce MAX_TOKENS on short answers.

When that happens, the library tries to read `.length` on `undefined`, which triggers the TypeError. See [Google's documentation](https://discuss.ai.google.dev/t/gemini-api-returns-undefined-response-causing-candidate-content-parts-error-in-production/110886) on handling empty/blocked responses.

### What we do

This project applies a **patch** to `@langchain/google-genai@0.1.12` so that when the API returns a candidate with no `content.parts`, we return **one empty generation** (empty text) and filters instead of crashing. That way both the mapping code and the caller (`chat_models.cjs`, which reads `generations[0].text`) stay safe. The patch is applied automatically after `npm install` via `patch-package` (see `patches/@langchain+google-genai+0.1.12.patch`).

**Visibility:** The patch does not log by default. When Gemini returns empty/blocked content, you will see **one warning per affected step** from the application (e.g. "Initial analysis returned empty content", or helper fallbacks for security/architecture style). For full evidence from the library (e.g. for issue reporting), run:

```bash
DEBUG=langchain archdoc analyze
```

You will then see the patch’s **Evidence** object: `finishReason`, `promptFeedback`, `contentKeys`, etc.

**App-level checks:** If the main initial analysis or clarity evaluation returns empty content, the workflow logs a warning so you know a critical step got no output. Helper steps (e.g. security pattern discovery, architecture style detection) also log when they fall back due to empty response.

### If you still see the error

1. Ensure you have run `npm install` so the patch is applied (check that `patches/@langchain+google-genai+0.1.12.patch` exists and `postinstall` runs `patch-package`).
2. If you use a different package manager (e.g. pnpm), you may need to ensure `patch-package` runs after install, or use pnpm's built-in patching.
3. As a workaround, use another Google model that may not trigger this path: e.g. `gemini-1.5-pro` or `gemini-2.0-flash-exp` in your config.

### Summary

| Item                    | Detail                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Error**               | `TypeError: Cannot read properties of undefined (reading 'length')` in `mapGenerateContentResultToChatResult` |
| **Location**            | `@langchain/google-genai` response mapping                                                                    |
| **Trigger**             | Gemini returning a candidate without `content.parts` (e.g. safety block)                                      |
| **Fix in this project** | Patched dependency via `patch-package`; guard for missing/empty `parts`                                       |
| **Workaround**          | Use `gemini-1.5-pro` or `gemini-2.0-flash-exp` if the patch is not applied                                    |
