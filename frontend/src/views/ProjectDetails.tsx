import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  Sparkles,
  Layers,
  Compass,
  FlaskConical,
  Boxes,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  useGetProject,
  useDeleteProject,
  useUpdateProject,
  type Project,
  type ProjectUpdate,
} from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingState, ErrorState } from '../components/common/StatusStates';
import { DeleteProjectModal } from '../components/projects/DeleteProjectModal';
import { EditProjectModal } from '../components/projects/EditProjectModal';
import { FutureModuleModal } from '../components/common/FutureModuleModal';

type ProjectTab = 'overview' | 'analysis' | 'assumptions' | 'interviews' | 'experiments' | 'resources';

export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [futureModalModule, setFutureModalModule] = useState<string | null>(null);

  // Fetch verified project data
  const { data, isLoading, error, refetch } = useGetProject(projectId || '', {
    query: {
      enabled: Boolean(projectId),
    },
  });

  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject();
  const { mutateAsync: updateProject, isPending: isUpdating } = useUpdateProject();

  const project: Project | undefined = (data as any)?.data;

  const handleDeleteConfirm = async () => {
    if (!project) return;
    setDeleteError(null);
    try {
      await deleteProject({ id: project.id });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      navigate('/projects');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete project from the database.');
    }
  };

  const handleUpdateSave = async (id: string, updateData: ProjectUpdate) => {
    setUpdateError(null);
    try {
      await updateProject({ id, data: updateData });
      // Invalidate project details and list queries
      await queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditModalOpen(false);
    } catch (err: any) {
      setUpdateError(err?.message || 'Failed to update project.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-16">
        <LoadingState message="Loading project workspace and validation record..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="py-12">
        <ErrorState
          status={(error as any)?.status || 404}
          code={(error as any)?.code || 'PROJECT_NOT_FOUND'}
          message="Project could not be found or you may not have access."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const createdDate = new Date(project.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const updatedDate = new Date(project.updatedAt || project.createdAt).toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );

  const TABS: Array<{ id: ProjectTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'analysis', label: 'Idea Analysis', icon: Sparkles, badge: 'Phase 2' },
    { id: 'assumptions', label: 'Assumptions', icon: HelpCircle, badge: 'Phase 2' },
    { id: 'interviews', label: 'Interviews', icon: Compass, badge: 'Phase 3' },
    { id: 'experiments', label: 'Experiments', icon: FlaskConical, badge: 'Phase 3' },
    { id: 'resources', label: 'Resources', icon: Boxes, badge: 'Phase 3' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-12"
    >
      {/* 1. TOP HEADER & WORKSPACE META */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-forest/10">
        <div>
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest/60 hover:text-forest transition-colors mb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple rounded-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Projects
          </button>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-forest">
            {project.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-forest/60 mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-forest/40" /> Created: {createdDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple" /> Last active: {updatedDate}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 rounded-full text-xs font-bold bg-sand-light border border-forest/20 text-forest hover:bg-forest/5 hover:border-forest/40 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Project
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 rounded-full text-xs font-bold bg-sand-light border border-forest/20 text-forest hover:text-red-600 hover:border-red-300 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <button
            onClick={() => setFutureModalModule('Idea Analysis')}
            className="px-5 py-2 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light hover:shadow-lg transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple" />
            Start AI Analysis
          </button>
        </div>
      </div>

      {/* 2. PROJECT TAB NAVIGATION */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-forest/10 no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all relative whitespace-nowrap ${
                isActive
                  ? 'bg-forest text-sand shadow-sm'
                  : 'text-forest/70 hover:text-forest hover:bg-forest/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple' : 'text-forest/50'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                    isActive ? 'bg-purple/20 text-purple border border-purple/30' : 'bg-forest/10 text-forest/50'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Problem & Solution Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* The Problem Statement */}
            <div className="p-6 sm:p-8 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-forest/60">
                  Core Problem Hypothesis
                </span>
                <span className="text-[10px] font-mono text-purple bg-purple/10 px-2 py-0.5 rounded-full">
                  Primary Validation Target
                </span>
              </div>
              <blockquote className="text-base sm:text-lg font-serif text-forest leading-relaxed italic border-l-2 border-purple pl-4">
                "{project.problemStatement}"
              </blockquote>
            </div>

            {/* Proposed Solution */}
            <div className="p-6 sm:p-8 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-forest/60">
                Proposed Solution & Value Mechanism
              </span>
              <p className="text-sm text-forest/85 leading-relaxed font-sans">
                {project.proposedSolution}
              </p>
            </div>

            {/* Product Description */}
            <div className="p-6 sm:p-8 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-forest/60">
                Product Specification
              </span>
              <p className="text-sm text-forest/80 leading-relaxed font-sans">
                {project.productDescription}
              </p>
            </div>
          </div>

          {/* Sidebar Metadata Column (1 Col) */}
          <div className="space-y-6">
            {/* Target Audience Profile */}
            <div className="p-6 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-forest/60">
                Ideal Customer Segment
              </span>
              <p className="text-sm font-semibold text-forest leading-snug">
                {project.targetAudience}
              </p>
              <div className="p-3 rounded-2xl bg-sand border border-forest/10 text-xs text-forest/70">
                Customer discovery interviews will be targeted strictly against this segment.
              </div>
            </div>

            {/* Existing Alternatives */}
            <div className="p-6 rounded-3xl bg-sand-light border border-forest/15 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-forest/60">
                  Known Alternatives
                </span>
                <span className="text-[10px] font-mono text-forest/50">
                  {project.existingAlternatives?.length || 0} recorded
                </span>
              </div>

              {project.existingAlternatives && project.existingAlternatives.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {project.existingAlternatives.map((alt, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-xl bg-sand border border-forest/15 text-xs text-forest font-medium"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-forest/50 italic">
                  No existing alternatives specified yet. Use Edit Project to add competitors.
                </p>
              )}
            </div>

            {/* AI Deconstruction Readiness */}
            <div className="p-6 rounded-3xl bg-forest text-sand shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-purple text-xs font-bold uppercase tracking-widest font-mono">
                <Sparkles className="w-4 h-4" /> Next Milestone
              </div>
              <h3 className="text-lg font-serif font-bold">
                Run AI Idea Deconstruction
              </h3>
              <p className="text-xs text-sand/80 leading-relaxed">
                Blindspot AI will extract 3–15 risky hypotheses across Problem, Customer, and Solution dimensions and rank them by impact.
              </p>
              <button
                onClick={() => setFutureModalModule('Idea Analysis')}
                className="w-full mt-2 py-2.5 rounded-full text-xs font-bold bg-purple hover:bg-purple-hover text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                Analyze Hypothesis <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FUTURE MODULES PLACEHOLDER VIEWS */}
      {activeTab !== 'overview' && (
        <div className="p-8 sm:p-14 rounded-3xl bg-sand-light border border-dashed border-forest/20 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-forest/5 text-purple mx-auto flex items-center justify-center">
            {activeTab === 'analysis' && <Sparkles className="w-7 h-7" />}
            {activeTab === 'assumptions' && <HelpCircle className="w-7 h-7" />}
            {activeTab === 'interviews' && <Compass className="w-7 h-7" />}
            {activeTab === 'experiments' && <FlaskConical className="w-7 h-7" />}
            {activeTab === 'resources' && <Boxes className="w-7 h-7" />}
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-purple font-semibold">
              {activeTab === 'analysis' || activeTab === 'assumptions' ? 'Phase 02 Architecture' : 'Phase 03 Architecture'}
            </span>
            <h3 className="text-2xl font-serif font-bold tracking-tight text-forest mt-1">
              {TABS.find(t => t.id === activeTab)?.label}
            </h3>
            <p className="text-xs sm:text-sm text-forest/75 mt-2 max-w-md mx-auto leading-relaxed">
              {activeTab === 'analysis' &&
                'Automated multi-dimensional assumption extraction and risk scoring for this project.'}
              {activeTab === 'assumptions' &&
                'Matrix of prioritized problem, customer, and solution hypotheses awaiting evidence collection.'}
              {activeTab === 'interviews' &&
                'Non-leading customer interview question generator, note transcript mapping, and contradiction engine.'}
              {activeTab === 'experiments' &&
                'Next validation experiment recommendations and evidence pass/fail thresholds.'}
              {activeTab === 'resources' &&
                'Relevant GitHub repos, Hugging Face models, and public datasets matched to this problem statement.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveTab('overview')}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all"
            >
              Return to Project Overview
            </button>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {isDeleteModalOpen && (
        <DeleteProjectModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteError(null);
          }}
          projectName={project.name}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setUpdateError(null);
          }}
          project={project}
          onSave={handleUpdateSave}
          isUpdating={isUpdating}
          error={updateError}
        />
      )}

      {/* Future Roadmap Dialog */}
      <FutureModuleModal
        isOpen={Boolean(futureModalModule)}
        onClose={() => setFutureModalModule(null)}
        moduleName={futureModalModule || ''}
      />
    </motion.div>
  );
};
