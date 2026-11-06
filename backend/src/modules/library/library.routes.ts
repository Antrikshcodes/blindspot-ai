import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { sendError, sendSuccess } from '../../utils/response.js';
import {
  createResourceBody, listLibraryQuery, projectParams, resourceParams,
  saveResourceBody, updateSavedResourceBody,
} from './library.schemas.js';
import {
  createResource, listResources, requirePrototypeProject,
  saveResource, unsaveResource, updateSavedResource,
} from './library.service.js';

export const libraryRouter = Router({ mergeParams: true });
type Handler = (req: Request, res: Response) => Promise<unknown>;
const asyncRoute = (handler: Handler) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

libraryRouter.use((req, res, next) => {
  // Fail closed in production until real identity and owner authorization exist.
  // No environment flag or arbitrary header can bypass this guard.
  if (env.NODE_ENV === 'production') {
    sendError(res, 'LIBRARY_AUTH_NOT_READY',
      'Library is unavailable in production until project authorization is implemented.', 503);
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
});

libraryRouter.use((req, _res, next) => {
  void (async () => {
    const { projectId } = projectParams.parse({ projectId: req.params.projectId });
    await requirePrototypeProject(projectId);
    next();
  })().catch(next);
});

libraryRouter.get('/', asyncRoute(async (req, res) => {
  const { projectId } = projectParams.parse({ projectId: req.params.projectId });
  const query = listLibraryQuery.parse(req.query);
  sendSuccess(res, await listResources(projectId, query));
}));

libraryRouter.post('/resources', asyncRoute(async (req, res) => {
  const { projectId } = projectParams.parse({ projectId: req.params.projectId });
  const input = createResourceBody.parse(req.body);
  sendSuccess(res, await createResource(projectId, input), 'Resource added to Library', 201);
}));

libraryRouter.put('/resources/:resourceId/save', asyncRoute(async (req, res) => {
  const { projectId, resourceId } = resourceParams.parse(req.params);
  const { status } = saveResourceBody.parse(req.body ?? {});
  sendSuccess(res, await saveResource(projectId, resourceId, status), 'Resource saved');
}));

libraryRouter.patch('/resources/:resourceId/save', asyncRoute(async (req, res) => {
  const { projectId, resourceId } = resourceParams.parse(req.params);
  const { status } = updateSavedResourceBody.parse(req.body);
  sendSuccess(res, await updateSavedResource(projectId, resourceId, status), 'Saved status updated');
}));

libraryRouter.delete('/resources/:resourceId/save', asyncRoute(async (req, res) => {
  const { projectId, resourceId } = resourceParams.parse(req.params);
  sendSuccess(res, await unsaveResource(projectId, resourceId), 'Resource removed from saved collection');
}));
