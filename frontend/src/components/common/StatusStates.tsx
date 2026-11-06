import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCw, AlertTriangle, Clock, Lock, ServerCrash } from 'lucide-react';
import { MagneticButton } from './MagneticButton';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Verifying authentication and connecting to validation engine...',
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex flex-col items-center justify-center p-8 text-center text-forest ${className}`}
    >
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-forest/20 border-dashed animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-purple border-t-transparent animate-spin" />
      </div>
      <p className="text-xs sm:text-sm font-mono tracking-wide text-forest/75">{message}</p>
    </motion.div>
  );
};

interface ErrorStateProps {
  status?: number;
  code?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  status,
  code = 'ERROR',
  message,
  onRetry,
  className = '',
}) => {
  // Determine branded icon and user-friendly copy based on error classification
  let title = 'An Unexpected Error Occurred';
  let description = message || 'We could not complete your request. Please try again.';
  let Icon = AlertTriangle;

  if (status === 401 || code === 'UNAUTHENTICATED') {
    title = 'Session Authentication Required';
    description = 'Your session may have expired. Please sign in to access your projects.';
    Icon = Lock;
  } else if (status === 403 || code === 'ORIGIN_REJECTED') {
    title = 'Access Forbidden';
    description = 'The server rejected this request due to cross-site security boundaries.';
    Icon = ShieldAlert;
  } else if (status === 429 || code === 'RATE_LIMITED' || code === 'AI_BUSY') {
    title = 'Rate Limit Reached';
    description = 'Too many requests were submitted in a short window. Please wait a moment before trying again.';
    Icon = Clock;
  } else if (status === 503 || code === 'DATABASE_UNAVAILABLE' || code === 'AUTH_NOT_READY' || code === 'AI_NOT_CONFIGURED') {
    title = 'Backend Service Unavailable';
    description = 'The backend engine is currently offline or unconfigured. Check service status.';
    Icon = ServerCrash;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`p-6 sm:p-8 rounded-3xl bg-sand-light border border-forest/20 text-forest max-w-lg mx-auto text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-forest/5 text-purple mx-auto flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>

      <div className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest text-purple bg-purple/10 px-2.5 py-1 rounded-full mb-2">
        {code} {status ? `// HTTP ${status}` : ''}
      </div>

      <h3 className="text-xl font-bold tracking-tight text-forest mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-forest/80 leading-relaxed mb-6 font-sans">
        {description}
      </p>

      {onRetry && (
        <MagneticButton variant="forest" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try Again
        </MagneticButton>
      )}
    </motion.div>
  );
};

