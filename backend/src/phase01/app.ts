import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { Database } from './db/client.js';
import * as t from './db/schema.js';
import * as c from './contracts.js';
import { ApiError, config, log } from './config.js';
import type { LLM } from './ai/provider.js';
import type { Provider } from './resource-intelligence/types.js';
import { ResourceSearchService } from './resource-intelligence/search.service.js';
import { resourceDTO } from './resource-intelligence/dto.js';
import { ValidationService } from './validation/service.js';
import { IdeaAnalysisService } from './analysis/service.js';
import { NotificationService } from './notifications/service.js';
import { authentication, ownerId, type AuthConfiguration } from './auth.js';
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from './middlewares/clerkProxyMiddleware.js';

const success = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
type Handler = (req: Request, res: Response, service: ValidationService, analysisService: IdeaAnalysisService) => Promise<unknown>;
const paramId = (req: Request) => c.id.parse(req.params.id);
const emptyBody = z.object({}).strict();
export function createApp(deps: {
  db: Database; llm: LLM; providers: Provider[];
  apiRateLimit?: number; aiRateLimit?: number;
  adminUserIds?: string[];
  auth?: AuthConfiguration;
}) {
  const { db, llm, providers } = deps;
  const adminUserIds = new Set(deps.adminUserIds ?? config.ADMIN_USER_IDS.split(',').map(id => id.trim()).filter(Boolean));
  // Identity is request-local and comes only from verified Clerk middleware.
  const route = (handler: Handler) => (req: Request, res: Response, next: NextFunction): void => {
    const owner = res.locals.ownerId ?? '';
    void handler(req, res, new ValidationService(db, llm, owner), new IdeaAnalysisService(db, llm, owner)).catch(next);
  };
  const resources = new ResourceSearchService(db, llm, providers);
  const notifications = new NotificationService(db);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  const allowedOrigins = config.CORS_ORIGIN === '*'
    ? true
    : config.CORS_ORIGIN.split(',').map(s => s.trim());
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));
  app.use(pinoHttp({
    logger: log, genReqId: () => randomUUID(),
    serializers: {
      req: req => ({ id: req.id, method: req.method, path: req.url?.split('?')[0] }),
      res: res => ({ statusCode: res.statusCode }),
    },
  }));
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
  app.use(express.json({ limit: '128kb' }));
  const limiter = (limit: number, windowMs: number) => rateLimit({
    windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests; retry later.' },
    }),
  });
  app.use('/api', limiter(deps.apiRateLimit ?? config.API_RATE_LIMIT, 60000));
  const aiLimit = limiter(deps.aiRateLimit ?? config.AI_RATE_LIMIT, 60000);
  const healthHandler = route(async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      return success(res, { status: 'ok', database: 'connected', service: 'blindspot-phase01' });
    } catch { throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Database health check failed.'); }
  });
  app.get(['/health', '/healthz', '/ready', '/readyz', '/api/health', '/api/healthz'], healthHandler);
  app.use('/api', authentication(deps.auth));
  app.post('/api/projects', route(async (req, res) => {
    const input = c.projectInput.parse(req.body);
    const [project] = await db.insert(t.projects).values({ ...input, ownerId: ownerId(res) }).returning();
    await notifications.notify(ownerId(res), {
      type: 'PROJECT_ACTIVITY',
      title: 'Project Initialized',
      message: `Project "${project.name}" was successfully created.`,
      projectId: project.id,
      actionUrl: `/projects/${project.id}`,
    });
    return success(res, project, 201);
  }));
  app.get('/api/projects', route(async (req, res) => {
    const query = c.projectQuery.parse(req.query);
    const filters = [
      eq(t.projects.ownerId, ownerId(res)),
      query.status === 'ALL' ? undefined : eq(t.projects.status, query.status),
      query.industry ? ilike(t.projects.industry, query.industry) : undefined,
      query.category ? ilike(t.projects.category, query.category) : undefined,
      query.search ? or(ilike(t.projects.name, `%${query.search}%`),
        ilike(t.projects.productDescription, `%${query.search}%`),
        ilike(t.projects.problemStatement, `%${query.search}%`)) : undefined,
    ].filter(Boolean);
    const sortColumn = query.sort === 'name' ? t.projects.name
      : query.sort === 'updatedAt' ? t.projects.updatedAt : t.projects.createdAt;
    const sort = query.order === 'asc' ? asc : desc;
    const items = await db.select().from(t.projects).where(and(...filters))
      .orderBy(sort(sortColumn), sort(t.projects.id))
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return success(res, { items, pagination: { page: query.page, limit: query.limit },
      filters: { status: query.status, industry: query.industry ?? null, category: query.category ?? null,
        search: query.search ?? null, sort: query.sort, order: query.order } });
  }));
  app.get('/api/projects/:id', route(async (req, res, service) => success(res, await service.project(paramId(req)))));
  app.patch('/api/projects/:id', route(async (req, res, service) => {
    const input = c.projectPatch.parse(req.body);
    const id = paramId(req); await service.project(id);
    const [project] = await db.update(t.projects).set({ ...input, updatedAt: new Date() })
      .where(and(eq(t.projects.id, id), eq(t.projects.ownerId, ownerId(res)))).returning();
    return success(res, project);
  }));
  app.delete('/api/projects/:id', route(async (req, res) => {
    const id = paramId(req);
    const [deleted] = await db.delete(t.projects)
      .where(and(eq(t.projects.id, id), eq(t.projects.ownerId, ownerId(res)))).returning({ id: t.projects.id });
    if (!deleted) throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
    return success(res, { deleted: true, id });
  }));
  const changeProjectStatus = (status: 'ACTIVE' | 'ARCHIVED') => route(async (req, res) => {
    emptyBody.parse(req.body ?? {});
    const id = paramId(req);
    const [project] = await db.update(t.projects).set({ status, updatedAt: new Date() })
      .where(and(eq(t.projects.id, id), eq(t.projects.ownerId, ownerId(res)))).returning();
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
    return success(res, project);
  });
  app.post('/api/projects/:id/archive', changeProjectStatus('ARCHIVED'));
  app.post('/api/projects/:id/restore', changeProjectStatus('ACTIVE'));
  app.post('/api/projects/:id/analyze', aiLimit, route(async (req, res, service) => {
    const id = paramId(req);
    const project = await service.project(id);
    const analysis = await service.analyze(id, c.analysisInput.parse(req.body ?? {}));
    await notifications.notify(ownerId(res), {
      type: 'ANALYSIS_COMPLETED',
      title: 'AI Analysis Completed',
      message: `Phase 02 validation analysis completed for "${project.name}" (version ${analysis.version}).`,
      projectId: project.id,
      actionUrl: `/projects/${project.id}/analysis`,
    });
    return success(res, analysis, 201);
  }));
  app.get('/api/projects/:id/analysis', route(async (req, res, service) => success(res, await service.latest(paramId(req)))));
  app.get('/api/projects/:id/analyses', route(async (req, res, service) => {
    const id = paramId(req);
    await service.project(id);
    const query = c.pagination.parse(req.query);
    const items = await db.select({
      id: t.analyses.id, projectId: t.analyses.projectId, version: t.analyses.version,
      createdAt: t.analyses.createdAt, model: t.analyses.model,
    }).from(t.analyses).where(eq(t.analyses.projectId, id))
      .orderBy(desc(t.analyses.version), desc(t.analyses.id))
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return success(res, { items, pagination: query });
  }));
  app.get('/api/analyses/:id', route(async (req, res, service) => success(res, await service.analysis(paramId(req)))));
  app.get('/api/analyses/:id/blindspots', route(async (req, res, _service, analysisService) =>
    success(res, await analysisService.artifact(paramId(req), 'blindspots'))));
  app.get('/api/analyses/:id/interview-questions', route(async (req, res, _service, analysisService) =>
    success(res, await analysisService.artifact(paramId(req), 'interviewQuestions'))));
  app.get('/api/analyses/:id/summary', route(async (req, res, _service, analysisService) =>
    success(res, await analysisService.artifact(paramId(req), 'summary'))));
  app.get('/api/analyses/:id/assumptions', route(async (req, res, service) => {
    const id = paramId(req); const query = c.pagination.parse(req.query);
    const analysis = await service.analysis(id);
    const items = analysis.assumptions.slice((query.page - 1) * query.limit, query.page * query.limit);
    const evidenceRecords = items.length ? await db.select().from(t.evidence)
      .where(inArray(t.evidence.assumptionId, items.map(item => item.id))) : [];
    return success(res, { items: items.map(item => ({ ...item, evidenceRecords: evidenceRecords.filter(row => row.assumptionId === item.id) })),
      pagination: { ...query, total: analysis.assumptions.length } });
  }));
  app.patch('/api/assumptions/:id', route(async (req, res, service) =>
    success(res, await service.updateAssumption(paramId(req), c.assumptionPatch.parse(req.body)))));
  app.post('/api/projects/:id/interviews', aiLimit, route(async (req, res, service) =>
    success(res, await service.createInterview(paramId(req), c.interviewInput.parse(req.body)), 201)));
  app.get('/api/projects/:id/interviews', route(async (req, res, service) => {
    const id = paramId(req); await service.project(id); const query = c.pagination.parse(req.query);
    const items = await db.select().from(t.interviews).where(eq(t.interviews.projectId, id))
      .orderBy(desc(t.interviews.createdAt), desc(t.interviews.id)).limit(query.limit).offset((query.page - 1) * query.limit);
    return success(res, { items, pagination: query });
  }));
  app.post('/api/interviews/:id/feedback', route(async (req, res, service) =>
    success(res, await service.addFeedback(paramId(req), c.feedbackInput.parse(req.body)), 201)));
  app.get('/api/interviews/:id/feedback', route(async (req, res, service) => {
    const id = paramId(req); const query = c.pagination.parse(req.query);
    const [interview] = await db.select().from(t.interviews).where(eq(t.interviews.id, id));
    if (!interview) throw new ApiError(404, 'NOT_FOUND', 'Interview not found.');
    await service.project(interview.projectId);
    const items = await db.select().from(t.feedback).where(eq(t.feedback.interviewId, id))
      .orderBy(desc(t.feedback.createdAt), desc(t.feedback.id))
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return success(res, { items, pagination: query });
  }));
  app.post('/api/projects/:id/feedback/analyze', aiLimit, route(async (req, res, service) => {
    emptyBody.parse(req.body ?? {});
    return success(res, await service.analyzeFeedback(paramId(req)), 201);
  }));
  app.get('/api/projects/:id/feedback/summary', route(async (req, res, service) => {
    const id = paramId(req); await service.project(id);
    const [summary] = await db.select().from(t.feedbackAnalyses).where(eq(t.feedbackAnalyses.projectId, id))
      .orderBy(desc(t.feedbackAnalyses.createdAt), desc(t.feedbackAnalyses.id)).limit(1);
    return success(res, summary ?? null);
  }));
  app.post('/api/projects/:id/experiments', aiLimit, route(async (req, res, service) => {
    const input = z.union([c.experimentInput, z.object({ assumptionId: c.id }).strict()]).parse(req.body);
    return success(res, await service.createExperiment(paramId(req), input), 201);
  }));
  app.get('/api/projects/:id/experiments', route(async (req, res, service) => {
    const id = paramId(req); await service.project(id); const query = c.pagination.parse(req.query);
    const items = await db.select().from(t.experiments).where(eq(t.experiments.projectId, id))
      .orderBy(desc(t.experiments.createdAt), desc(t.experiments.id)).limit(query.limit).offset((query.page - 1) * query.limit);
    return success(res, { items, pagination: query });
  }));
  app.patch('/api/experiments/:id', route(async (req, res, service) =>
    success(res, await service.updateExperiment(paramId(req), c.experimentPatch.parse(req.body)))));
  app.post('/api/projects/:id/resources/search', aiLimit, route(async (req, res, service) => {
    const id = paramId(req);
    const project = await service.project(id);
    const searchRes = await resources.search(project, c.searchInput.parse(req.body ?? {}));
    if (searchRes.items.length > 0) {
      await notifications.notify(ownerId(res), {
        type: 'RESOURCE_RECOMMENDATION',
        title: 'Resources Discovered',
        message: `Found ${searchRes.items.length} technical assets and models matching "${project.name}".`,
        projectId: project.id,
        actionUrl: `/projects/${project.id}/resources`,
      });
    }
    return success(res, searchRes, 201);
  }));
  app.get('/api/projects/:id/resources', route(async (req, res, service) => {
    const id = paramId(req); await service.project(id); const query = c.resourceQuery.parse(req.query);
    return success(res, { items: await resources.list(id, query), pagination: { page: query.page, limit: query.limit } });
  }));
  app.get('/api/projects/:id/resources/searches', route(async (req, res, service) => {
    const id = paramId(req); await service.project(id); const query = c.pagination.parse(req.query);
    return success(res, { items: await resources.history(id, query), pagination: query });
  }));
  app.get('/api/projects/:id/resources/saved', route(async (req, res, service) => {
    const id = paramId(req); await service.project(id); const query = c.resourceQuery.parse(req.query);
    return success(res, { items: await resources.list(id, { ...query, saved: 'true' }),
      pagination: { page: query.page, limit: query.limit } });
  }));
  app.get('/api/resources/:id', route(async (req, res) => {
    const id = paramId(req);
    // Global public-source metadata is readable only if retrieved for an owned
    // project. Private recommendations, queries and explanations stay project-scoped.
    const [retrieved] = await db.select({ id: t.recommendations.id }).from(t.recommendations)
      .innerJoin(t.searches, eq(t.recommendations.searchId, t.searches.id))
      .innerJoin(t.projects, eq(t.searches.projectId, t.projects.id))
      .where(and(eq(t.recommendations.resourceId, id), eq(t.projects.ownerId, ownerId(res)))).limit(1);
    if (!retrieved) throw new ApiError(404, 'NOT_FOUND', 'Resource not found.');
    const [resource] = await db.select().from(t.resources).where(eq(t.resources.id, id));
    if (!resource) throw new ApiError(404, 'NOT_FOUND', 'Resource not found.');
    return success(res, resourceDTO(resource));
  }));
  app.post('/api/resources/:id/save', route(async (req, res, service) => {
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
  app.delete('/api/projects/:id/resources/:resourceId/save', route(async (req, res, service) => {
    const projectId = paramId(req); const resourceId = c.id.parse(req.params.resourceId);
    await service.project(projectId);
    await db.delete(t.saves).where(and(eq(t.saves.projectId, projectId), eq(t.saves.resourceId, resourceId)));
    return success(res, { removedFromSaved: true });
  }));
  app.delete('/api/resources/:id/save', route(async (req, res, service) => {
    const resourceId = paramId(req);
    const { projectId } = z.object({ projectId: c.id }).strict().parse(req.body);
    await service.project(projectId);
    await db.delete(t.saves).where(and(eq(t.saves.projectId, projectId), eq(t.saves.resourceId, resourceId)));
    return success(res, { removedFromSaved: true });
  }));
  app.get('/api/notifications', route(async (req, res) => {
    const query = c.notificationQuery.parse(req.query);
    return success(res, await notifications.list(ownerId(res), query));
  }));
  app.patch('/api/notifications/:id/read', route(async (req, res) => {
    return success(res, await notifications.markRead(ownerId(res), paramId(req)));
  }));
  app.post('/api/notifications/mark-all-read', route(async (_req, res) => {
    return success(res, await notifications.markAllRead(ownerId(res)));
  }));
  app.delete('/api/notifications/:id', route(async (req, res) => {
    return success(res, await notifications.dismiss(ownerId(res), paramId(req)));
  }));
  app.delete('/api/notifications', route(async (_req, res) => {
    return success(res, await notifications.clearAll(ownerId(res)));
  }));
  app.get('/api/user/preferences', route(async (_req, res) => {
    return success(res, await notifications.getPreferences(ownerId(res)));
  }));
  app.put('/api/user/preferences', route(async (req, res) => {
    const input = c.userPreferencesInput.parse(req.body);
    return success(res, await notifications.savePreferences(ownerId(res), input));
  }));
  app.get('/api/user/profile', route(async (_req, res) => {
    const user = ownerId(res);
    const [profile] = await db.insert(t.userProfiles).values({ ownerId: user })
      .onConflictDoNothing({ target: t.userProfiles.ownerId }).returning();
    const current = profile ?? (await db.select().from(t.userProfiles)
      .where(eq(t.userProfiles.ownerId, user)).limit(1))[0];
    if (!current) throw new ApiError(500, 'PROFILE_UNAVAILABLE', 'User profile could not be loaded.');
    return success(res, { ...current, role: adminUserIds.has(user) ? 'ADMIN' : 'USER' });
  }));
  app.patch('/api/user/profile', route(async (req, res) => {
    const user = ownerId(res);
    const input = c.userProfilePatch.parse(req.body);
    const [profile] = await db.insert(t.userProfiles).values({ ownerId: user, displayName: input.displayName })
      .onConflictDoUpdate({ target: t.userProfiles.ownerId,
        set: { displayName: input.displayName, updatedAt: new Date() } }).returning();
    return success(res, { ...profile, role: adminUserIds.has(user) ? 'ADMIN' : 'USER' });
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
