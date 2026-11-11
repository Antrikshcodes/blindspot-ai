import type { Assumption, Experiment, ExperimentUpdateStatus } from '@workspace/api-client-react';

// Synthetic, test-only contract fixtures. Never imported by production UI.
export const fixtureId = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const projectId = fixtureId(1);
export const analysisId = fixtureId(2);
export const assumptionId = fixtureId(3);
export const otherAssumptionId = fixtureId(4);
export const manualProtocol = {
  name: 'TEST ONLY manual outreach test',
  explanation: 'Test whether people attempt the existing workaround.',
  method: 'Ask five people to show the last report they prepared.',
  evidenceToCollect: 'Anonymized notes of actual past behavior.',
  successCriteria: 'At least three people demonstrate the same workaround.',
};
export const originalObservation = 'Two participants demonstrated a workaround.\nThree did not.';
const createdAt = '2026-11-01T12:00:00.000Z';
export type RequestRecord = { method: string; path: string; body?: Record<string, unknown>; page: number; limit: number };

export function experiment(n: number, status: ExperimentUpdateStatus, extra: Partial<Experiment> = {}): Experiment {
  return {
    id: fixtureId(n), projectId, assumptionId, ...manualProtocol, name: `TEST ONLY experiment ${n}`,
    status, observedResult: null, createdAt, updatedAt: createdAt, ...extra,
  };
}

function assumption(n: number, description: string): Assumption {
  return {
    id: fixtureId(n), analysisId, description, category: 'PROBLEM', explanation: 'A testable assumption.',
    validationMethod: 'Observe past behavior.', evidenceRequired: 'Original interview notes.',
    impact: 4, uncertainty: 4, riskScore: 16, riskLevel: 'HIGH', status: 'TESTING', createdAt, updatedAt: createdAt,
    evidenceRecords: n === 3 ? [{
      id: fixtureId(80), feedbackId: fixtureId(81), assumptionId: fixtureId(n), quote: 'I prepared the report last week.',
      sentiment: 'NEUTRAL', origin: 'HUMAN_MAPPING', reasoning: 'Manual association only.', createdAt,
    }] : [],
  };
}

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(status < 400 ? { success: true, data } : data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
const error = (status: number, code: string, message: string) => response({ success: false, error: { code, message } }, status);

export class ExperimentFixture {
  rows = [
    experiment(10, 'PLANNED'),
    experiment(11, 'IN_PROGRESS', { observedResult: originalObservation, createdAt: '2026-11-02T12:00:00.000Z' }),
    experiment(12, 'COMPLETED', { assumptionId: otherAssumptionId, observedResult: 'Three of five showed the workaround.' }),
    experiment(13, 'ABANDONED', { observedResult: 'Recruitment was stopped.' }),
  ];
  assumptions = [assumption(3, 'Teams need a faster reporting workflow'), assumption(4, 'Teams will switch tools')];
  calls: RequestRecord[] = [];
  accessStatus: 401 | 404 | 503 | null = null;
  failList = false;
  failLatest = false;
  failCreate = false;
  failAI = false;
  failPatch = false;
  createGate: Promise<void> | null = null;
  private nextId = 50;

  fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'https://fixture.invalid');
    const path = url.pathname;
    const method = init?.method ?? 'GET';
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
    this.calls.push({ path, method, page, limit, body });
    if (this.accessStatus) return error(this.accessStatus,
      this.accessStatus === 404 ? 'NOT_FOUND' : this.accessStatus === 401 ? 'UNAUTHENTICATED' : 'AUTH_NOT_READY',
      this.accessStatus === 404 ? 'Project not found.' : 'Authenticated access is not configured.');
    if (path === `/api/projects/${projectId}`) return response({ id: projectId, name: 'TEST ONLY experiment project', createdAt });
    if (path === `/api/projects/${projectId}/analysis` && this.failLatest) return error(503, 'UNAVAILABLE', 'Latest analysis is unavailable.');
    if (path === `/api/projects/${projectId}/analysis`) return response({
      id: analysisId, projectId, version: 2, createdAt,
      assumptions: this.assumptions.map(({ evidenceRecords: _records, ...row }) => row),
    });
    if (path === `/api/analyses/${analysisId}/assumptions`) return response({
      items: this.assumptions.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: this.assumptions.length },
    });
    if (path === `/api/projects/${projectId}/experiments` && method === 'GET') {
      if (this.failList) return error(503, 'UNAVAILABLE', 'Could not load experiments.');
      return response({ items: this.rows.slice((page - 1) * limit, page * limit), pagination: { page, limit } });
    }
    if (path === `/api/projects/${projectId}/experiments` && method === 'POST') {
      if (this.createGate) await this.createGate;
      if (this.failCreate) return error(400, 'VALIDATION_ERROR', 'Review the experiment protocol.');
      const keys = Object.keys(body ?? {});
      const ai = keys.length === 1 && keys[0] === 'assumptionId';
      if (this.failAI && ai) return error(503, 'AI_UNAVAILABLE', 'Experiment generation is currently unavailable.');
      if (!this.assumptions.some((row) => row.id === body?.assumptionId)) return error(400, 'INVALID_ASSUMPTION', 'Select an assumption in this project.');
      if (!ai) {
        const fields = Object.keys(manualProtocol);
        const valid = fields.every((key) => typeof body?.[key] === 'string' && (body[key] as string).trim().length > 0 && (body[key] as string).trim().length <= (key === 'name' ? 200 : 2000));
        if (keys.length !== 6 || !valid) return error(400, 'VALIDATION_ERROR', 'All five manual protocol fields are required.');
      }
      const protocol = ai ? { ...manualProtocol, name: 'TEST ONLY generated protocol' } : Object.fromEntries(Object.keys(manualProtocol).map((key) => [key, (body![key] as string).trim()]));
      const saved = experiment(this.nextId++, 'PLANNED', {
        ...protocol, assumptionId: body!.assumptionId as string, createdAt: '2026-11-11T12:00:00.000Z',
      });
      this.rows.unshift(saved);
      return response(saved, 201);
    }
    if (path.startsWith('/api/experiments/') && method === 'PATCH') {
      if (this.failPatch) return error(400, 'RESULT_REQUIRED', 'Record an observed result before completing an experiment.');
      const current = this.rows.find((row) => row.id === path.split('/').at(-1));
      if (!current) return error(404, 'NOT_FOUND', 'Experiment not found.');
      const status = body?.status as ExperimentUpdateStatus;
      const allowed: Record<string, string[]> = {
        PLANNED: ['IN_PROGRESS', 'ABANDONED'], IN_PROGRESS: ['COMPLETED', 'ABANDONED'], COMPLETED: [], ABANDONED: [],
      };
      if (!allowed[status] || (status !== current.status && !allowed[current.status].includes(status))) return error(409, 'INVALID_STATUS_TRANSITION', 'Experiment status transition is not allowed.');
      if (Object.keys(body!).some((key) => !['status', 'observedResult'].includes(key))) return error(400, 'VALIDATION_ERROR', 'Unsupported update field.');
      const supplied = body?.observedResult;
      if (supplied !== undefined && (typeof supplied !== 'string' || !supplied.trim() || supplied.trim().length > 4000)) return error(400, 'VALIDATION_ERROR', 'Observed result must contain 1 to 4000 characters.');
      if (status === 'COMPLETED' && !supplied && !current.observedResult) return error(400, 'RESULT_REQUIRED', 'Record an observed result before completing an experiment.');
      const saved: Experiment = {
        ...current, status, ...(typeof supplied === 'string' ? { observedResult: supplied.trim() } : {}),
        updatedAt: '2026-11-11T12:00:00.000Z',
      };
      this.rows = this.rows.map((row) => row.id === current.id ? saved : row);
      return response(saved);
    }
    throw new Error(`Unexpected experiment fixture request: ${method} ${path}`);
  };
}
