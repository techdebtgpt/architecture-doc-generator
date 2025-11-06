import { LLMJsonParser } from '../../src/utils/json-parser';

describe('LLMJsonParser', () => {
  describe('parse() - Standard JSON', () => {
    it('should parse plain JSON object', () => {
      const input = '{"name": "test", "value": 123}';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should parse JSON from text with array (extracts first object)', () => {
      // Note: When JSON is in text, parser extracts first complete object
      const input = 'Result: [{"id": 1}, {"id": 2}]';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ id: 1 });
    });

    it('should extract first object from JSON array', () => {
      // extractJsonObject finds first complete {} in the string
      const input = '[{"id": 1}, {"id": 2}]';
      const result = LLMJsonParser.parse(input);
      // Gets first object only
      expect(result).toEqual({ id: 1 });
    });

    it('should handle nested objects', () => {
      const input = '{"user": {"name": "John", "age": 30, "address": {"city": "NYC"}}}';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({
        user: { name: 'John', age: 30, address: { city: 'NYC' } },
      });
    });
  });

  describe('parse() - Markdown Code Blocks', () => {
    it('should extract JSON from ```json code block', () => {
      const input = '```json\n{"name": "test", "value": 123}\n```';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should extract JSON from ```json without newlines', () => {
      const input = '```json{"name": "test"}```';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should extract JSON with extra whitespace', () => {
      const input = '```  json  \n\n  {"name": "test"}  \n\n  ```';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should extract JSON from quadruple backticks', () => {
      const input = '````json\n{"name": "test"}\n````';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should extract JSON with text before and after', () => {
      const input = 'Here is the result:\n```json\n{"status": "ok"}\n```\nDone!';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ status: 'ok' });
    });

    it('should extract from generic code block if no language specified', () => {
      const input = '```\n{"name": "test"}\n```';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });
  });

  describe('parse() - Cleanup Strategies', () => {
    it('should remove trailing commas', () => {
      const input = '```json\n{"name": "test", "items": [1, 2, 3,],}\n```';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test', items: [1, 2, 3] });
    });

    it('should remove single-line comments', () => {
      const input = '```json\n{"name": "test", // This is a name\n"value": 123}\n```';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should remove multi-line comments', () => {
      const input = '```json\n{"name": "test", /* comment here */ "value": 123}\n```';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test', value: 123 });
    });
  });

  describe('parse() - Schema Agent Scenarios', () => {
    it('should parse schema agent response with Prisma data', () => {
      const input = `\`\`\`json
{
  "summary": "Comprehensive schema documentation for Tech Debt API",
  "schemas": [
    {
      "type": "database",
      "name": "Prisma Database Schema",
      "description": "Multi-tenant SaaS platform schema",
      "diagram": "erDiagram\\n  User ||--o{ Project : creates",
      "entities": [
        {
          "name": "User",
          "type": "table",
          "description": "User accounts",
          "fields": [
            {"name": "id", "type": "string", "required": true}
          ]
        }
      ],
      "relationships": [],
      "insights": ["Uses Prisma ORM"]
    }
  ],
  "warnings": []
}
\`\`\``;

      const result = LLMJsonParser.parse(input);
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('schemas');
      expect(Array.isArray((result as any).schemas)).toBe(true);
      expect((result as any).schemas).toHaveLength(1);
      expect((result as any).schemas[0].name).toBe('Prisma Database Schema');
    });

    it('should handle large schema responses', () => {
      // Simulate a large response with many entities
      const entities = Array.from({ length: 50 }, (_, i) => ({
        name: `Entity${i}`,
        type: 'table',
        fields: [{ name: 'id', type: 'string' }],
      }));

      const input = `\`\`\`json
{
  "summary": "Large schema",
  "schemas": [{
    "type": "database",
    "name": "Large Schema",
    "entities": ${JSON.stringify(entities)}
  }]
}
\`\`\``;

      const result = LLMJsonParser.parse(input);
      expect((result as any).schemas[0].entities).toHaveLength(50);
    });
  });

  describe('parse() - Error Handling', () => {
    it('should use fallback for invalid JSON', () => {
      const input = 'not valid json at all';
      const fallback = { error: true };
      const result = LLMJsonParser.parse(input, { fallback, logErrors: false });
      expect(result).toEqual(fallback);
    });

    it('should throw without fallback', () => {
      const input = 'not valid json at all';
      expect(() => LLMJsonParser.parse(input, { logErrors: false })).toThrow();
    });

    it('should handle empty string', () => {
      const input = '';
      const fallback = { empty: true };
      const result = LLMJsonParser.parse(input, { fallback, logErrors: false });
      expect(result).toEqual(fallback);
    });

    it('should handle incomplete JSON (truncated)', () => {
      const input = '```json\n{"name": "test", "items": [1, 2, 3';
      const fallback = { truncated: true };
      const result = LLMJsonParser.parse(input, { fallback, logErrors: false });
      expect(result).toEqual(fallback);
    });
  });

  describe('detectTruncation()', () => {
    // Note: detectTruncation is private, but we can test via parse behavior
    it('should extract JSON even with unclosed code blocks', () => {
      // Parser is smart enough to extract the valid JSON inside
      const input = '```json\n{"name": "test"}'; // Missing closing ```
      const result = LLMJsonParser.parse(input, { logErrors: false });
      expect(result).toEqual({ name: 'test' });
    });

    it('should detect unbalanced braces and use fallback', () => {
      const input = '{"name": "test", "nested": {"value": 123'; // Missing closing }
      const fallback = { truncated: true };
      const result = LLMJsonParser.parse(input, { fallback, logErrors: false });
      expect(result).toEqual(fallback);
    });
  });

  describe('extractJsonObject()', () => {
    it('should extract JSON from mixed text', () => {
      const input = 'Some text before {"name": "test"} some text after';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should extract first JSON object from multiple', () => {
      const input = '{"first": 1} {"second": 2}';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ first: 1 });
    });

    it('should handle deeply nested objects', () => {
      const input = 'Text {"a": {"b": {"c": {"d": "deep"}}}} more text';
      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ a: { b: { c: { d: 'deep' } } } });
    });
  });

  describe('isValidJson()', () => {
    it('should return true for valid JSON', () => {
      expect(LLMJsonParser.isValidJson('{"name": "test"}')).toBe(true);
      expect(LLMJsonParser.isValidJson('[1, 2, 3]')).toBe(true);
      expect(LLMJsonParser.isValidJson('"string"')).toBe(true);
      expect(LLMJsonParser.isValidJson('123')).toBe(true);
      expect(LLMJsonParser.isValidJson('null')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(LLMJsonParser.isValidJson('not json')).toBe(false);
      expect(LLMJsonParser.isValidJson('{"unclosed": ')).toBe(false);
      expect(LLMJsonParser.isValidJson('{trailing: comma,}')).toBe(false);
    });
  });

  describe('parseMultiple()', () => {
    it('should extract multiple JSON objects', () => {
      const input = '{"first": 1} some text {"second": 2} more {"third": 3}';
      const results = LLMJsonParser.parseMultiple(input);
      expect(results).toEqual([{ first: 1 }, { second: 2 }, { third: 3 }]);
    });

    it('should skip invalid JSON objects', () => {
      const input = '{"valid": 1} {invalid json} {"also valid": 2}';
      const results = LLMJsonParser.parseMultiple(input);
      expect(results).toEqual([{ valid: 1 }, { 'also valid': 2 }]);
    });

    it('should handle empty string', () => {
      const results = LLMJsonParser.parseMultiple('');
      expect(results).toEqual([]);
    });

    it('should handle text with no JSON', () => {
      const results = LLMJsonParser.parseMultiple('just some text here');
      expect(results).toEqual([]);
    });
  });

  describe('Real-world LLM Response Scenarios', () => {
    it('should handle Claude response with explanation', () => {
      const input = `Here's the analysis you requested:

\`\`\`json
{
  "summary": "Analysis complete",
  "findings": ["item1", "item2"]
}
\`\`\`

Let me know if you need anything else!`;

      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({
        summary: 'Analysis complete',
        findings: ['item1', 'item2'],
      });
    });

    it('should handle response with markdown before JSON', () => {
      const input = `# Analysis Results

Here are the findings:

\`\`\`json
{"status": "success", "count": 42}
\`\`\``;

      const result = LLMJsonParser.parse(input);
      expect(result).toEqual({ status: 'success', count: 42 });
    });

    it('should handle response with escaped newlines as fallback', () => {
      // Literal backslash-n characters are not valid in JSON context
      // Parser should use fallback for malformed input
      const input = '```json\\n{"name": "test"}\\n```';
      const fallback = { parsed: false };
      const result = LLMJsonParser.parse(input, { fallback, logErrors: false });
      expect(result).toEqual(fallback);
    });
  });
});
