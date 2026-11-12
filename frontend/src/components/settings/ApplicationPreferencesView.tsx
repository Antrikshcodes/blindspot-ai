import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Palette,
  Layout,
  Maximize2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useGetUserPreferences, useUpdateUserPreferences } from '../../api/preferencesApi';
import type { AppPreferences } from '../../types/preferences';
import { DEFAULT_USER_PREFERENCES } from '../../types/preferences';

export const ApplicationPreferencesView: React.FC = () => {
  const { data, isLoading, error } = useGetUserPreferences();
  const { mutateAsync: updatePreferences, isPending: isSaving } = useUpdateUserPreferences();

  const [appPrefs, setAppPrefs] = useState<AppPreferences>(
    DEFAULT_USER_PREFERENCES.appPreferences
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.data?.appPreferences) {
      setAppPrefs(data.data.appPreferences);
    }
  }, [data]);

  const handleSave = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updatePreferences({
        notificationPreferences: data?.data?.notificationPreferences || DEFAULT_USER_PREFERENCES.notificationPreferences,
        appPreferences: appPrefs,
      });

      // Also persist to localStorage for instant client initialization
      localStorage.setItem('blindspot_default_landing', appPrefs.defaultLandingPage);
      localStorage.setItem('blindspot_compact_density', String(appPrefs.compactDensity));

      setSuccessMessage('Application preferences saved.');
      setHasChanges(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save preferences.');
    }
  };

  const handleReset = () => {
    if (data?.data?.appPreferences) {
      setAppPrefs(data.data.appPreferences);
    } else {
      setAppPrefs(DEFAULT_USER_PREFERENCES.appPreferences);
    }
    setHasChanges(false);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-2 text-forest/60">
        <Loader2 className="w-6 h-6 animate-spin text-forest" />
        <p className="text-xs">Loading application preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Info */}
      <div className="p-6 rounded-3xl bg-sand/30 border border-forest/15 space-y-2">
        <h4 className="text-sm font-bold text-forest uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple" />
          <span>Workspace & Display Preferences</span>
        </h4>
        <p className="text-xs text-forest/70 leading-relaxed">
          Customize navigation defaults and interface density for your Blindspot AI workspace.
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
          <span>Failed to load preferences. Using defaults.</span>
        </div>
      )}

      <div className="rounded-3xl border border-forest/15 bg-white/80 p-6 shadow-sm space-y-6">
        {/* Default Landing Page */}
        <div className="space-y-3 pb-6 border-b border-forest/10">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-forest/70" />
            <h5 className="text-xs font-bold text-forest uppercase tracking-wider">
              Default Workspace Landing View
            </h5>
          </div>
          <p className="text-xs text-forest/70 leading-relaxed">
            Choose which view opens when you sign in or click the Blindspot logo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                appPrefs.defaultLandingPage === '/dashboard'
                  ? 'bg-forest/5 border-purple/40 ring-1 ring-purple/20'
                  : 'bg-sand/20 border-forest/15 hover:border-forest/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-forest">Executive Dashboard</span>
                <input
                  type="radio"
                  name="landingPage"
                  value="/dashboard"
                  checked={appPrefs.defaultLandingPage === '/dashboard'}
                  onChange={() => {
                    setAppPrefs((prev) => ({ ...prev, defaultLandingPage: '/dashboard' }));
                    setHasChanges(true);
                  }}
                  className="text-forest focus:ring-purple"
                />
              </div>
              <p className="text-[11px] text-forest/70 leading-snug">
                Overview of portfolio validation metrics, quick actions, and recent activity.
              </p>
            </label>

            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                appPrefs.defaultLandingPage === '/projects'
                  ? 'bg-forest/5 border-purple/40 ring-1 ring-purple/20'
                  : 'bg-sand/20 border-forest/15 hover:border-forest/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-forest">Projects Repository</span>
                <input
                  type="radio"
                  name="landingPage"
                  value="/projects"
                  checked={appPrefs.defaultLandingPage === '/projects'}
                  onChange={() => {
                    setAppPrefs((prev) => ({ ...prev, defaultLandingPage: '/projects' }));
                    setHasChanges(true);
                  }}
                  className="text-forest focus:ring-purple"
                />
              </div>
              <p className="text-[11px] text-forest/70 leading-snug">
                Direct list of your product ideas, validation stages, and active hypotheses.
              </p>
            </label>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="space-y-3 pb-6 border-b border-forest/10">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-forest/70" />
            <h5 className="text-xs font-bold text-forest uppercase tracking-wider">
              Visual Palette & Theme
            </h5>
          </div>
          <p className="text-xs text-forest/70 leading-relaxed">
            Blindspot AI uses the curated <strong>Forest Green (#1F3D2B)</strong>, <strong>Sand Beige (#E8DCC4)</strong>, and <strong>Electric Purple (#8B5CF6)</strong> palette.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                appPrefs.theme === 'light'
                  ? 'bg-forest/5 border-purple/40 ring-1 ring-purple/20'
                  : 'bg-sand/20 border-forest/15 hover:border-forest/30'
              }`}
            >
              <div>
                <span className="font-bold text-xs text-forest block">Official Palette (Light Sand)</span>
                <span className="text-[11px] text-forest/65">Standard high-contrast SaaS theme</span>
              </div>
              <input
                type="radio"
                name="theme"
                value="light"
                checked={appPrefs.theme === 'light'}
                onChange={() => {
                  setAppPrefs((prev) => ({ ...prev, theme: 'light' }));
                  setHasChanges(true);
                }}
                className="text-forest focus:ring-purple"
              />
            </label>

            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                appPrefs.theme === 'system'
                  ? 'bg-forest/5 border-purple/40 ring-1 ring-purple/20'
                  : 'bg-sand/20 border-forest/15 hover:border-forest/30'
              }`}
            >
              <div>
                <span className="font-bold text-xs text-forest block">System Adaptive</span>
                <span className="text-[11px] text-forest/65">Follow OS color preference</span>
              </div>
              <input
                type="radio"
                name="theme"
                value="system"
                checked={appPrefs.theme === 'system'}
                onChange={() => {
                  setAppPrefs((prev) => ({ ...prev, theme: 'system' }));
                  setHasChanges(true);
                }}
                className="text-forest focus:ring-purple"
              />
            </label>
          </div>
        </div>

        {/* Compact Density Mode */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-forest/70" />
              <h5 className="text-xs font-bold text-forest">Compact View Density</h5>
            </div>
            <p className="text-[11px] text-forest/70 leading-snug">
              Reduce padding and vertical margins in data matrices and assumption lists.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAppPrefs((prev) => ({ ...prev, compactDensity: !prev.compactDensity }));
              setHasChanges(true);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple/50 ${
              appPrefs.compactDensity ? 'bg-forest' : 'bg-sand border-forest/20'
            }`}
            role="switch"
            aria-checked={appPrefs.compactDensity}
            aria-label="Toggle compact view density"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                appPrefs.compactDensity ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
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
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  );
};
