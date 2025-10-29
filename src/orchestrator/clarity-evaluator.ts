import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import type { AgentResult, AgentMetadata, AgentContext } from '../types/agent.types';
import { LLMService } from '../llm/llm-service';
import { Logger } from '../utils/logger';

/**
 * Represents an unclear section in agent output
 */
export interface UnclearSection {
  section: string;
  reason: string;
  suggestedQuestion: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Result of clarity evaluation
 */
export interface ClarityEvaluation {
  score: number; // 0-100
  unclearSections: UnclearSection[];
  followUpQuestions: string[];
  confidence: number; // 0-1
  recommendations: string[];
}

/**
 * Tracks refinement iteration history
 */
export interface RefinementIteration {
  iterationNumber: number;
  agentName: string;
  clarityScore: number;
  unclearSections: UnclearSection[];
  followUpQuestions: string[];
  previousResult: AgentResult;
  improvedResult?: AgentResult;
  improvementPercentage?: number;
}

/**
 * Evaluates agent output clarity and generates follow-up questions
 */
export class ClarityEvaluator {
  private llmService: LLMService;
  private logger: Logger;

  constructor() {
    this.llmService = LLMService.getInstance();
    this.logger = new Logger('ClarityEvaluator');
  }

  /**
   * Evaluate how complete and clear an agent's output is
   */
  async evaluateClarity(
    agentResult: AgentResult,
    agentMetadata: AgentMetadata,
    context: AgentContext,
  ): Promise<ClarityEvaluation> {
    const model = this.llmService.getChatModel({
      temperature: 0.1, // Low temperature for consistent evaluation
      maxTokens: 2000,
    });

    const systemPrompt = this.buildSystemPrompt();
    const humanPrompt = this.buildHumanPrompt(agentResult, agentMetadata, context);

    const chain = RunnableSequence.from([
      RunnableLambda.from(() => [systemPrompt, humanPrompt]).withConfig({
        runName: 'ClarityEvaluation-BuildPrompt',
      }),
      model.withConfig({ runName: 'ClarityEvaluation-LLMAnalysis' }),
      new StringOutputParser().withConfig({ runName: 'ClarityEvaluation-ParseOutput' }),
    ]).withConfig({ runName: 'ClarityEvaluation' });

    try {
      const resultText = await chain.invoke({});
      const evaluation = this.parseEvaluationResult(resultText);

      return evaluation;
    } catch (_error) {
      this.logger.warn(`Failed to evaluate clarity: ${(_error as Error)?.message ?? _error}`);

      // Return conservative evaluation on failure
      return {
        score: 70, // Assume acceptable but not perfect
        unclearSections: [],
        followUpQuestions: [],
        confidence: 0.5,
        recommendations: ['Unable to perform clarity evaluation'],
      };
    }
  }

  /**
   * Generate targeted follow-up questions for unclear sections
   */
  async generateFollowUpQuestions(
    unclearSections: UnclearSection[],
    _agentMetadata: AgentMetadata,
  ): Promise<string[]> {
    if (unclearSections.length === 0) {
      return [];
    }

    // Prioritize by importance
    const prioritized = this.prioritizeUnclearSections(unclearSections);

    // Take top 5 most important questions
    return prioritized.slice(0, 5).map((section) => section.suggestedQuestion);
  }

  /**
   * Calculate improvement between iterations
   */
  calculateImprovement(previousScore: number, currentScore: number): number {
    if (previousScore === 0) return 100;
    return ((currentScore - previousScore) / previousScore) * 100;
  }

  /**
   * Determine if refinement should continue
   */
  shouldContinueRefinement(
    currentScore: number,
    threshold: number,
    iteration: number,
    maxIterations: number,
    improvementPercentage?: number,
    minImprovement: number = 10,
  ): boolean {
    // Stop if we've reached threshold
    if (currentScore >= threshold) {
      return false;
    }

    // Stop if we've reached max iterations
    if (iteration >= maxIterations) {
      return false;
    }

    // Stop if improvement is too small (diminishing returns)
    if (
      improvementPercentage !== undefined &&
      improvementPercentage < minImprovement &&
      iteration > 1
    ) {
      return false;
    }

    return true;
  }

  /**
   * Build system prompt for clarity evaluation
   */
  private buildSystemPrompt(): SystemMessage {
    return new SystemMessage(`You are an expert evaluator assessing the completeness and clarity of architectural analysis agent outputs.

Your task is to evaluate agent output across three dimensions:

1. **Completeness** (0-100%): Does the output fully cover what the agent is designed to analyze?
   - Are all expected sections present?
   - Are metrics and data points provided where expected?
   - Are there any obvious gaps in coverage?

2. **Clarity** (0-100%): Are statements specific and unambiguous?
   - Avoid vague statements like "might be", "possibly", "unclear"
   - Are technical terms used correctly?
   - Are recommendations actionable and specific?

3. **Data Quality** (0-100%): Are metrics, counts, and data points accurate and complete?
   - Are numbers provided where relevant?
   - Are confidence scores included?
   - Is evidence cited for claims?

Calculate an overall score as: (Completeness * 0.5) + (Clarity * 0.3) + (Data Quality * 0.2)

Identify unclear sections that need refinement and generate specific follow-up questions.

IMPORTANT: Return your evaluation as a JSON object with this structure:
{
  "score": 85,
  "completenessScore": 90,
  "clarityScore": 80,
  "dataQualityScore": 85,
  "unclearSections": [
    {
      "section": "Security Analysis",
      "reason": "Only mentions 'potential vulnerabilities' without specifics",
      "suggestedQuestion": "Which specific packages have known vulnerabilities and what are their CVE IDs?",
      "importance": "critical"
    }
  ],
  "followUpQuestions": [
    "Can you provide specific CVE IDs for vulnerable packages?",
    "What is the severity score for each vulnerability?"
  ],
  "confidence": 0.9,
  "recommendations": [
    "Add specific vulnerability identifiers",
    "Include severity scores for each issue"
  ]
}`);
  }

  /**
   * Build human prompt with agent output and context
   */
  private buildHumanPrompt(
    agentResult: AgentResult,
    agentMetadata: AgentMetadata,
    context: AgentContext,
  ): HumanMessage {
    // Format agent dependencies as a readable string
    const dependencies =
      agentMetadata.capabilities.dependencies.length > 0
        ? agentMetadata.capabilities.dependencies.join(', ')
        : 'None';

    return new HumanMessage(`Evaluate the following agent output for completeness and clarity:

**Agent Name**: ${agentMetadata.name}
**Agent Description**: ${agentMetadata.description}
**Agent Dependencies**: ${dependencies}
**Supports Parallel Execution**: ${agentMetadata.capabilities.supportsParallel}

**Project Context**:
- Total Files: ${context.scanResult.totalFiles}
- Languages: ${Array.from(context.scanResult.languageDistribution.keys()).join(', ')}
- Project Size: ${(context.scanResult.totalSize / 1024 / 1024).toFixed(2)} MB

**Agent Output to Evaluate**:

Summary: ${agentResult.summary}

Confidence: ${(agentResult.confidence * 100).toFixed(0)}%

Markdown Content:
${agentResult.markdown?.substring(0, 3000) || 'No markdown content'}${agentResult.markdown && agentResult.markdown.length > 3000 ? '\n... (truncated)' : ''}

Data:
${JSON.stringify(agentResult.data, null, 2).substring(0, 2000)}${JSON.stringify(agentResult.data).length > 2000 ? '\n... (truncated)' : ''}

**Your Task**:
Evaluate this output and return a JSON object with:
1. Overall score (0-100)
2. Dimension scores (completeness, clarity, dataQuality)
3. Unclear sections with importance levels
4. Specific follow-up questions
5. Actionable recommendations for improvement

Focus on identifying:
- Missing expected information
- Vague or ambiguous statements
- Incomplete metrics or data
- Areas where more specificity would help`);
  }

  /**
   * Parse evaluation result from LLM output
   */
  private parseEvaluationResult(resultText: string): ClarityEvaluation {
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = resultText.trim();

      const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }

      // Try to find JSON object in text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonText);

      return {
        score: parsed.score || 70,
        unclearSections: parsed.unclearSections || [],
        followUpQuestions: parsed.followUpQuestions || [],
        confidence: parsed.confidence || 0.7,
        recommendations: parsed.recommendations || [],
      };
    } catch (_error) {
      this.logger.warn(
        `Failed to parse evaluation result: ${(_error as Error)?.message ?? _error}`,
      );
      this.logger.warn(`Raw result: ${resultText}`);

      // Return default evaluation
      return {
        score: 70,
        unclearSections: [],
        followUpQuestions: [],
        confidence: 0.5,
        recommendations: ['Unable to parse evaluation - assuming acceptable quality'],
      };
    }
  }

  /**
   * Prioritize unclear sections by importance
   */
  private prioritizeUnclearSections(sections: UnclearSection[]): UnclearSection[] {
    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return [...sections].sort(
      (a, b) => importanceOrder[a.importance] - importanceOrder[b.importance],
    );
  }
}
