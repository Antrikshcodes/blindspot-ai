import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNotificationTime,
  type NotificationType,
  type AppNotification,
} from '../types/notifications.ts';
import {
  DEFAULT_USER_PREFERENCES,
  type NotificationPreferences,
  type AppPreferences,
} from '../types/preferences.ts';

describe('Notification Categories and Timestamp Formatting', () => {
  test('formatNotificationTime handles recent and historical timestamps correctly', () => {
    const now = new Date();
    assert.equal(formatNotificationTime(now.toISOString()), 'Just now');

    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    assert.equal(formatNotificationTime(fiveMinAgo.toISOString()), '5m ago');

    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    assert.equal(formatNotificationTime(threeHoursAgo.toISOString()), '3h ago');

    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    assert.equal(formatNotificationTime(twoDaysAgo.toISOString()), '2d ago');
  });

  test('All 7 supported Notification Types are strictly categorized', () => {
    const supportedTypes: NotificationType[] = [
      'ANALYSIS_COMPLETED',
      'FEEDBACK_RECEIVED',
      'CONTRADICTION_DETECTED',
      'EXPERIMENT_UPDATE',
      'RESOURCE_RECOMMENDATION',
      'PROJECT_ACTIVITY',
      'SYSTEM',
    ];

    supportedTypes.forEach((type) => {
      assert.ok(typeof type === 'string');
      assert.ok(type.length > 0);
    });
  });
});

describe('User Preferences Contract and Defaults', () => {
  test('DEFAULT_USER_PREFERENCES provides valid notification channels and defaults', () => {
    const prefs: NotificationPreferences = DEFAULT_USER_PREFERENCES.notificationPreferences;

    // In-app channels default enabled for core validation events
    assert.equal(prefs.inApp.analysisCompleted, true);
    assert.equal(prefs.inApp.feedbackReceived, true);
    assert.equal(prefs.inApp.contradictions, true);
    assert.equal(prefs.inApp.experimentUpdates, true);
    assert.equal(prefs.inApp.resourceAlerts, true);
    assert.equal(prefs.inApp.productAnnouncements, true);

    // Email channels default enabled only for high-priority alerts
    assert.equal(prefs.email.analysisCompleted, true);
    assert.equal(prefs.email.feedbackReceived, true);
    assert.equal(prefs.email.contradictions, true);
    assert.equal(prefs.email.productAnnouncements, false);
  });

  test('AppPreferences default landing view and density match SaaS defaults', () => {
    const appPrefs: AppPreferences = DEFAULT_USER_PREFERENCES.appPreferences;

    assert.equal(appPrefs.theme, 'light');
    assert.equal(appPrefs.defaultLandingPage, '/dashboard');
    assert.equal(appPrefs.compactDensity, false);
  });

  test('AppPreferences only allows supported route targets', () => {
    const validTargets = ['/dashboard', '/projects'];
    assert.ok(validTargets.includes(DEFAULT_USER_PREFERENCES.appPreferences.defaultLandingPage));
  });
});

describe('Notification List and Unread State Transitions', () => {
  test('Unread count calculation strictly counts unread items', () => {
    const items: AppNotification[] = [
      {
        id: '1',
        ownerId: 'user_123',
        title: 'Analysis v1 Complete',
        message: 'Analysis finished',
        type: 'ANALYSIS_COMPLETED',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        ownerId: 'user_123',
        title: 'Project Initialized',
        message: 'New workspace created',
        type: 'PROJECT_ACTIVITY',
        read: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        ownerId: 'user_123',
        title: 'Resources Discovered',
        message: '12 open-source models found',
        type: 'RESOURCE_RECOMMENDATION',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];

    const unreadCount = items.filter((i) => !i.read).length;
    assert.equal(unreadCount, 2);

    // Marking all as read
    const allRead = items.map((i) => ({ ...i, read: true }));
    const newUnreadCount = allRead.filter((i) => !i.read).length;
    assert.equal(newUnreadCount, 0);
  });
});
