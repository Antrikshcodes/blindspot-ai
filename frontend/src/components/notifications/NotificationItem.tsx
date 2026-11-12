import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Boxes,
  Compass,
  AlertTriangle,
  FlaskConical,
  FolderGit2,
  Info,
  X,
  Check,
} from 'lucide-react';
import type { AppNotification, NotificationType } from '../../types/notifications';
import { formatNotificationTime } from '../../types/notifications';

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onCloseCenter?: () => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'ANALYSIS_COMPLETED':
      return { icon: Sparkles, color: 'text-purple bg-purple/10 border-purple/20' };
    case 'RESOURCE_RECOMMENDATION':
      return { icon: Boxes, color: 'text-forest bg-forest/10 border-forest/20' };
    case 'FEEDBACK_RECEIVED':
      return { icon: Compass, color: 'text-amber-700 bg-amber-500/15 border-amber-500/30' };
    case 'CONTRADICTION_DETECTED':
      return { icon: AlertTriangle, color: 'text-rose-700 bg-rose-500/15 border-rose-500/30' };
    case 'EXPERIMENT_UPDATE':
      return { icon: FlaskConical, color: 'text-purple bg-purple/10 border-purple/20' };
    case 'PROJECT_ACTIVITY':
      return { icon: FolderGit2, color: 'text-forest bg-forest/10 border-forest/20' };
    case 'SYSTEM':
    default:
      return { icon: Info, color: 'text-forest/70 bg-sand border-forest/15' };
  }
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onDismiss,
  onCloseCenter,
}) => {
  const navigate = useNavigate();
  const { icon: Icon, color } = getNotificationIcon(notification.type);

  const handleClick = async () => {
    if (!notification.read) {
      await onMarkRead(notification.id);
    }
    if (notification.actionUrl) {
      onCloseCenter?.();
      navigate(notification.actionUrl);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative group p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
        notification.read
          ? 'bg-white/60 border-forest/10 hover:bg-white/90 hover:border-forest/20'
          : 'bg-sand/80 border-purple/30 shadow-sm hover:border-purple/50 ring-1 ring-purple/15'
      }`}
    >
      {/* Category Icon */}
      <div className={`p-2 rounded-xl border shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2 mb-1">
          <h5 className={`text-xs font-bold truncate ${notification.read ? 'text-forest/80' : 'text-forest font-extrabold'}`}>
            {notification.title}
          </h5>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-purple shrink-0 shadow-sm" title="Unread notification" />
          )}
        </div>

        <p className="text-xs text-forest/75 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>

        <span className="block mt-2 text-[10px] font-mono text-forest/50">
          {formatNotificationTime(notification.createdAt)}
        </span>
      </div>

      {/* Quick Actions (Mark read, Dismiss) */}
      <div
        className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {!notification.read && (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            className="p-1 rounded-lg text-forest/50 hover:text-forest hover:bg-forest/10 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(notification.id)}
          className="p-1 rounded-lg text-forest/50 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
