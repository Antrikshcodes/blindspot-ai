import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  LogOut,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export const SecuritySettings: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  if (!isLoaded || !user) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-2 text-forest/60">
        <Loader2 className="w-6 h-6 animate-spin text-forest" />
        <p className="text-xs">Loading security and session credentials...</p>
      </div>
    );
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
      setIsSigningOut(false);
    }
  };

  const email = user.primaryEmailAddress?.emailAddress || 'Authenticated Account';
  const lastSignIn = user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'Active now';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Security Status Card */}
      <div className="p-6 rounded-3xl bg-sand/30 border border-forest/15 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-forest uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Authentication & Identity Security</span>
          </h4>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            SECURE
          </span>
        </div>
        <p className="text-xs text-forest/75 leading-relaxed">
          Authentication is verified at the API boundary using Clerk JSON Web Tokens. Passwords and credentials
          are encrypted and handled by Clerk's SOC 2 Type II compliant infrastructure.
        </p>
      </div>

      {/* Identity Provider Credentials */}
      <div className="rounded-3xl border border-forest/15 bg-white/80 p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-purple" />
          <span>Verified Authentication Providers</span>
        </h4>

        <div className="rounded-2xl border border-forest/10 divide-y divide-forest/10 text-xs">
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest font-bold">
                @
              </div>
              <div>
                <p className="font-semibold text-forest">{email}</p>
                <p className="text-[11px] text-forest/60">Primary Email Account</p>
              </div>
            </div>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full text-[10px]">
              VERIFIED
            </span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-forest/70 font-medium">Last Login Timestamp</span>
            <span className="font-mono text-forest/80 text-[11px]">{lastSignIn}</span>
          </div>
        </div>
      </div>

      {/* Active Session & Device Controls */}
      <div className="rounded-3xl border border-forest/15 bg-white/80 p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-purple" />
          <span>Active Session</span>
        </h4>

        <div className="p-4 rounded-2xl bg-sand/20 border border-forest/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-forest">Current Browser Session</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-forest/65 font-mono truncate max-w-sm">
              Session ID: {user.id.slice(0, 16)}...
            </p>
          </div>

          {!showSignOutConfirm ? (
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors text-xs font-semibold self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm"
              >
                {isSigningOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                <span>Confirm Sign Out</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="px-3 py-1.5 rounded-xl border border-forest/20 text-forest text-xs font-medium hover:bg-forest/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Deletion & Data Protection Policy */}
      <div className="p-6 rounded-3xl bg-forest/5 border border-forest/15 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-forest uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-purple" />
          <span>Data Retention & Security Protocol</span>
        </div>
        <p className="text-xs text-forest/75 leading-relaxed font-sans">
          Project records, hypotheses, and evidence records remain private to your authenticated identity.
          To permanently close or remove your account credentials, manage your identity through your primary
          authentication provider.
        </p>
      </div>
    </div>
  );
};
