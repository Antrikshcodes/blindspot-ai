import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from './db/client.js';
import * as t from './db/schema.js';
import * as c from './contracts.js';
import { ApiError, config, log } from './config.js';
import type { LLM } from './ai/provider.js';
import type { Provider } from './resource-intelligence/types.js';
import { ResourceSearchService } from './resource-intelligence/search.service.js';
import { ValidationService } from './validation/service.js';

const success = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
type Handler = (req: Request, res: Response) => Promise<unknown>;
const route = (handler: Handler) => (req: Request, res: Response, next: NextFunction): void => {
  void handler(req, res).catch(next);
};
const paramId = (req: Request) => c.id.parse(req.params.id);
const emptyBody = z.object({}).strict();
export function createApp(deps: {
  db: Database; llm: LLM; providers: Provider[];
  production?: boolean; apiRateLimit?: number; aiRateLimit?: number;
}) {
  const { db, llm, providers } = deps;
  const service = new ValidationService(db, llm);
  const resources = new ResourceSearchService(db, llm, providers);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: false }));
  app.use(pinoHttp({
    logger: log, genReqId: () => randomUUID(),
    serializers: {
      req: req => ({ id: req.id, method: req.method, path: req.url?.split('?')[0] }),
      res: res => ({ statusCode: res.statusCode }),
    },
  }));
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '128kb' }));
  const limiter = (limit: number, windowMs: number) => rateLimit({
    windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests; retry later.' },
    }),
  });
  app.use('/api', limiter(deps.apiRateLimit ?? config.API_RATE_LIMIT, 60000));
  const aiLimit = limiter(deps.aiRateLimit ?? config.AI_RATE_LIMIT, 60000);
  app.get('/api/health', route(async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      return success(res, { status: 'ok', database: 'connected', service: 'blindspot-phase01' });
    } catch { throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Database health check failed.'); }
  }));
  app.use('/api', (_req, _res, next) => {
    if (deps.production ?? config.NODE_ENV === 'production') {
      next(new ApiError(503, 'AUTH_NOT_READY', 'Production access is disabled until real project authorization is implemented.'));
    } else next();
  });
  app.post('/api/projects', route(async (req, res) => {
    const input = c.projectInput.parse(req.body);
    const [project] = await db.insert(t.projects).values(input).returning();
    return success(res, project, 201);
  }));
  app.get('/api/projects', route(async (req, res) => {
    const query = c.pagination.parse(req.query);
    const items = await db.select().from(t.projects).orderBy(desc(t.projects.createdAt), desc(t.projects.id))
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return success(res, { items, pagination: query });
  }));
  app.get('/api/projects/:id', route(async (req, res) => success(res, await service.project(paramId(req)))));
  app.patch('/api/projects/:id', route(async (req, res) => {
    const input = c.projectPatch.parse(req.body);
    const id = paramId(req); await service.project(id);
    const [project] = await db.update(t.projects).set({ ...input, updatedAt: new Date() })
      .where(eq(t.projects.id, id)).returning();
    return success(res, project);
  }));
  app.delete('/api/projects/:id', route(async (req, res) => {
    const id = paramId(req);
    const [deleted] = await db.delete(t.projects).where(eq(t.projects.id, id)).returning({ id: t.projects.id });
    if (!deleted) throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
    return success(res, { deleted: true, id });
  }));
  app.post('/api/projects/:id/analyze', aiLimit, route(async (req, res) =>
    success(res, await service.analyze(paramId(req), c.analysisInput.parse(req.body ?? {})), 201)));
  app.get('/api/projects/:id/analysis', route(async (req, res) => success(res, await service.latest(paramId(req)))));
  app.get('/api/analyses/:id', route(async (req, res) => success(res, await service.analysis(paramId(req)))));
  app.get('/api/analyses/:id/assumptions', route(async (req, res) => {
    const id = paramId(req); const query = c.pagination.parse(req.query);
    const analysis = await service.analysis(id);
    const items = analysis.assumptions.slice((query.page - 1) * query.limit, query.page * query.limit);
    const evidenceRecords = items.length ? await db.select().from(t.evidence)
      .where(inArray(t.evidence.assumptionId, items.map(item => item.id))) : [];
    return success(res, { items: items.map(item => ({ ...item, evidenceRecords: evidenceRecords.filter(row => row.assumptionId === item.id) })),
      pagination: { ...query, total: analysis.assumptions.length } });
  }));
  app.patch('/api/assumptions/:id', route(async (req, res) =>
    success(res, await service.updateAssumption(paramId(req), c.assumptionPatch.parse(req.body)))));
  app.post('/api/projects/:id/interviews', aiLimit, route(async (req, res) =>
    success(res, await service.createInterview(paramId(req), c.interviewInput.parse(req.body)), 201)));
  app.get('/api/projects/:id/interviews', route(async (req, res) => {
    const id = paramId(req); await service.project(id); const query = c.pagination.parse(req.query);
    const items = await db.select().from(t.interviews).where(eq(t.interviews.projectId, id))
      .orderBy(desc(t.interviews.createdAt), desc(t.interviews.id)).limit(query.limit).offset((query.page - 1) * query.limit);
    return success(res, { items, pagination: query });
  }));
  app.post('/api/interviews/:id/feedback', route(async (req, res) =>
    success(res, await service.addFeedback(paramId(req), c.feedbackInput.parse(req.body)), 201)));
  app.post('/api/projects/:id/feedback/analyze', aiLimit, route(async (req, res) => {
    emptyBody.parse(req.body ?? {});
    return success(res, await service.analyzeFeedback(paramId(req)), 201);
  }));
  app.get('/api/projects/:id/feedback/summary', route(async (req, res) => {
    const id = paramId(req); await service.project(id);
    const [summary] = await db.select().from(t.feedbackAnalyses).where(eq(t.feedbackAnalyses.projectId, id))
      .orderBy(desc(t.feedbackAnalyses.createdAt), desc(t.feedbackAnalyses.id)).limit(1);
    return success(res, summary ?? null);
  }));
  app.post('/api/projects/:id/experiments', aiLimit, route(async (req, res) => {
    const input = z.union([c.experimentInput, z.object({ assumptionId: c.id }).strict()]).parse(req.body);
    return success(res, await service.createExperiment(paramId(req), input), 201);
  }));
  app.get('/api/projects/:id/experiments', route(async (req, res) => {
    const id = paramId(req); await service.project(id); const query = c.pagination.parse(req.query);
    const items = await db.select().from(t.experiments).where(eq(t.experiments.projectId, id))
      .orderBy(desc(t.experiments.createdAt), desc(t.experiments.id)).limit(query.limit).offset((query.page - 1) * query.limit);
    return success(res, { items, pagination: query });
  }));
  app.patch('/api/experiments/:id', route(async (req, res) =>
    success(res, await service.updateExperiment(paramId(req), c.experimentPatch.parse(req.body)))));
  app.post('/api/projects/:id/resources/search', aiLimit, route(async (req, res) =>
    success(res, await resources.search(await service.project(paramId(req)), c.searchInput.parse(req.body ?? {})), 201)));
  app.get('/api/projects/:id/resources', route(async (req, res) => {
    const id = paramId(req); await service.project(id); const query = c.resourceQuery.parse(req.query);
    return success(res, { items: await resources.list(id, query), pagination: { page: query.page, limit: query.limit } });
  }));
  app.get('/api/resources/:id', route(async (req, res) => {
    const id = paramId(req);
    const [resource] = await db.select().from(t.resources).where(eq(t.resources.id, id));
    if (!resource) throw new ApiError(404, 'NOT_FOUND', 'Resource not found.');
    return success(res, resource);
  }));
  app.post('/api/resources/:id/save', route(async (req, res) => {
    const resourceId = paramId(req);
    const input = z.object({ projectId: c.id,
      status: z.enum(['CONSIDERING', 'TRYING', 'INTEGRATED']).optional() }).strict().parse(req.body);
    await service.project(input.projectId);
    const [recommendation] = await db.select({ id: t.recommendations.id }).from(t.recommendations)
      .innerJoin(t.searches, eq(t.recommendations.searchId, t.searches.id))
      .where(and(eq(t.recommendations.resourceId, resourceId), eq(t.searches.projectId, input.projectId))).limit(1);
    if (!recommendation) throw new ApiError(404, 'NOT_FOUND', 'Resource was not retrieved for this project.');
    const [saved] = await db.insert(t.saves).values({ resourceId, projectId: input.projectId, status: input.status })
      .onConflictDoUpdate({ target: [t.saves.projectId, t.saves.resourceId],
        set: { ...(input.status ? { status: input.status } : {}), updatedAt: new Date() } }).returning();
    return success(res, saved);
  }));
  app.delete('/api/projects/:id/resources/:resourceId/save', route(async (req, res) => {
    const projectId = paramId(req); const resourceId = c.id.parse(req.params.resourceId);
    await service.project(projectId);
    await db.delete(t.saves).where(and(eq(t.saves.projectId, projectId), eq(t.saves.resourceId, resourceId)));
    return success(res, { removedFromSaved: true });
  }));
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Endpoint not found.')));
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    let status = 500; let code = 'INTERNAL_ERROR'; let message = 'An unexpected error occurred.';
    if (error instanceof ApiError) ({ status, code, message } = error);
    else if (error instanceof z.ZodError) { status = 400; code = 'VALIDATION_ERROR'; message = 'Invalid request fields.'; }
    else if ((error as { type?: string })?.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Request body must be valid JSON.'; }
    else if ((error as { type?: string })?.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body exceeds 128 KB.'; }
    log.warn({ requestId: req.id, status, code }, 'Request failed');
    res.status(status).json({ success: false, error: { code, message }, requestId: req.id });
  });
  return app;
}
