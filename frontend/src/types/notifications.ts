export type NotificationType =
  | 'ANALYSIS_COMPLETED'
  | 'FEEDBACK_RECEIVED'
  | 'CONTRADICTION_DETECTED'
  | 'EXPERIMENT_UPDATE'
  | 'RESOURCE_RECOMMENDATION'
  | 'PROJECT_ACTIVITY'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  ownerId: string;
  projectId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export function formatNotificationTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}
