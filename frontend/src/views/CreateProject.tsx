import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';
import { useCreateProject, type ProjectInput } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [existingAlternatives, setExistingAlternatives] = useState<string[]>([]);
  const [newAlternative, setNewAlternative] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync: createProject, isPending } = useCreateProject();

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
    setServerError(null);

    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedAudience = targetAudience.trim();
    const trimmedProblem = problemStatement.trim();
    const trimmedDesc = productDescription.trim();
    const trimmedSolution = proposedSolution.trim();

    if (!trimmedName) {
      errors.name = 'Project name is required (1-100 characters).';
    } else if (trimmedName.length > 100) {
      errors.name = 'Project name cannot exceed 100 characters.';
    }

    if (!trimmedAudience || trimmedAudience.length < 5) {
      errors.targetAudience = 'Target audience must be at least 5 characters (e.g. Student founders building B2B SaaS).';
    } else if (trimmedAudience.length > 1000) {
      errors.targetAudience = 'Target audience cannot exceed 1,000 characters.';
    }

    if (!trimmedProblem || trimmedProblem.length < 20) {
      errors.problemStatement = 'Problem statement must be at least 20 characters describing the core pain.';
    } else if (trimmedProblem.length > 4000) {
      errors.problemStatement = 'Problem statement cannot exceed 4,000 characters.';
    }

    if (!trimmedDesc) {
      errors.productDescription = 'Product description is required (1-4,000 characters).';
    } else if (trimmedDesc.length > 4000) {
      errors.productDescription = 'Product description cannot exceed 4,000 characters.';
    }

    if (!trimmedSolution) {
      errors.proposedSolution = 'Proposed solution is required (1-4,000 characters).';
    } else if (trimmedSolution.length > 4000) {
      errors.proposedSolution = 'Proposed solution cannot exceed 4,000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    setClientErrors({});

    const payload: ProjectInput = {
      name: trimmedName,
      targetAudience: trimmedAudience,
      problemStatement: trimmedProblem,
      productDescription: trimmedDesc,
      proposedSolution: trimmedSolution,
      existingAlternatives,
    };

    try {
      const response = await createProject({ data: payload });
      // Invalidate project lists
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      const newId = (response as any)?.data?.id;
      if (newId) {
        navigate(`/projects/${newId}`);
      } else {
        navigate('/projects');
      }
    } catch (err: any) {
      setServerError(
        err?.message ||
          (err as any)?.data?.error?.message ||
          'Failed to create project on the server. Please check all fields.'
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto space-y-8 pb-12"
    >
      {/* 1. TOP HEADER & BACK NAVIGATION */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="p-2 rounded-2xl bg-sand-light border border-forest/15 text-forest/70 hover:text-forest hover:bg-forest/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
          aria-label="Back to projects"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-purple font-semibold">
            Hypothesis Intake
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-forest mt-0.5">
            Create Validation Project
          </h1>
        </div>
      </div>

      {serverError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-700 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Submission Error</p>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      {/* 2. FORM CONTAINER */}
      <form onSubmit={handleSubmit} className="bg-sand-light border border-forest/15 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        {/* Project Name */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="project-name" className="text-xs font-bold uppercase tracking-wider text-forest">
              Project Name <span className="text-red-600">*</span>
            </label>
            <span className="text-[11px] font-mono text-forest/50">{name.length}/100</span>
          </div>
          <input
            id="project-name"
            type="text"
            maxLength={100}
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isPending}
            placeholder="e.g. SubTracker, MindMap AI, CleanPlate"
            className="w-full px-4 py-3 rounded-2xl bg-sand border border-forest/20 text-forest text-sm placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50 transition-all"
          />
          <p className="text-[11px] text-forest/60 mt-1">A memorable working title for this idea hypothesis.</p>
          {clientErrors.name && (
            <p className="text-xs text-red-600 mt-1 font-semibold">{clientErrors.name}</p>
          )}
        </div>

        {/* Target Audience */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="target-audience" className="text-xs font-bold uppercase tracking-wider text-forest">
              Target Audience <span className="text-red-600">*</span>
            </label>
            <span className="text-[11px] font-mono text-forest/50">{targetAudience.length}/1000 (min 5)</span>
          </div>
          <input
            id="target-audience"
            type="text"
            maxLength={1000}
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            disabled={isPending}
            placeholder="e.g. Early-stage student founders building developer tools"
            className="w-full px-4 py-3 rounded-2xl bg-sand border border-forest/20 text-forest text-sm placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50 transition-all"
          />
          <p className="text-[11px] text-forest/60 mt-1">Who specifically experiences this pain? Avoid generic descriptions like "everyone".</p>
          {clientErrors.targetAudience && (
            <p className="text-xs text-red-600 mt-1 font-semibold">{clientErrors.targetAudience}</p>
          )}
        </div>

        {/* Problem Statement */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="problem-statement" className="text-xs font-bold uppercase tracking-wider text-forest">
              Problem Statement <span className="text-red-600">*</span>
            </label>
            <span className="text-[11px] font-mono text-forest/50">{problemStatement.length}/4000 (min 20)</span>
          </div>
          <textarea
            id="problem-statement"
            rows={4}
            maxLength={4000}
            value={problemStatement}
            onChange={e => setProblemStatement(e.target.value)}
            disabled={isPending}
            placeholder="Describe the painful, recurring frustration your audience experiences today. What makes this problem urgent and unresolved? (Minimum 20 characters)"
            className="w-full px-4 py-3 rounded-2xl bg-sand border border-forest/20 text-forest text-sm placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50 transition-all resize-y"
          />
          <p className="text-[11px] text-forest/60 mt-1">Focus on user behavior and painful reality, not your solution pitch.</p>
          {clientErrors.problemStatement && (
            <p className="text-xs text-red-600 mt-1 font-semibold">{clientErrors.problemStatement}</p>
          )}
        </div>

        {/* Proposed Solution */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="proposed-solution" className="text-xs font-bold uppercase tracking-wider text-forest">
              Proposed Solution <span className="text-red-600">*</span>
            </label>
            <span className="text-[11px] font-mono text-forest/50">{proposedSolution.length}/4000</span>
          </div>
          <textarea
            id="proposed-solution"
            rows={3}
            maxLength={4000}
            value={proposedSolution}
            onChange={e => setProposedSolution(e.target.value)}
            disabled={isPending}
            placeholder="How does your proposed product or workflow solve the stated problem?"
            className="w-full px-4 py-3 rounded-2xl bg-sand border border-forest/20 text-forest text-sm placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50 transition-all resize-y"
          />
          {clientErrors.proposedSolution && (
            <p className="text-xs text-red-600 mt-1 font-semibold">{clientErrors.proposedSolution}</p>
          )}
        </div>

        {/* Product Description */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="product-description" className="text-xs font-bold uppercase tracking-wider text-forest">
              Product Description <span className="text-red-600">*</span>
            </label>
            <span className="text-[11px] font-mono text-forest/50">{productDescription.length}/4000</span>
          </div>
          <textarea
            id="product-description"
            rows={3}
            maxLength={4000}
            value={productDescription}
            onChange={e => setProductDescription(e.target.value)}
            disabled={isPending}
            placeholder="A concise, comprehensive description of what you intend to build."
            className="w-full px-4 py-3 rounded-2xl bg-sand border border-forest/20 text-forest text-sm placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50 transition-all resize-y"
          />
          {clientErrors.productDescription && (
            <p className="text-xs text-red-600 mt-1 font-semibold">{clientErrors.productDescription}</p>
          )}
        </div>

        {/* Existing Alternatives */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-forest block mb-1.5">
            Existing Alternatives & Workarounds
          </label>
          <p className="text-[11px] text-forest/60 mb-2">
            How do target customers cope right now? (e.g. Spreadsheets, Notion, WhatsApp groups, manual review). Max 20 items.
          </p>
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
              disabled={isPending || existingAlternatives.length >= 20}
              placeholder="e.g. Google Sheets with custom scripts"
              className="flex-1 px-4 py-2.5 rounded-2xl bg-sand border border-forest/20 text-forest text-sm placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAddAlternative}
              disabled={isPending || !newAlternative.trim() || existingAlternatives.length >= 20}
              className="px-5 py-2.5 rounded-2xl bg-forest text-sand text-xs font-bold hover:bg-forest-light transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {clientErrors.alternatives && (
            <p className="text-xs text-red-600 mb-2 font-semibold">{clientErrors.alternatives}</p>
          )}

          {existingAlternatives.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl bg-sand border border-forest/10">
              {existingAlternatives.map((alt, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sand-light border border-forest/15 text-xs text-forest font-medium"
                >
                  {alt}
                  <button
                    type="button"
                    onClick={() => handleRemoveAlternative(index)}
                    className="text-forest/40 hover:text-red-600 transition-colors ml-0.5"
                    aria-label={`Remove alternative ${alt}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-forest/10 flex items-center justify-between">
          <button
            type="button"
            disabled={isPending}
            onClick={() => navigate('/projects')}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-forest/70 hover:text-forest hover:bg-forest/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="px-7 py-3 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-purple" />
                Creating Workspace...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-purple" />
                Create Project
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};
