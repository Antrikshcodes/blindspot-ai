import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { user, isLoaded } = useUser();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoaded || !user) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-2 text-forest/60">
        <Loader2 className="w-6 h-6 animate-spin text-forest" />
        <p className="text-xs">Loading profile data from Clerk...</p>
      </div>
    );
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setSuccessMessage('Profile name updated successfully.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update profile name.');
    } finally {
      setIsUpdating(false);
    }
  };

  const email = user.primaryEmailAddress?.emailAddress || 'No email provided';
  const isEmailVerified = user.primaryEmailAddress?.verification?.status === 'verified';
  const createdAtFormatted = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Overview Card */}
      <div className="p-6 rounded-3xl bg-sand-light border border-forest/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || 'User Avatar'}
              className="w-16 h-16 rounded-full border-2 border-forest/20 shadow-md object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-forest text-sand flex items-center justify-center text-xl font-bold border border-forest/20 shadow-md">
              {user.firstName?.[0] || 'B'}
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-forest flex items-center gap-2">
              <span>{user.fullName || user.username || 'Product Builder'}</span>
              {isEmailVerified && (
                <span title="Verified Account">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </span>
              )}
            </h3>
            <p className="text-xs text-forest/70 font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-forest/50" />
              <span>{email}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-forest/5 border border-forest/10 text-forest/70 font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-forest/60" />
            <span>Member since {createdAtFormatted}</span>
          </span>
        </div>
      </div>

      {/* Editable Profile Name Form */}
      <form onSubmit={handleUpdateName} className="p-6 rounded-3xl bg-sand/30 border border-forest/15 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-forest uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-purple" />
            <span>Profile Information</span>
          </h4>
          <span className="text-[11px] text-forest/60">Managed securely via Clerk Authentication</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="settings-first-name" className="block text-xs font-semibold text-forest/80 mb-1.5">
              First Name
            </label>
            <input
              id="settings-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-forest/20 text-forest text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple/40"
              placeholder="First name"
            />
          </div>

          <div>
            <label htmlFor="settings-last-name" className="block text-xs font-semibold text-forest/80 mb-1.5">
              Last Name
            </label>
            <input
              id="settings-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-forest/20 text-forest text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple/40"
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isUpdating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-forest text-sand text-xs font-semibold hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Profile Name</span>
          </button>
        </div>
      </form>

      {/* Account Technical Details */}
      <div className="p-6 rounded-3xl bg-sand/30 border border-forest/15 space-y-4">
        <h4 className="text-sm font-bold text-forest uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-purple" />
          <span>Account Credentials & Identity</span>
        </h4>

        <div className="rounded-2xl border border-forest/10 divide-y divide-forest/10 text-xs">
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-forest/70 font-medium">Primary Email</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-forest">{email}</span>
              {isEmailVerified && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 text-[10px] font-bold border border-emerald-500/30">
                  VERIFIED
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-forest/70 font-medium">Clerk User Identifier</span>
            <code className="text-forest font-mono text-[11px] bg-forest/5 px-2 py-0.5 rounded border border-forest/10 truncate max-w-xs">
              {user.id}
            </code>
          </div>

          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-forest/70 font-medium">Two-Factor Authentication</span>
            <span className="font-semibold text-forest">
              {user.twoFactorEnabled ? 'Enabled' : 'Managed via Identity Provider'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
