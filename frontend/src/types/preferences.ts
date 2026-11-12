export interface NotificationChannelPreferences {
  analysisCompleted: boolean;
  feedbackReceived: boolean;
  contradictions: boolean;
  experimentUpdates: boolean;
  resourceAlerts: boolean;
  productAnnouncements: boolean;
}

export interface NotificationPreferences {
  email: NotificationChannelPreferences;
  inApp: NotificationChannelPreferences;
}

export interface AppPreferences {
  theme: 'light' | 'system';
  defaultLandingPage: '/dashboard' | '/projects';
  compactDensity: boolean;
}

export interface UserPreferencesRecord {
  ownerId: string;
  notificationPreferences: NotificationPreferences;
  appPreferences: AppPreferences;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_USER_PREFERENCES: Omit<UserPreferencesRecord, 'ownerId' | 'createdAt' | 'updatedAt'> = {
  notificationPreferences: {
    email: {
      analysisCompleted: true,
      feedbackReceived: true,
      contradictions: true,
      experimentUpdates: false,
      resourceAlerts: false,
      productAnnouncements: false,
    },
    inApp: {
      analysisCompleted: true,
      feedbackReceived: true,
      contradictions: true,
      experimentUpdates: true,
      resourceAlerts: true,
      productAnnouncements: true,
    },
  },
  appPreferences: {
    theme: 'light',
    defaultLandingPage: '/dashboard',
    compactDensity: false,
  },
};
