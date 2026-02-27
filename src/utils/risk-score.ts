/**
 * Optional risk scoring for pentest findings.
 *
 * **Standard**: Prioritization is by **severity** (critical → high → medium → low → info).
 * The schema's optional `riskScore` on PentestAnalysisOutput is not computed by default;
 * it is reserved for future use or for consumers who want a single numeric score.
 *
 * If you need a numeric score (e.g. for dashboards or sorting), use `severityToRiskScore()`
 * to map severity to a 0–4 scale. We do not over-engineer likelihood×impact here.
 */

import type { Severity } from '../schemas/pentest-analysis.schema';

/** Severity → numeric score (0–4). Higher = more severe. */
const SEVERITY_SCORE: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/**
 * Map a severity label to a numeric risk score (0–4).
 * Use for ordering or simple dashboards; severity remains the standard.
 */
export function severityToRiskScore(severity: Severity | string): number {
  const s = (severity ?? 'info').toString().toLowerCase().trim() as Severity;
  return SEVERITY_SCORE[s] ?? 0;
}

/**
 * Compute a simple aggregate risk score (0–100) from findings by severity counts.
 * Formula: weighted sum of (count × severity score) / total, normalized to 0–100.
 * Not used by default; export for consumers who want it.
 */
export function aggregateRiskScoreFromFindings(counts: {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  info?: number;
}): number {
  let sum = 0;
  let total = 0;
  for (const [sev, count] of Object.entries(counts)) {
    const n = Number(count) || 0;
    total += n;
    sum += n * (SEVERITY_SCORE[sev as Severity] ?? 0);
  }
  if (total === 0) return 0;
  const avg = sum / total;
  return Math.round((avg / 4) * 100);
}
