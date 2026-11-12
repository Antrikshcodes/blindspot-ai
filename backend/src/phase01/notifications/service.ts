import { eq, and, desc, sql, count } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import * as t from '../db/schema.js';
import * as c from '../contracts.js';
import { ApiError } from '../config.js';
import type { z } from 'zod';

export class NotificationService {
  constructor(private db: Database) {}

  async notify(ownerId: string, params: {
    title: string;
    message: string;
    type?: z.infer<typeof c.notificationType>;
    projectId?: string | null;
    actionUrl?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    if (!ownerId) return null;
    try {
      const [created] = await this.db.insert(t.notifications).values({
        ownerId,
        title: params.title,
        message: params.message,
        type: params.type ?? 'SYSTEM',
        projectId: params.projectId ?? null,
        actionUrl: params.actionUrl ?? null,
        metadata: params.metadata ?? null,
        read: false,
      }).returning();
      return created;
    } catch {
      // Notification creation should never throw or abort primary workflows
      return null;
    }
  }

  async list(ownerId: string, query: z.infer<typeof c.notificationQuery>) {
    const filters = [
      eq(t.notifications.ownerId, ownerId),
      query.unreadOnly === 'true' ? eq(t.notifications.read, false) : undefined,
    ].filter(Boolean);

    const whereClause = and(...filters);

    const items = await this.db.select().from(t.notifications)
      .where(whereClause)
      .orderBy(desc(t.notifications.createdAt), desc(t.notifications.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    const [unreadRes] = await this.db.select({ count: count() }).from(t.notifications)
      .where(and(eq(t.notifications.ownerId, ownerId), eq(t.notifications.read, false)));

    const [totalRes] = await this.db.select({ count: count() }).from(t.notifications)
      .where(whereClause);

    return {
      items,
      unreadCount: Number(unreadRes?.count ?? 0),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(totalRes?.count ?? 0),
      },
    };
  }

  async markRead(ownerId: string, id: string) {
    const [updated] = await this.db.update(t.notifications)
      .set({ read: true })
      .where(and(eq(t.notifications.id, id), eq(t.notifications.ownerId, ownerId)))
      .returning();

    if (!updated) {
      throw new ApiError(404, 'NOT_FOUND', 'Notification not found.');
    }
    return updated;
  }

  async markAllRead(ownerId: string) {
    const res = await this.db.update(t.notifications)
      .set({ read: true })
      .where(and(eq(t.notifications.ownerId, ownerId), eq(t.notifications.read, false)))
      .returning({ id: t.notifications.id });

    return { markedCount: res.length };
  }

  async dismiss(ownerId: string, id: string) {
    const [deleted] = await this.db.delete(t.notifications)
      .where(and(eq(t.notifications.id, id), eq(t.notifications.ownerId, ownerId)))
      .returning({ id: t.notifications.id });

    if (!deleted) {
      throw new ApiError(404, 'NOT_FOUND', 'Notification not found.');
    }
    return { deleted: true, id };
  }

  async clearAll(ownerId: string) {
    await this.db.delete(t.notifications)
      .where(eq(t.notifications.ownerId, ownerId));

    return { cleared: true };
  }

  async getPreferences(ownerId: string) {
    const [row] = await this.db.select().from(t.userPreferences)
      .where(eq(t.userPreferences.ownerId, ownerId))
      .limit(1);

    if (!row) {
      return {
        ownerId,
        ...c.defaultUserPreferences,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      ownerId: row.ownerId,
      notificationPreferences: row.notificationPreferences,
      appPreferences: row.appPreferences,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async savePreferences(ownerId: string, input: z.infer<typeof c.userPreferencesInput>) {
    const [saved] = await this.db.insert(t.userPreferences).values({
      ownerId,
      notificationPreferences: input.notificationPreferences,
      appPreferences: input.appPreferences,
    }).onConflictDoUpdate({
      target: t.userPreferences.ownerId,
      set: {
        notificationPreferences: input.notificationPreferences,
        appPreferences: input.appPreferences,
        updatedAt: new Date(),
      },
    }).returning();

    return saved;
  }
}
