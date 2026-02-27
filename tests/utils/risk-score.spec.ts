/**
 * Unit tests for risk-score util: severityToRiskScore, aggregateRiskScoreFromFindings.
 */
import { severityToRiskScore, aggregateRiskScoreFromFindings } from '../../src/utils/risk-score';

describe('risk-score', () => {
  describe('severityToRiskScore', () => {
    it('maps severity to 0–4', () => {
      expect(severityToRiskScore('critical')).toBe(4);
      expect(severityToRiskScore('high')).toBe(3);
      expect(severityToRiskScore('medium')).toBe(2);
      expect(severityToRiskScore('low')).toBe(1);
      expect(severityToRiskScore('info')).toBe(0);
    });

    it('returns 0 for unknown severity', () => {
      expect(severityToRiskScore('unknown')).toBe(0);
      expect(severityToRiskScore('')).toBe(0);
    });
  });

  describe('aggregateRiskScoreFromFindings', () => {
    it('returns 0 when no findings', () => {
      expect(aggregateRiskScoreFromFindings({})).toBe(0);
    });

    it('returns 100 when all critical', () => {
      expect(aggregateRiskScoreFromFindings({ critical: 2 })).toBe(100);
    });

    it('returns 0 when all info', () => {
      expect(aggregateRiskScoreFromFindings({ info: 5 })).toBe(0);
    });

    it('returns weighted average normalized to 0–100', () => {
      const score = aggregateRiskScoreFromFindings({
        critical: 1,
        high: 1,
        medium: 1,
        low: 1,
        info: 1,
      });
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
