import { Logger } from './logger';

/**
 * Utility for parsing JSON from LLM responses that may contain markdown formatting
 * Language-agnostic parser that handles various response formats
 */
export class LLMJsonParser {
  private static logger = new Logger('LLMJsonParser');

  /**
   * Extract JSON from LLM response with multiple fallback strategies
   *
   * @param result - Raw LLM response text
   * @param options - Parsing options
   * @returns Parsed JSON object or fallback structure
   */
  public static parse<T = Record<string, unknown>>(
    result: string,
    options?: {
      fallback?: T;
      logErrors?: boolean;
      contextName?: string; // For better error messages (e.g., "schema-generator")
    },
  ): T {
    const { fallback, logErrors = true, contextName = 'LLM' } = options || {};

    try {
      // Strategy 1: Extract from ```json code blocks
      const jsonCodeBlock = this.extractFromCodeBlock(result, 'json');
      if (jsonCodeBlock) {
        return this.parseWithCleanup<T>(jsonCodeBlock, 5);
      }

      // Strategy 2: Extract from any code block (without language identifier)
      const genericCodeBlock = this.extractFromGenericCodeBlock(result);
      if (genericCodeBlock) {
        try {
          return this.parseWithCleanup<T>(genericCodeBlock, 5);
        } catch {
          // Not valid JSON, continue
        }
      }

      // Strategy 3: Find JSON object anywhere in text
      const jsonObject = this.extractJsonObject(result);
      if (jsonObject) {
        return this.parseWithCleanup<T>(jsonObject, 5);
      }

      // Strategy 3.5: If truncated, find the first '{' and extract everything from there to the end
      const firstBrace = result.indexOf('{');
      if (firstBrace !== -1) {
        try {
          return this.parseWithCleanup<T>(result.substring(firstBrace), 5);
        } catch {
          // Continue to next strategy if it fails
        }
      }

      // Strategy 4: Parse entire response as JSON
      return this.parseWithCleanup<T>(result, 5);
    } catch (error) {
      // Check if response is truncated (missing closing backticks or braces)
      const isTruncated = this.detectTruncation(result);

      if (isTruncated && logErrors) {
        this.logger.warn(
          `${contextName}: Response appears truncated (missing closing markers). Increase maxTokens or reduce input size.`,
          {
            error: error instanceof Error ? error.message : String(error),
            preview: result.substring(0, 200),
            endPreview: result.substring(Math.max(0, result.length - 100)),
          },
        );
      } else if (logErrors) {
        this.logger.warn(`${contextName}: Failed to parse JSON from LLM response`, {
          error: error instanceof Error ? error.message : String(error),
          preview: result.substring(0, 200),
        });
      }

      if (fallback) {
        return fallback;
      }

      throw new Error(
        `Failed to parse JSON from ${contextName} response: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Detect if LLM response appears to be truncated
   */
  private static detectTruncation(text: string): boolean {
    // Check for incomplete code blocks
    const hasOpeningBackticks = text.includes('```');
    const backtickCount = (text.match(/```/g) || []).length;

    // Odd number of backticks = unclosed block
    if (hasOpeningBackticks && backtickCount % 2 !== 0) {
      return true;
    }

    // Check for unbalanced braces
    const openBraces = (text.match(/{/g) || []).length;
    const closeBraces = (text.match(/}/g) || []).length;

    if (openBraces > closeBraces + 2) {
      // Allow some tolerance for nested objects
      return true;
    }

    return false;
  }

  /**
   * Parse JSON with progressive cleanup strategies
   * Handles common LLM formatting issues like trailing commas, comments, etc.
   */
  private static parseWithCleanup<T>(jsonStr: string, maxRetries: number): T {
    let currentAttempt = jsonStr;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return JSON.parse(currentAttempt) as T;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error; // Last attempt failed
        }

        // Progressive cleanup strategies
        switch (i) {
          case 0:
            // Remove trailing commas before } or ]
            currentAttempt = currentAttempt.replace(/,(\s*[}\]])/g, '$1');
            break;
          case 1:
            // Remove single-line comments
            currentAttempt = currentAttempt.replace(/\/\/.*$/gm, '');
            break;
          case 2:
            // Remove multi-line comments
            currentAttempt = currentAttempt.replace(/\/\*[\s\S]*?\*\//g, '');
            break;
          case 3:
            // Attempt to repair truncated or syntactically malformed JSON
            currentAttempt = this.repairJson(currentAttempt);
            break;
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error('JSON parsing failed after all cleanup attempts');
  }

  /**
   * Extract content from code block with specific language identifier
   * Example: ```json { ... } ``` or ````json { ... } ````
   * Also handles edge cases like: ` ```json`, `\n```json`, etc.
   */
  private static extractFromCodeBlock(text: string, language: string): string | null {
    // Strategy 1: Most flexible - match any whitespace between markers
    // Matches: ```json\n{...}\n```, ```json{...}```, ``` json {` ...} ``` etc.
    let regex = new RegExp(`\`\`\`\\s*${language}\\s*([\\s\\S]*?)\\s*\`\`\``, 'i');
    let match = text.match(regex);

    // Strategy 2: Quadruple backticks (sometimes LLMs use this)
    if (!match) {
      regex = new RegExp(`\`\`\`\`\\s*${language}\\s*([\\s\\S]*?)\\s*\`\`\`\``, 'i');
      match = text.match(regex);
    }

    if (!match) return null;

    const content = match[1].trim();

    // Skip if content starts with markdown header (# Title)
    // This indicates the LLM wrapped markdown around the JSON block
    if (content.startsWith('#')) {
      return null;
    }

    return content;
  }

  /**
   * Extract content from generic code block (``` ... ```)
   * Skips blocks that start with known language identifiers
   */
  private static extractFromGenericCodeBlock(text: string): string | null {
    const match = text.match(/```\s*([\s\S]*?)\s*```/);
    if (!match) return null;

    const content = match[1].trim();

    // Skip if it starts with a language identifier
    // Common identifiers: json, javascript, typescript, python, java, csharp, go, rust, etc.
    const hasLanguageId =
      /^(json|javascript|typescript|python|java|csharp|c#|go|rust|ruby|php|kotlin|swift|scala|sql|yaml|toml|xml|html|css|bash|shell|powershell)\b/i.test(
        content,
      );

    return hasLanguageId ? null : content;
  }

  /**
   * Extract JSON object from anywhere in text
   * Finds the first occurrence of { ... }
   */
  private static extractJsonObject(text: string): string | null {
    // Find balanced braces for JSON object
    let braceCount = 0;
    let startIndex = -1;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          // Found complete JSON object
          return text.substring(startIndex, i + 1);
        }
      }
    }

    return null;
  }

  /**
   * Validate if string is valid JSON without throwing
   */
  public static isValidJson(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract multiple JSON objects from text
   * Useful for responses containing multiple separate JSON blocks
   */
  public static parseMultiple<T = Record<string, unknown>>(text: string): T[] {
    const results: T[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
      let braceCount = 0;
      let startIndex = -1;

      for (let i = currentPos; i < text.length; i++) {
        if (text[i] === '{') {
          if (braceCount === 0) {
            startIndex = i;
          }
          braceCount++;
        } else if (text[i] === '}') {
          braceCount--;
          if (braceCount === 0 && startIndex !== -1) {
            const jsonStr = text.substring(startIndex, i + 1);
            try {
              results.push(JSON.parse(jsonStr) as T);
            } catch {
              // Skip invalid JSON
            }
            currentPos = i + 1;
            break;
          }
        }

        // No more JSON objects found
        if (i === text.length - 1) {
          currentPos = text.length;
        }
      }

      // Prevent infinite loop
      if (currentPos === text.length || startIndex === -1) {
        break;
      }
    }

    return results;
  }

  /**
   * Repair malformed or truncated JSON strings
   */
  public static repairJson(text: string): string {
    // 1. Tokenize the input string
    const tokens: { type: string; value: string }[] = [];
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      // Skip whitespace
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        i++;
        continue;
      }

      if (
        char === '{' ||
        char === '}' ||
        char === '[' ||
        char === ']' ||
        char === ':' ||
        char === ','
      ) {
        tokens.push({ type: char, value: char });
        i++;
        continue;
      }

      if (char === '"') {
        let strVal = '"';
        let escaped = false;
        i++;
        let closed = false;

        while (i < text.length) {
          const sChar = text[i];
          if (escaped) {
            strVal += sChar;
            escaped = false;
            i++;
          } else if (sChar === '\\') {
            strVal += sChar;
            escaped = true;
            i++;
          } else if (sChar === '"') {
            // Check lookahead to see if this is a closing quote
            let nextChar: string | null = null;
            let nextStr = '';
            for (let j = i + 1; j < text.length; j++) {
              const nextCandidate = text[j];
              if (
                nextCandidate !== ' ' &&
                nextCandidate !== '\t' &&
                nextCandidate !== '\n' &&
                nextCandidate !== '\r'
              ) {
                nextChar = nextCandidate;
                nextStr = text.substring(j);
                break;
              }
            }

            let isClosing = false;
            if (
              nextChar === null ||
              nextChar === ':' ||
              nextChar === ',' ||
              nextChar === '}' ||
              nextChar === ']' ||
              nextChar === '{' ||
              nextChar === '[' ||
              nextChar === '"' ||
              nextChar === '-' ||
              (nextChar >= '0' && nextChar <= '9')
            ) {
              isClosing = true;
            } else if (/^(true|false|null)\b/i.test(nextStr)) {
              isClosing = true;
            }

            if (isClosing) {
              strVal += '"';
              closed = true;
              i++;
              break;
            } else {
              // Unescaped quote inside string
              strVal += '\\"';
              i++;
            }
          } else {
            strVal += sChar;
            i++;
          }
        }

        if (!closed) {
          strVal += '"'; // Auto-close truncated string
        }
        tokens.push({ type: 'STRING', value: strVal });
        continue;
      }

      // Literal (number, boolean, null)
      let literalVal = '';
      while (i < text.length) {
        const lChar = text[i];
        if (/[a-zA-Z0-9_.\-+]/.test(lChar)) {
          literalVal += lChar;
          i++;
        } else {
          break;
        }
      }

      if (literalVal.length > 0) {
        tokens.push({ type: 'LITERAL', value: literalVal });
      } else {
        // Skip invalid character to prevent infinite loops
        i++;
      }
    }

    // 2. Reconstruct valid JSON from tokens
    let repaired = '';
    const stack: { type: '{' | '['; expected: 'KEY' | 'COLON' | 'VALUE' | 'COMMA' }[] = [];

    for (let k = 0; k < tokens.length; k++) {
      const token = tokens[k];
      const top = stack[stack.length - 1];

      if (token.type === '{') {
        if (top) {
          if (top.expected === 'COMMA') {
            repaired += ',';
            top.expected = 'KEY';
          }
        }
        repaired += '{';
        stack.push({ type: '{', expected: 'KEY' });
      } else if (token.type === '[') {
        if (top) {
          if (top.expected === 'COMMA') {
            repaired += ',';
            if (top.type === '[') top.expected = 'VALUE';
          }
        }
        repaired += '[';
        stack.push({ type: '[', expected: 'VALUE' });
      } else if (token.type === '}') {
        let found = false;
        while (stack.length > 0) {
          const popped = stack.pop();
          if (popped && popped.type === '{') {
            repaired += '}';
            found = true;
            break;
          } else {
            repaired += ']';
          }
        }
        if (found) {
          const newTop = stack[stack.length - 1];
          if (newTop) {
            newTop.expected = 'COMMA';
          }
        }
      } else if (token.type === ']') {
        let found = false;
        while (stack.length > 0) {
          const popped = stack.pop();
          if (popped && popped.type === '[') {
            repaired += ']';
            found = true;
            break;
          } else {
            repaired += '}';
          }
        }
        if (found) {
          const newTop = stack[stack.length - 1];
          if (newTop) {
            newTop.expected = 'COMMA';
          }
        }
      } else if (token.type === ':') {
        if (top && top.type === '{') {
          repaired += ':';
          top.expected = 'VALUE';
        }
      } else if (token.type === ',') {
        if (top) {
          repaired += ',';
          top.expected = top.type === '{' ? 'KEY' : 'VALUE';
        }
      } else if (token.type === 'STRING') {
        if (top) {
          if (top.type === '{') {
            if (top.expected === 'COMMA') {
              repaired += ',';
              top.expected = 'KEY';
            }
            repaired += token.value;
            top.expected = top.expected === 'KEY' ? 'COLON' : 'COMMA';
          } else if (top.type === '[') {
            if (top.expected === 'COMMA') {
              repaired += ',';
            }
            repaired += token.value;
            top.expected = 'COMMA';
          }
        } else {
          repaired += token.value;
        }
      } else if (token.type === 'LITERAL') {
        let val = token.value;
        if (val === 'undefined') {
          val = 'null';
        }

        if (top) {
          if (top.type === '{') {
            if (top.expected === 'COMMA') {
              repaired += ',';
              top.expected = 'KEY';
            }
            if (top.expected === 'KEY') {
              repaired += `"${val}"`;
              top.expected = 'COLON';
            } else {
              repaired += val;
              top.expected = 'COMMA';
            }
          } else if (top.type === '[') {
            if (top.expected === 'COMMA') {
              repaired += ',';
            }
            repaired += val;
            top.expected = 'COMMA';
          }
        } else {
          repaired += val;
        }
      }
    }

    while (stack.length > 0) {
      const popped = stack.pop();
      if (popped) {
        if (popped.type === '{') {
          if (repaired.trim().endsWith(':')) {
            repaired += 'null';
          }
          repaired += '}';
        } else if (popped.type === '[') {
          repaired += ']';
        }
      }
    }

    return repaired;
  }
}
