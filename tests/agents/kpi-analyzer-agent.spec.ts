import { KPIAnalyzerAgent } from '../../src/agents/kpi-analyzer-agent';

// Declare base class first to prevent TS2448 block-scoped variable usage error
const TestKPIAnalyzerAgentBase = KPIAnalyzerAgent;

class TestKPIAnalyzerAgent extends TestKPIAnalyzerAgentBase {
  public async testParseAnalysis(analysis: string) {
    return this.parseAnalysis(analysis);
  }
}

describe('KPIAnalyzerAgent parseAnalysis', () => {
  let agent: TestKPIAnalyzerAgent;

  beforeEach(() => {
    agent = new TestKPIAnalyzerAgent();
  });

  it('should successfully parse valid KPI output JSON without modifications', async () => {
    const validJson = JSON.stringify({
      healthScore: {
        overall: 85,
        codeQuality: 8,
        testing: 7,
        architecture: 9,
        dependencies: 8,
        complexity: 7,
        errorHandling: 8,
        dataContracts: 9,
        technicalDebt: 8,
        rating: 'excellent'
      },
      codeOrganization: {
        totalFiles: 100,
        codeFiles: 80,
        testFiles: 10,
        configFiles: 10,
        testCoverageRatio: 0.12,
        sizeCategory: 'small'
      },
      insights: [
        {
          category: 'architecture',
          severity: 'high',
          title: 'Clean Architecture',
          description: 'The architecture is well separated.',
          recommendation: 'Keep doing this.'
        }
      ],
      recommendations: [
        {
          priority: 'p1',
          title: 'Write more tests',
          description: 'Currently testing score is 7.',
          effort: '1 sprint',
          impact: 'high'
        }
      ]
    });

    const result = await agent.testParseAnalysis(validJson);
    expect(result.healthScore).toHaveProperty('rating', 'excellent');
    expect((result.insights as any[])[0]).toHaveProperty('category', 'architecture');
  });

  it('should normalize invalid enum values (e.g. spaces in category names) and parse successfully', async () => {
    const jsonWithSpaces = JSON.stringify({
      healthScore: {
        overall: 46,
        codeQuality: 5,
        testing: 0,
        architecture: 6,
        dependencies: 3,
        complexity: 5,
        errorHandling: 5,
        dataContracts: 6,
        technicalDebt: 4,
        rating: 'FAIR' // checks rating casing normalization
      },
      codeOrganization: {
        totalFiles: 1500,
        codeFiles: 1200,
        testFiles: 0,
        configFiles: 300,
        testCoverageRatio: 0,
        sizeCategory: 'very large' // checks sizeCategory spacing
      },
      insights: [
        {
          category: 'error handling', // invalid enum (should be error-handling)
          severity: 'HIGH', // invalid case
          title: 'Error Handling Gap',
          description: 'No global error handling filter',
          recommendation: 'Add exception filter'
        },
        {
          category: 'technical debt', // invalid enum (should be technical-debt)
          severity: 'medium',
          title: 'Technical Debt',
          description: 'Many TODO markers found',
          recommendation: 'Clean up TODOs'
        }
      ],
      recommendations: [
        {
          priority: 'Priority 1', // invalid format (should be p1)
          title: 'Refactor exception handling',
          description: 'Create a handler middleware',
          effort: '2 days',
          impact: 'CRITICAL' // invalid case
        }
      ]
    });

    const result = await agent.testParseAnalysis(jsonWithSpaces);

    // Verify all normalized values match Zod enums
    expect(result.healthScore).toHaveProperty('rating', 'fair');
    expect(result.codeOrganization).toHaveProperty('sizeCategory', 'very-large');
    
    const insights = result.insights as any[];
    expect(insights[0]).toHaveProperty('category', 'error-handling');
    expect(insights[0]).toHaveProperty('severity', 'high');
    
    expect(insights[1]).toHaveProperty('category', 'technical-debt');

    const recs = result.recommendations as any[];
    expect(recs[0]).toHaveProperty('priority', 'p1');
    expect(recs[0]).toHaveProperty('impact', 'critical');
  });

  it('should fall back to minimal data on parsing failure', async () => {
    const invalidJson = '{"healthScore": "completely invalid json...';
    const result = await agent.testParseAnalysis(invalidJson);
    expect(result).toHaveProperty('hasMinimalData', true);
    expect(result.healthScore).toHaveProperty('rating', 'poor');
  });
});
