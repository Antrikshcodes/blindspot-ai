import { randomUUID } from 'node:crypto';
import { ApiError } from '../config.js';
import { blindspotsSchema, type ScoredAssumption } from './contracts.js';
import { requireGrounded } from './grounding.js';
import type { z } from 'zod';

export class BlindspotService {
  validate(output: unknown, assumptions: ScoredAssumption[], originalFields: string[]) {
    const parsed = blindspotsSchema.parse(output);
    const allowed = new Set(assumptions.map(row => row.id));
    return parsed.blindspots.map(finding => {
      if (!allowed.has(finding.relatedAssumptionId)) {
        throw new ApiError(502, 'AI_REFERENCE_INVALID', 'A blindspot referenced an unknown assumption.');
      }
      requireGrounded(finding, originalFields);
      return { ...finding, id: randomUUID() };
    });
  }
}
