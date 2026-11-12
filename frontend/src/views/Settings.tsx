import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Sliders,
  ShieldCheck,
  Settings as SettingsIcon,
} from 'lucide-react';
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { NotificationPreferencesView } from '../components/settings/NotificationPreferencesView';
import { ApplicationPreferencesView } from '../components/settings/ApplicationPreferencesView';
import { SecuritySettings } from '../components/settings/SecuritySettings';

type SettingsTab = 'profile' | 'notifications' | 'preferences' | 'security';

interface TabDef {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notification Preferences', icon: Bell },
  { id: 'preferences', label: 'Application Preferences', icon: Sliders },
  { id: 'security', label: 'Security & Session', icon: ShieldCheck },
];

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-16"
    >
      {/* Header */}
      <div className="pb-6 border-b border-forest/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-forest tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-purple" />
            <span>Account & Workspace Settings</span>
          </h2>
          <p className="text-xs sm:text-sm text-forest/70 mt-1 max-w-xl">
            Manage your personal profile, notification matrix, security credentials, and application defaults.
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-forest/10 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-forest text-sand shadow-sm'
                  : 'bg-sand-light text-forest/70 hover:text-forest hover:bg-sand border border-forest/10'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple' : 'text-forest/60'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'notifications' && <NotificationPreferencesView />}
        {activeTab === 'preferences' && <ApplicationPreferencesView />}
        {activeTab === 'security' && <SecuritySettings />}
      </div>
    </motion.div>
  );
};
