import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  isDeleting: boolean;
  error?: string | null;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  isDeleting,
  error,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isDeleting ? undefined : onClose}
            className="fixed inset-0 bg-forest-dark/70 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-sand-light border border-forest/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-forest z-10"
          >
            {/* Close Button */}
            {!isDeleting && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-full text-forest/60 hover:text-forest hover:bg-forest/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
                aria-label="Cancel deletion"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Warning Icon */}
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 id="delete-project-title" className="text-xl sm:text-2xl font-bold tracking-tight text-forest mb-2">
              Delete Project?
            </h3>

            <p className="text-sm text-forest/80 leading-relaxed mb-4">
              Are you sure you want to delete <span className="font-semibold text-forest">"{projectName}"</span>?
            </p>

            {/* Cascade Deletion Warning */}
            <div className="p-4 rounded-2xl bg-sand border border-forest/15 text-xs text-forest/85 space-y-2 mb-6">
              <p className="font-semibold text-forest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                Permanent Database Cascading Action
              </p>
              <p className="text-forest/70 leading-normal">
                This will permanently delete the project and all cascaded data stored in the database, including AI analyses, identified assumptions, customer interview feedback, and experiment logs.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 text-xs mb-4">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-forest/70 hover:text-forest hover:bg-forest/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Project
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
