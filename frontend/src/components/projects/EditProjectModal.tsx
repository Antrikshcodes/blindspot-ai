import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Save, Plus } from 'lucide-react';
import type { Project, ProjectUpdate } from '@workspace/api-client-react';

export interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (id: string, data: ProjectUpdate) => Promise<void>;
  isUpdating: boolean;
  error?: string | null;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  isUpdating,
  error,
}) => {
  const [name, setName] = useState(project.name);
  const [targetAudience, setTargetAudience] = useState(project.targetAudience);
  const [problemStatement, setProblemStatement] = useState(project.problemStatement);
  const [productDescription, setProductDescription] = useState(project.productDescription);
  const [proposedSolution, setProposedSolution] = useState(project.proposedSolution);
  const [existingAlternatives, setExistingAlternatives] = useState<string[]>(
    project.existingAlternatives || []
  );
  const [newAlternative, setNewAlternative] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setTargetAudience(project.targetAudience);
      setProblemStatement(project.problemStatement);
      setProductDescription(project.productDescription);
      setProposedSolution(project.proposedSolution);
      setExistingAlternatives(project.existingAlternatives || []);
      setNewAlternative('');
      setClientErrors({});
    }
  }, [isOpen, project]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isUpdating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUpdating, onClose]);

  const handleAddAlternative = () => {
    const trimmed = newAlternative.trim();
    if (!trimmed) return;
    if (trimmed.length > 300) {
      setClientErrors(prev => ({ ...prev, alternatives: 'Alternative must be 300 characters or less.' }));
      return;
    }
    if (existingAlternatives.length >= 20) {
      setClientErrors(prev => ({ ...prev, alternatives: 'Maximum 20 alternatives allowed.' }));
      return;
    }
    if (existingAlternatives.includes(trimmed)) {
      setClientErrors(prev => ({ ...prev, alternatives: 'This alternative has already been added.' }));
      return;
    }
    setExistingAlternatives([...existingAlternatives, trimmed]);
    setNewAlternative('');
    setClientErrors(prev => {
      const copy = { ...prev };
      delete copy.alternatives;
      return copy;
    });
  };

  const handleRemoveAlternative = (index: number) => {
    setExistingAlternatives(existingAlternatives.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const trimmedName = name.trim();
    const trimmedAudience = targetAudience.trim();
    const trimmedProblem = problemStatement.trim();
    const trimmedDesc = productDescription.trim();
    const trimmedSolution = proposedSolution.trim();

    if (!trimmedName) {
      errors.name = 'Project name is required (max 100 characters).';
    } else if (trimmedName.length > 100) {
      errors.name = 'Project name cannot exceed 100 characters.';
    }

    if (!trimmedAudience || trimmedAudience.length < 5) {
      errors.targetAudience = 'Target audience must be at least 5 characters (max 1,000).';
    } else if (trimmedAudience.length > 1000) {
      errors.targetAudience = 'Target audience cannot exceed 1,000 characters.';
    }

    if (!trimmedProblem || trimmedProblem.length < 20) {
      errors.problemStatement = 'Problem statement must be at least 20 characters (max 4,000).';
    } else if (trimmedProblem.length > 4000) {
      errors.problemStatement = 'Problem statement cannot exceed 4,000 characters.';
    }

    if (!trimmedDesc) {
      errors.productDescription = 'Product description is required (max 4,000 characters).';
    } else if (trimmedDesc.length > 4000) {
      errors.productDescription = 'Product description cannot exceed 4,000 characters.';
    }

    if (!trimmedSolution) {
      errors.proposedSolution = 'Proposed solution is required (max 4,000 characters).';
    } else if (trimmedSolution.length > 4000) {
      errors.proposedSolution = 'Proposed solution cannot exceed 4,000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    setClientErrors({});
    await onSave(project.id, {
      name: trimmedName,
      targetAudience: trimmedAudience,
      problemStatement: trimmedProblem,
      productDescription: trimmedDesc,
      proposedSolution: trimmedSolution,
      existingAlternatives,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-project-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isUpdating ? undefined : onClose}
            className="fixed inset-0 bg-forest-dark/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-sand-light border border-forest/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-forest z-10 max-h-[90vh] overflow-y-auto my-auto"
          >
            {/* Close Button */}
            {!isUpdating && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-full text-forest/60 hover:text-forest hover:bg-forest/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
                aria-label="Close edit dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="mb-6">
              <span className="text-[11px] font-mono uppercase tracking-wider text-purple font-semibold">
                Project Workspace Configuration
              </span>
              <h3 id="edit-project-title" className="text-2xl font-bold tracking-tight text-forest mt-1">
                Edit Project
              </h3>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-700 text-xs mb-5">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Project Name */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="edit-name" className="text-xs font-bold uppercase tracking-wider text-forest/80">
                    Project Name <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-forest/50">{name.length}/100</span>
                </div>
                <input
                  id="edit-name"
                  type="text"
                  maxLength={100}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-4 py-2.5 rounded-xl bg-sand border border-forest/20 text-forest text-sm focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50"
                  placeholder="e.g. Blindspot AI"
                />
                {clientErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{clientErrors.name}</p>
                )}
              </div>

              {/* Target Audience */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="edit-audience" className="text-xs font-bold uppercase tracking-wider text-forest/80">
                    Target Audience <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-forest/50">{targetAudience.length}/1000</span>
                </div>
                <input
                  id="edit-audience"
                  type="text"
                  maxLength={1000}
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-4 py-2.5 rounded-xl bg-sand border border-forest/20 text-forest text-sm focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50"
                  placeholder="e.g. Student founders and early-stage hackathon builders"
                />
                {clientErrors.targetAudience && (
                  <p className="text-[11px] text-red-600 mt-1">{clientErrors.targetAudience}</p>
                )}
              </div>

              {/* Problem Statement */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="edit-problem" className="text-xs font-bold uppercase tracking-wider text-forest/80">
                    Problem Statement <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-forest/50">{problemStatement.length}/4000 (min 20)</span>
                </div>
                <textarea
                  id="edit-problem"
                  rows={3}
                  maxLength={4000}
                  value={problemStatement}
                  onChange={e => setProblemStatement(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-4 py-2.5 rounded-xl bg-sand border border-forest/20 text-forest text-sm focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50 resize-y"
                  placeholder="Describe the painful, recurring problem you are validating..."
                />
                {clientErrors.problemStatement && (
                  <p className="text-[11px] text-red-600 mt-1">{clientErrors.problemStatement}</p>
                )}
              </div>

              {/* Proposed Solution */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="edit-solution" className="text-xs font-bold uppercase tracking-wider text-forest/80">
                    Proposed Solution <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-forest/50">{proposedSolution.length}/4000</span>
                </div>
                <textarea
                  id="edit-solution"
                  rows={3}
                  maxLength={4000}
                  value={proposedSolution}
                  onChange={e => setProposedSolution(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-4 py-2.5 rounded-xl bg-sand border border-forest/20 text-forest text-sm focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50 resize-y"
                  placeholder="Explain how your solution addresses the problem..."
                />
                {clientErrors.proposedSolution && (
                  <p className="text-[11px] text-red-600 mt-1">{clientErrors.proposedSolution}</p>
                )}
              </div>

              {/* Product Description */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="edit-desc" className="text-xs font-bold uppercase tracking-wider text-forest/80">
                    Product Description <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-forest/50">{productDescription.length}/4000</span>
                </div>
                <textarea
                  id="edit-desc"
                  rows={2}
                  maxLength={4000}
                  value={productDescription}
                  onChange={e => setProductDescription(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-4 py-2.5 rounded-xl bg-sand border border-forest/20 text-forest text-sm focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50 resize-y"
                  placeholder="High-level product overview..."
                />
                {clientErrors.productDescription && (
                  <p className="text-[11px] text-red-600 mt-1">{clientErrors.productDescription}</p>
                )}
              </div>

              {/* Existing Alternatives */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 block mb-1.5">
                  Existing Alternatives & Competitors
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    maxLength={300}
                    value={newAlternative}
                    onChange={e => setNewAlternative(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAlternative();
                      }
                    }}
                    disabled={isUpdating || existingAlternatives.length >= 20}
                    className="flex-1 px-4 py-2 rounded-xl bg-sand border border-forest/20 text-forest text-sm focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50"
                    placeholder="e.g. Spreadsheets, Notion templates, Manual interviews"
                  />
                  <button
                    type="button"
                    onClick={handleAddAlternative}
                    disabled={isUpdating || !newAlternative.trim() || existingAlternatives.length >= 20}
                    className="px-4 py-2 rounded-xl bg-forest text-sand text-xs font-bold hover:bg-forest-light transition-colors disabled:opacity-40 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {clientErrors.alternatives && (
                  <p className="text-[11px] text-red-600 mb-2">{clientErrors.alternatives}</p>
                )}

                {/* Alternatives Chips */}
                {existingAlternatives.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-sand/60 border border-forest/10 max-h-32 overflow-y-auto">
                    {existingAlternatives.map((alt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sand-light border border-forest/15 text-xs text-forest"
                      >
                        {alt}
                        <button
                          type="button"
                          onClick={() => handleRemoveAlternative(idx)}
                          className="text-forest/40 hover:text-red-600 ml-1 transition-colors"
                          aria-label={`Remove ${alt}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-forest/50 font-mono italic">
                    No alternatives added yet.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-forest/10">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold text-forest/70 hover:text-forest hover:bg-forest/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all flex items-center gap-2 shadow-sm disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
