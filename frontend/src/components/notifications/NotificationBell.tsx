import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Trash2,
  Inbox,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
  useClearAllNotifications,
  NOTIFICATIONS_QUERY_KEY,
} from '../../api/notificationApi';
import { NotificationItem } from './NotificationItem';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useGetNotifications({
    page: 1,
    limit: 25,
    unreadOnly,
  });

  const { mutateAsync: markReadMutation } = useMarkNotificationRead();
  const { mutateAsync: markAllReadMutation, isPending: isMarkingAll } = useMarkAllNotificationsRead();
  const { mutateAsync: dismissMutation } = useDismissNotification();
  const { mutateAsync: clearAllMutation, isPending: isClearingAll } = useClearAllNotifications();

  const notifications = data?.data?.items || [];
  const unreadCount = data?.data?.unreadCount || 0;

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await markReadMutation(id);
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissMutation(id);
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    } catch (err) {
      console.error('Failed to dismiss:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation();
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllMutation();
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-forest/70 hover:text-forest hover:bg-forest/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple transition-colors"
        title="Notifications"
        aria-label="Open Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-purple text-sand text-[10px] font-bold flex items-center justify-center shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-forest/15 overflow-hidden z-50 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-forest/10 bg-sand/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-forest">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple/15 text-purple border border-purple/20">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAll}
                    className="p-1 rounded-lg text-forest/60 hover:text-forest hover:bg-forest/10 transition-colors text-xs flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isClearingAll}
                    className="p-1 rounded-lg text-forest/50 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => refetch()}
                  className="p-1 rounded-lg text-forest/50 hover:text-forest hover:bg-forest/10 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-Filters */}
            <div className="px-4 py-2 border-b border-forest/10 bg-sand/10 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setUnreadOnly(false)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  !unreadOnly ? 'bg-forest text-sand' : 'text-forest/70 hover:text-forest hover:bg-forest/5'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setUnreadOnly(true)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  unreadOnly ? 'bg-forest text-sand' : 'text-forest/70 hover:text-forest hover:bg-forest/5'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>

            {/* Notification List Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y-0">
              {isLoading && (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-forest/60">
                  <Loader2 className="w-6 h-6 animate-spin text-forest" />
                  <p className="text-xs">Loading notifications...</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <p>Failed to load notifications. Please try again.</p>
                </div>
              )}

              {!isLoading && !error && notifications.length === 0 && (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-forest/5 flex items-center justify-center mx-auto text-forest/50">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-forest">
                    {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                  <p className="text-[11px] text-forest/60 max-w-[220px] mx-auto leading-relaxed">
                    Real product events like completed AI analyses and resource discoveries will appear here.
                  </p>
                </div>
              )}

              {!isLoading &&
                !error &&
                notifications.map((item) => (
                  <NotificationItem
                    key={item.id}
                    notification={item}
                    onMarkRead={handleMarkRead}
                    onDismiss={handleDismiss}
                    onCloseCenter={() => setIsOpen(false)}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
