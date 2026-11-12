import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
} from 'lucide-react';
import {
  useGetProject,
  useDeleteProject,
  useUpdateProject,
  type Project,
  type ProjectUpdate,
} from '../api/client';
import {
  useGetLatestProjectAnalysis,
  useGetAnalysisDetails,
} from '../api/analysisApi';
import type { FullAnalysis } from '../types/analysis';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingState, ErrorState } from '../components/common/StatusStates';
import { DeleteProjectModal } from '../components/projects/DeleteProjectModal';
import { EditProjectModal } from '../components/projects/EditProjectModal';
import { FutureModuleModal } from '../components/common/FutureModuleModal';
import { StartAnalysisModal } from '../components/analysis/StartAnalysisModal';
import { AnalysisReportView } from '../components/analysis/AnalysisReportView';
import { InteractiveRiskMatrix } from '../components/analysis/InteractiveRiskMatrix';
import { AssumptionExplorer } from '../components/analysis/AssumptionExplorer';
import { ResourceLibraryView } from '../components/resources/ResourceLibraryView';
import { CustomerDiscoveryView } from '../components/discovery/CustomerDiscoveryView';
import { ExperimentsView } from '../components/experiments/ExperimentsView';

type ProjectTab = 'overview' | 'analysis' | 'assumptions' | 'interviews' | 'experiments' | 'resources';

interface ProjectDetailsProps {
  defaultTab?: ProjectTab;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ defaultTab = 'overview' }) => {
  const { projectId, analysisId: routeAnalysisId } = useParams<{
    projectId: string;
    analysisId?: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ProjectTab>(defaultTab);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(routeAnalysisId || null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [futureModalModule, setFutureModalModule] = useState<string | null>(null);

  // Sync route param with state
  useEffect(() => {
    if (routeAnalysisId) {
      setSelectedAnalysisId(routeAnalysisId);
      setActiveTab('analysis');
    }
  }, [routeAnalysisId]);

  // Fetch verified project data
  const { data: projectData, isLoading: isProjectLoading, error: projectError, refetch: refetchProject } =
    useGetProject(projectId || '', {
      query: {
        enabled: Boolean(projectId),
      },
    });

  const project: Project | undefined = (projectData as any)?.data;

  // 1. Fetch latest analysis if no specific historical analysisId is selected
  const {
    data: latestAnalysisData,
    isLoading: isLatestLoading,
  } = useGetLatestProjectAnalysis(projectId || '', {
    query: {
      enabled: Boolean(projectId) && !selectedAnalysisId,
      retry: false, // 404 is normal before first analysis
    },
  });

  // 2. Fetch specific analysis if selected
  const {
    data: specificAnalysisData,
    isLoading: isSpecificLoading,
  } = useGetAnalysisDetails(selectedAnalysisId || '', {
    query: {
      enabled: Boolean(selectedAnalysisId),
    },
  });

  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject();
  const { mutateAsync: updateProject, isPending: isUpdating } = useUpdateProject();

  // Active analysis resolving either specific selection or latest
  const activeAnalysis: FullAnalysis | undefined = selectedAnalysisId
    ? (specificAnalysisData as any)?.data
    : (latestAnalysisData as any)?.data;

  const isAnalysisLoading = selectedAnalysisId ? isSpecificLoading : isLatestLoading;
  const hasAnalysis = Boolean(activeAnalysis);

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
      await queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditModalOpen(false);
    } catch (err: any) {
      setUpdateError(err?.message || 'Failed to update project.');
    }
  };

  const handleAnalysisCompleted = (newAnalysis: FullAnalysis) => {
    setIsAnalysisModalOpen(false);
    setSelectedAnalysisId(newAnalysis.id);
    setActiveTab('analysis');
  };

  const handleSelectHistoricalVersion = (analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    navigate(`/projects/${projectId}/analysis/${analysisId}`);
  };

  if (isProjectLoading) {
    return (
      <div className="py-16">
        <LoadingState message="Loading project workspace and validation record..." />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="py-12">
        <ErrorState
          status={(projectError as any)?.status || 404}
          code={(projectError as any)?.code || 'PROJECT_NOT_FOUND'}
          message="Project could not be found or you may not have access."
          onRetry={() => refetchProject()}
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

  const assumptionsCount = activeAnalysis?.assumptions?.length || 0;
  const maxRisk = activeAnalysis?.assumptions?.reduce(
    (max, a) => Math.max(max, a.riskScore || 0),
    0
  );

  const TABS: Array<{ id: ProjectTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'overview', label: 'Overview', icon: Layers },
    {
      id: 'analysis',
      label: 'Idea Analysis',
      icon: Sparkles,
      badge: hasAnalysis ? `v${activeAnalysis?.version}` : 'Phase 2',
    },
    {
      id: 'assumptions',
      label: 'Assumptions',
      icon: HelpCircle,
      badge: assumptionsCount > 0 ? `${assumptionsCount}` : 'Phase 2',
    },
    { id: 'interviews', label: 'Interviews', icon: Compass, badge: 'Live' },
    { id: 'experiments', label: 'Experiments', icon: FlaskConical, badge: 'Live' },
    { id: 'resources', label: 'Resources', icon: Boxes, badge: 'Live' },
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest/60 hover:text-forest transition-colors mb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple rounded-md cursor-pointer"
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
            {hasAnalysis && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Analysis Active (v
                  {activeAnalysis?.version})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 rounded-full text-xs font-bold bg-sand-light border border-forest/20 text-forest hover:bg-forest/5 hover:border-forest/40 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Project
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 rounded-full text-xs font-bold bg-sand-light border border-forest/20 text-forest hover:text-red-600 hover:border-red-300 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <button
            onClick={() => setIsAnalysisModalOpen(true)}
            className="px-5 py-2 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light hover:shadow-lg transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple" />
            {hasAnalysis ? 'Re-Run AI Analysis' : 'Start AI Analysis'}
          </button>
        </div>
      </div>

      {/* 2. PROJECT TAB NAVIGATION */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-forest/10 no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'analysis' && selectedAnalysisId) {
                  navigate(`/projects/${projectId}/analysis/${selectedAnalysisId}`);
                } else if (tab.id === 'overview') {
                  navigate(`/projects/${projectId}`);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
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
                    isActive
                      ? 'bg-purple/20 text-purple border border-purple/30'
                      : 'bg-forest/10 text-forest/50'
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

      {/* OVERVIEW TAB */}
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

            {/* AI Deconstruction Status Milestone */}
            {hasAnalysis ? (
              <div className="p-6 rounded-3xl bg-forest text-sand shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-purple text-xs font-bold uppercase tracking-widest font-mono">
                    <Sparkles className="w-3.5 h-3.5" /> AI Engine Analysis
                  </span>
                  <span className="text-[10px] font-mono bg-purple/20 text-purple border border-purple/30 px-2 py-0.5 rounded-full font-bold">
                    v{activeAnalysis?.version}
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold">Analysis Complete</h3>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-sand-light/10 border border-sand/15">
                    <span className="text-[10px] text-sand/60">Assumptions</span>
                    <p className="text-base font-bold text-sand mt-0.5">{assumptionsCount}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sand-light/10 border border-sand/15">
                    <span className="text-[10px] text-sand/60">Max Risk</span>
                    <p className="text-base font-bold text-purple mt-0.5">{maxRisk || 0}/25</p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className="w-full py-2.5 rounded-full text-xs font-bold bg-purple hover:bg-purple-hover text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    View Full Validation Report <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('assumptions')}
                    className="w-full py-2 rounded-full text-xs font-bold bg-sand-light/10 border border-sand/20 text-sand hover:bg-sand-light/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Open Risk Matrix & Hypotheses
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-forest text-sand shadow-lg space-y-3">
                <div className="flex items-center gap-2 text-purple text-xs font-bold uppercase tracking-widest font-mono">
                  <Sparkles className="w-4 h-4" /> Next Milestone
                </div>
                <h3 className="text-lg font-serif font-bold">
                  Run AI Idea Deconstruction
                </h3>
                <p className="text-xs text-sand/80 leading-relaxed font-sans">
                  Blindspot AI will extract 3–15 risky hypotheses across 10 structured categories and compute deterministic risk scores.
                </p>
                <button
                  onClick={() => setIsAnalysisModalOpen(true)}
                  className="w-full mt-2 py-2.5 rounded-full text-xs font-bold bg-purple hover:bg-purple-hover text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  Analyze Hypothesis <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IDEA ANALYSIS TAB */}
      {activeTab === 'analysis' && (
        <div>
          {isAnalysisLoading ? (
            <div className="py-16">
              <LoadingState message="Retrieving AI analysis and validation dimensions..." />
            </div>
          ) : hasAnalysis ? (
            <AnalysisReportView
              analysis={activeAnalysis!}
              onRunNewAnalysis={() => setIsAnalysisModalOpen(true)}
              onSelectHistoricalVersion={handleSelectHistoricalVersion}
              isLatestVersion={!selectedAnalysisId || selectedAnalysisId === latestAnalysisData?.data?.id}
            />
          ) : (
            <div className="p-8 sm:p-14 rounded-3xl bg-sand-light border border-dashed border-forest/25 text-center max-w-xl mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple/15 text-purple mx-auto flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple font-semibold">
                  Phase 02 AI Engine
                </span>
                <h3 className="text-2xl font-serif font-bold tracking-tight text-forest mt-1">
                  No Analysis Recorded Yet
                </h3>
                <p className="text-xs sm:text-sm text-forest/75 mt-2 max-w-md mx-auto leading-relaxed font-sans">
                  Run the 6-stage AI engine to deconstruct "{project.name}", extract unexamined premises across 10 risk dimensions, and isolate lethal assumptions.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsAnalysisModalOpen(true)}
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple" />
                  Initiate AI Idea Deconstruction
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ASSUMPTIONS TAB */}
      {activeTab === 'assumptions' && (
        <div>
          {isAnalysisLoading ? (
            <div className="py-16">
              <LoadingState message="Loading relational assumptions and risk matrix..." />
            </div>
          ) : hasAnalysis ? (
            <div className="space-y-8">
              <InteractiveRiskMatrix assumptions={activeAnalysis!.assumptions} />
              <div className="pt-4 border-t border-forest/15">
                <h3 className="text-xl font-serif font-bold text-forest mb-4">
                  Full Assumptions Registry & Evidence Life Cycle
                </h3>
                <AssumptionExplorer assumptions={activeAnalysis!.assumptions} />
              </div>
            </div>
          ) : (
            <div className="p-8 sm:p-14 rounded-3xl bg-sand-light border border-dashed border-forest/25 text-center max-w-xl mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-forest/5 text-purple mx-auto flex items-center justify-center">
                <HelpCircle className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple font-semibold">
                  Assumptions Registry
                </span>
                <h3 className="text-2xl font-serif font-bold tracking-tight text-forest mt-1">
                  Run Idea Analysis to Extract Assumptions
                </h3>
                <p className="text-xs sm:text-sm text-forest/75 mt-2 max-w-md mx-auto leading-relaxed font-sans">
                  The interactive 5×5 risk matrix and hypothesis explorer require a completed AI analysis run.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsAnalysisModalOpen(true)}
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple" />
                  Start AI Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. INTERVIEWS TAB (Customer Discovery & Feedback Engine) */}
      {activeTab === 'interviews' && project && (
        <CustomerDiscoveryView projectId={project.id} />
      )}

      {/* 5. EXPERIMENTS TAB (Falsification Tests & Outcomes) */}
      {activeTab === 'experiments' && project && (
        <ExperimentsView
          projectId={project.id}
          assumptions={activeAnalysis?.assumptions?.map((a) => ({
            id: a.id,
            assumption: a.title || a.description,
            riskScore: a.riskScore,
          }))}
        />
      )}

      {/* 6. RESOURCES TAB (Phase 03 Resource Intelligence) */}
      {activeTab === 'resources' && project && (
        <ResourceLibraryView projectId={project.id} />
      )}

      {/* Real AI Analysis Modal */}
      {isAnalysisModalOpen && project && (
        <StartAnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
          project={project}
          onAnalysisComplete={handleAnalysisCompleted}
        />
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
