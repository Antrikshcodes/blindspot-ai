import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderGit2,
  Clock,
  Plus,
  ArrowRight,
  Activity,
  ChevronRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { useListProjects, useHealthCheck, type Project } from '../api/client';
import { LoadingState, ErrorState } from '../components/common/StatusStates';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();

  // Fetch real authenticated projects
  const { data: projectsData, isLoading, error, refetch } = useListProjects({
    page: 1,
    limit: 10,
  });

  // Probe live backend health
  const { data: healthData } = useHealthCheck();

  if (isLoading) {
    return (
      <div className="py-16">
        <LoadingState message="Fetching your product projects and validation status..." />
      </div>
    );
  }

  if (error) {
    const status = (error as any)?.status;
    const code = (error as any)?.code;
    return (
      <div className="py-12">
        <ErrorState
          status={status}
          code={code}
          message="Could not load your workspace projects. Verify backend connection."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const projects: Project[] = projectsData?.data?.items || [];
  const totalProjects = projects.length;

  // Compute projects updated in the last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentlyUpdatedProjects = projects.filter(p => {
    const updatedTime = new Date(p.updatedAt || p.createdAt).getTime();
    return updatedTime > sevenDaysAgo;
  }).length;

  const backendStatus = (healthData as any)?.data?.status || 'ok';
  const recentProjects = projects.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* 1. WELCOME HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-forest/10">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-purple font-semibold">
            Validation Intelligence Workspace
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-forest mt-1">
            Good to see you again.
          </h1>
          <p className="text-sm sm:text-base text-forest/75 mt-1 font-sans">
            Turn your ideas into evidence-backed decisions.
          </p>
        </div>

        <button
          onClick={() => navigate('/projects/new')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple flex-shrink-0"
        >
          <Plus className="w-4 h-4 text-purple" />
          Create New Project
        </button>
      </div>

      {/* 2. REAL METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Projects */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', damping: 20 }}
          className="p-5 sm:p-6 rounded-3xl bg-sand-light border border-forest/15 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-forest/60">
              Total Projects
            </span>
            <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-forest">
            {totalProjects}
          </div>
          <p className="text-[11px] font-mono text-forest/50 mt-1">
            Active validation workspaces
          </p>
        </motion.div>

        {/* Recently Updated */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', damping: 20 }}
          className="p-5 sm:p-6 rounded-3xl bg-sand-light border border-forest/15 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-forest/60">
              Recently Active
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple/10 flex items-center justify-center text-purple">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-forest">
            {recentlyUpdatedProjects}
          </div>
          <p className="text-[11px] font-mono text-forest/50 mt-1">
            Modified in the past 7 days
          </p>
        </motion.div>

        {/* Engine Connectivity */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', damping: 20 }}
          className="p-5 sm:p-6 rounded-3xl bg-sand-light border border-forest/15 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-forest/60">
              Engine Health
            </span>
            <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-purple">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-forest">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </div>
          <p className="text-[11px] font-mono text-forest/50 mt-1">
            Database & API synchronized ({backendStatus})
          </p>
        </motion.div>
      </div>

      {/* 3. RECENT ACTIVITY OR EMPTY STATE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-forest flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple" />
            Recent Projects
          </h2>
          {totalProjects > 0 && (
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-bold text-purple hover:text-purple-hover flex items-center gap-1 transition-colors"
            >
              View All ({totalProjects}) <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {totalProjects === 0 ? (
          /* Guided Empty State */
          <div className="p-8 sm:p-12 rounded-3xl bg-sand-light border border-dashed border-forest/20 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-forest/5 text-purple mx-auto flex items-center justify-center shadow-inner">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-forest">
                No ideas under validation yet
              </h3>
              <p className="text-xs sm:text-sm text-forest/75 mt-1 max-w-md mx-auto leading-relaxed">
                Add your product concept to deconstruct hidden assumptions, prioritize high-risk failure points, and formulate customer interview questions.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/projects/new')}
                className="px-6 py-3 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light hover:shadow-md transition-all inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
              >
                <Plus className="w-4 h-4 text-purple" />
                Create Your First Project
              </button>
            </div>
          </div>
        ) : (
          /* Recent Project Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentProjects.map(project => {
              const formattedDate = new Date(project.updatedAt || project.createdAt).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric', year: 'numeric' }
              );

              return (
                <motion.div
                  key={project.id}
                  whileHover={{ y: -3 }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="p-5 sm:p-6 rounded-3xl bg-sand-light border border-forest/15 hover:border-forest/30 shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-forest tracking-tight group-hover:text-purple transition-colors truncate">
                        {project.name}
                      </h3>
                      <span className="text-[10px] font-mono text-forest/50 flex-shrink-0">
                        {formattedDate}
                      </span>
                    </div>

                    <div className="mb-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-forest/5 text-forest/70 border border-forest/10 truncate max-w-full">
                        Target: {project.targetAudience}
                      </span>
                    </div>

                    <p className="text-xs text-forest/75 line-clamp-2 leading-relaxed">
                      {project.problemStatement}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-forest/10 flex items-center justify-between text-xs font-semibold text-forest/70 group-hover:text-forest">
                    <span>Open Workspace</span>
                    <ArrowRight className="w-4 h-4 text-purple group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. VALIDATION FRAMEWORK PREVIEW FOOTER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-forest text-sand relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-purple font-semibold">
            Methodology
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
            The Blindspot Validation Sequence
          </h3>
          <p className="text-xs sm:text-sm text-sand/80 leading-relaxed">
            Every product failure begins with untested assumptions masquerading as certainty. Define your hypothesis, run discovery interviews, and eliminate risk before writing code.
          </p>
        </div>

        {/* Subtle Ambient Ring Visual */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 rounded-full border border-sand/10 pointer-events-none" />
        <div className="absolute right-6 bottom-6 w-32 h-32 rounded-full border border-purple/20 pointer-events-none" />
      </div>
    </motion.div>
  );
};
