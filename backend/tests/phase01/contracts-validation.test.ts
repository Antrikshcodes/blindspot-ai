import { describe, it, expect } from 'vitest';
import * as c from '../../src/phase01/contracts.js';

describe('Phase 01 & 02 Contracts & Payload Validation', () => {
  describe('Project Input Schema', () => {
    it('accepts valid project creation payload', () => {
      const valid = {
        name: 'AI Code Reviewer for Solo Founders',
        productDescription: 'Automated pull request analysis and architecture review.',
        problemStatement: 'Solo founders have no senior peers to review critical security issues.',
        targetAudience: 'Early-stage bootstrapped founders and student developers.',
        proposedSolution: 'AI agent that runs automated threat modeling on PR diffs.',
        existingAlternatives: ['Manual self-review', 'Expensive security consultancies'],
      };

      const result = c.projectInput.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects short problemStatement below 20 characters', () => {
      const invalid = {
        name: 'Test Project',
        productDescription: 'Some description',
        problemStatement: 'Too short',
        targetAudience: 'Everyone',
        proposedSolution: 'Our app',
      };

      const result = c.projectInput.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects unexpected additional properties (strict mode)', () => {
      const invalid = {
        name: 'Test Project',
        productDescription: 'Valid description that meets character bounds.',
        problemStatement: 'Valid problem statement that is definitely longer than twenty characters.',
        targetAudience: 'Target audience',
        proposedSolution: 'Proposed solution',
        maliciousExtraProperty: 'Attempted property injection',
      };

      const result = c.projectInput.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Analysis Input Bounds', () => {
    it('enforces maximum character lengths on marketContext and additionalContext', () => {
      const oversized = {
        marketContext: 'a'.repeat(4001),
      };

      const result = c.analysisInput.safeParse(oversized);
      expect(result.success).toBe(false);

      const valid = {
        marketContext: 'a'.repeat(4000),
        additionalContext: 'b'.repeat(6000),
      };
      const validResult = c.analysisInput.safeParse(valid);
      expect(validResult.success).toBe(true);
    });
  });

  describe('Experiment Contracts', () => {
    it('enforces UUID assumptionId and method validation', () => {
      const validExperiment = {
        assumptionId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Smoke Test Landing Page',
        explanation: 'Testing founder willingness to join waitlist.',
        method: 'Landing Page Smoke Test',
        evidenceToCollect: 'Conversion rate on waitlist submit',
        successCriteria: '>= 15% conversion',
      };

      const result = c.experimentInput.safeParse(validExperiment);
      expect(result.success).toBe(true);

      const invalidUuid = {
        ...validExperiment,
        assumptionId: 'non-uuid-string',
      };
      expect(c.experimentInput.safeParse(invalidUuid).success).toBe(false);
    });

    it('validates experimentPatch status enum values', () => {
      expect(c.experimentPatch.safeParse({ status: 'PLANNED' }).success).toBe(true);
      expect(c.experimentPatch.safeParse({ status: 'IN_PROGRESS' }).success).toBe(true);
      expect(c.experimentPatch.safeParse({ status: 'COMPLETED', observedResult: 'Passed threshold' }).success).toBe(true);
      expect(c.experimentPatch.safeParse({ status: 'ABANDONED' }).success).toBe(true);
      expect(c.experimentPatch.safeParse({ status: 'UNKNOWN_STATUS' }).success).toBe(false);
    });
  });

  describe('Notification & Preferences Contracts', () => {
    it('accepts all 7 valid notification types', () => {
      const types = [
        'ANALYSIS_COMPLETED',
        'FEEDBACK_RECEIVED',
        'CONTRADICTION_DETECTED',
        'EXPERIMENT_UPDATE',
        'RESOURCE_RECOMMENDATION',
        'PROJECT_ACTIVITY',
        'SYSTEM',
      ];

      types.forEach((t) => {
        expect(c.notificationType.safeParse(t).success).toBe(true);
      });
      expect(c.notificationType.safeParse('FAKE_NOTIFICATION').success).toBe(false);
    });

    it('validates user preferences input schema and defaults structure', () => {
      const result = c.userPreferencesInput.safeParse(c.defaultUserPreferences);
      expect(result.success).toBe(true);
    });
  });
});
