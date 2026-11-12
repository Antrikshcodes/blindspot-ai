import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Compass,
  AlertTriangle,
  FlaskConical,
  Boxes,
  Info,
} from 'lucide-react';
import { useGetUserPreferences, useUpdateUserPreferences } from '../../api/preferencesApi';
import type { NotificationPreferences, NotificationChannelPreferences } from '../../types/preferences';
import { DEFAULT_USER_PREFERENCES } from '../../types/preferences';

interface PreferenceRowDef {
  key: keyof NotificationChannelPreferences;
  title: string;
  description: string;
  icon: React.ElementType;
}

const PREFERENCE_ROWS: PreferenceRowDef[] = [
  {
    key: 'analysisCompleted',
    title: 'AI Analysis Updates',
    description: 'Notifications when Phase 02 idea decomposition and risk scoring conclude.',
    icon: Sparkles,
  },
  {
    key: 'feedbackReceived',
    title: 'Customer Feedback & Notes',
    description: 'Alerts when customer interviews or qualitative feedback are logged.',
    icon: Compass,
  },
  {
    key: 'contradictions',
    title: 'Evidence & Contradiction Alerts',
    description: 'Immediate warnings when interview quotes contradict core assumptions.',
    icon: AlertTriangle,
  },
  {
    key: 'experimentUpdates',
    title: 'Validation Experiments',
    description: 'Status updates and completion threshold alerts for active experiments.',
    icon: FlaskConical,
  },
  {
    key: 'resourceAlerts',
    title: 'Resource Recommendations',
    description: 'Alerts when high-confidence open source models and repositories match your idea.',
    icon: Boxes,
  },
  {
    key: 'productAnnouncements',
    title: 'Platform Announcements',
    description: 'Updates on new validation tools, methodology guides, and releases.',
    icon: Info,
  },
];

export const NotificationPreferencesView: React.FC = () => {
  const { data, isLoading, error } = useGetUserPreferences();
  const { mutateAsync: updatePreferences, isPending: isSaving } = useUpdateUserPreferences();

  const [prefs, setPrefs] = useState<NotificationPreferences>(
    DEFAULT_USER_PREFERENCES.notificationPreferences
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.data?.notificationPreferences) {
      setPrefs(data.data.notificationPreferences);
    }
  }, [data]);

  const toggleChannel = (channel: 'email' | 'inApp', key: keyof NotificationChannelPreferences) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: !prev[channel][key],
      },
    }));
    setHasChanges(true);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updatePreferences({
        notificationPreferences: prefs,
        appPreferences: data?.data?.appPreferences || DEFAULT_USER_PREFERENCES.appPreferences,
      });
      setSuccessMessage('Notification preferences saved successfully.');
      setHasChanges(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save preferences.');
    }
  };

  const handleReset = () => {
    if (data?.data?.notificationPreferences) {
      setPrefs(data.data.notificationPreferences);
    } else {
      setPrefs(DEFAULT_USER_PREFERENCES.notificationPreferences);
    }
    setHasChanges(false);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-2 text-forest/60">
        <Loader2 className="w-6 h-6 animate-spin text-forest" />
        <p className="text-xs">Loading notification preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Info */}
      <div className="p-6 rounded-3xl bg-sand/30 border border-forest/15 space-y-2">
        <h4 className="text-sm font-bold text-forest uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple" />
          <span>Notification Channel Matrix</span>
        </h4>
        <p className="text-xs text-forest/70 leading-relaxed">
          Configure how Blindspot AI delivers alerts across your validation pipeline. All settings are
          persisted to your account.
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Failed to load existing preferences. Using sensible defaults.</span>
        </div>
      )}

      {/* Preferences Table / List */}
      <div className="rounded-3xl border border-forest/15 bg-white/80 overflow-hidden shadow-sm divide-y divide-forest/10">
        {/* Table Header Row */}
        <div className="p-4 bg-sand/40 flex items-center justify-between text-xs font-bold text-forest/80 uppercase tracking-wider">
          <span>Validation Event Category</span>
          <div className="flex items-center gap-8 pr-4">
            <span className="flex items-center gap-1.5 w-16 justify-center">
              <Smartphone className="w-3.5 h-3.5 text-forest/60" />
              <span>In-App</span>
            </span>
            <span className="flex items-center gap-1.5 w-16 justify-center">
              <Mail className="w-3.5 h-3.5 text-forest/60" />
              <span>Email</span>
            </span>
          </div>
        </div>

        {/* Rows */}
        {PREFERENCE_ROWS.map((row) => {
          const Icon = row.icon;
          const isInAppOn = prefs.inApp[row.key];
          const isEmailOn = prefs.email[row.key];

          return (
            <div
              key={row.key}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-sand/15 transition-colors"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-2">
                <div className="p-2 rounded-xl bg-forest/5 text-forest shrink-0 mt-0.5 border border-forest/10">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-forest">{row.title}</h5>
                  <p className="text-[11px] text-forest/70 mt-0.5 leading-snug">{row.description}</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-8 self-end sm:self-center pr-4">
                {/* In-App Toggle */}
                <div className="w-16 flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggleChannel('inApp', row.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple/50 ${
                      isInAppOn ? 'bg-forest' : 'bg-sand border-forest/20'
                    }`}
                    role="switch"
                    aria-checked={isInAppOn}
                    aria-label={`Toggle In-App notifications for ${row.title}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isInAppOn ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Email Toggle */}
                <div className="w-16 flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggleChannel('email', row.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple/50 ${
                      isEmailOn ? 'bg-forest' : 'bg-sand border-forest/20'
                    }`}
                    role="switch"
                    aria-checked={isEmailOn}
                    aria-label={`Toggle Email notifications for ${row.title}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEmailOn ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-forest/70 hover:text-forest hover:bg-forest/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Changes</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save Notification Preferences</span>
        </button>
      </div>
    </div>
  );
};
