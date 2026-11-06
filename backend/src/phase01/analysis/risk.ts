import { z } from 'zod';

const score = z.number().int().min(1).max(5);
export function classifyRisk(priorityScore: number) {
  z.number().int().min(1).max(25).parse(priorityScore);
  return priorityScore >= 20 ? 'CRITICAL'
    : priorityScore >= 13 ? 'HIGH' : priorityScore >= 7 ? 'MEDIUM' : 'LOW';
}
export function calculateRisk(impact: number, uncertainty: number) {
  const priorityScore = score.parse(impact) * score.parse(uncertainty);
  const riskLevel = classifyRisk(priorityScore);
  return { priorityScore, riskScore: priorityScore, riskLevel } as const;
}
