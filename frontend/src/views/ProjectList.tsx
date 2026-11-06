import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderGit2,
  Plus,
  Search,
  ArrowRight,
  Trash2,
  Edit3,
  Calendar,
  Inbox,
  X,
} from 'lucide-react';
import {
  useListProjects,
  useDeleteProject,
  useUpdateProject,
  type Project,
  type ProjectUpdate,
} from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorState } from '../components/common/StatusStates';
import { DeleteProjectModal } from '../components/projects/DeleteProjectModal';
import { EditProjectModal } from '../components/projects/EditProjectModal';

export const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectForDelete, setSelectedProjectForDelete] = useState<Project | null>(null);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Real React Query hook for listing projects
  const { data, isLoading, error, refetch } = useListProjects({
    page,
    limit: 50,
  });

  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject();
  const { mutateAsync: updateProject, isPending: isUpdating } = useUpdateProject();

  const allProjects: Project[] = data?.data?.items || [];

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProjects;
    return allProjects.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.problemStatement.toLowerCase().includes(q) ||
        p.targetAudience.toLowerCase().includes(q) ||
        p.productDescription.toLowerCase().includes(q)
    );
  }, [allProjects, searchQuery]);

  const handleDeleteConfirm = async () => {
    if (!selectedProjectForDelete) return;
    setDeleteError(null);
    try {
      await deleteProject({ id: selectedProjectForDelete.id });
      // Invalidate projects cache
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setSelectedProjectForDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete project. Please try again.');
    }
  };

  const handleUpdateSave = async (id: string, updateData: ProjectUpdate) => {
    setUpdateError(null);
    try {
      await updateProject({ id, data: updateData });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setSelectedProjectForEdit(null);
    } catch (err: any) {
      setUpdateError(err?.message || 'Failed to update project. Please check input.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-forest/5 rounded-2xl w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-sand-light border border-forest/10 space-y-4 animate-pulse"
            >
              <div className="h-5 bg-forest/10 rounded-xl w-3/4" />
              <div className="h-3 bg-forest/10 rounded-xl w-1/2" />
              <div className="h-12 bg-forest/5 rounded-xl w-full" />
              <div className="h-4 bg-forest/10 rounded-xl w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          status={(error as any)?.status}
          code={(error as any)?.code}
          message="Unable to load projects from the database."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-forest/10">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-purple font-semibold">
            Workspace Directory
          </span>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-forest mt-1">
            My Projects
          </h1>
          <p className="text-xs sm:text-sm text-forest/75 mt-0.5 font-sans">
            Manage your idea validation hypotheses and customer findings.
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

      {/* 2. SEARCH BAR & STATS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, audience, or problem..."
            className="w-full pl-9 pr-9 py-2 rounded-2xl bg-sand-light border border-forest/15 text-xs text-forest placeholder:text-forest/40 focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs font-mono text-forest/60 self-end sm:self-center">
          Showing {filteredProjects.length} of {allProjects.length} projects
        </span>
      </div>

      {/* 3. PROJECT GRID OR EMPTY STATE */}
      {allProjects.length === 0 ? (
        /* Zero Projects Empty State */
        <div className="p-12 sm:p-16 rounded-3xl bg-sand-light border border-dashed border-forest/20 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-forest/5 text-purple mx-auto flex items-center justify-center">
            <FolderGit2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-forest">
              No projects created yet
            </h3>
            <p className="text-xs sm:text-sm text-forest/70 mt-1 max-w-sm mx-auto leading-relaxed">
              Define your first product concept to uncover blindspots, formulate interview questions, and test risky assumptions.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/projects/new')}
              className="px-6 py-3 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light hover:shadow-md transition-all inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
            >
              <Plus className="w-4 h-4 text-purple" />
              Create Project Now
            </button>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Zero Search Results State */
        <div className="p-10 rounded-3xl bg-sand-light border border-forest/10 text-center max-w-md mx-auto space-y-3">
          <Inbox className="w-8 h-8 text-forest/40 mx-auto" />
          <h3 className="text-base font-bold text-forest">No matching projects found</h3>
          <p className="text-xs text-forest/70">
            No projects matched your search query "{searchQuery}".
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-purple hover:underline"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Staggered Project Cards */
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredProjects.map((project, index) => {
            const formattedDate = new Date(project.updatedAt || project.createdAt).toLocaleDateString(
              undefined,
              { month: 'short', day: 'numeric', year: 'numeric' }
            );

            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                whileHover={{ y: -4 }}
                className="p-6 rounded-3xl bg-sand-light border border-forest/15 hover:border-forest/35 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <div>
                  {/* Top Bar: Name & Actions */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="text-lg font-bold text-forest tracking-tight group-hover:text-purple transition-colors cursor-pointer truncate"
                      title={project.name}
                    >
                      {project.name}
                    </h3>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedProjectForEdit(project);
                        }}
                        className="p-1.5 rounded-lg text-forest/40 hover:text-forest hover:bg-forest/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
                        title="Edit project"
                        aria-label={`Edit ${project.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedProjectForDelete(project);
                        }}
                        className="p-1.5 rounded-lg text-forest/40 hover:text-red-600 hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        title="Delete project"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Audience Badge */}
                  <div className="mb-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-forest/5 text-forest/75 border border-forest/10 truncate max-w-full">
                      Audience: {project.targetAudience}
                    </span>
                  </div>

                  {/* Problem Statement Snippet */}
                  <p className="text-xs text-forest/80 line-clamp-3 leading-relaxed mb-4">
                    {project.problemStatement}
                  </p>

                  {/* Existing Alternatives Tags if available */}
                  {project.existingAlternatives && project.existingAlternatives.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {project.existingAlternatives.slice(0, 3).map((alt, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-sand border border-forest/10 text-forest/60 truncate max-w-[140px]"
                        >
                          vs {alt}
                        </span>
                      ))}
                      {project.existingAlternatives.length > 3 && (
                        <span className="text-[9px] font-mono text-forest/40 self-center">
                          +{project.existingAlternatives.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-4 border-t border-forest/10 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-forest/50 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-forest/40" />
                    {formattedDate}
                  </span>

                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-purple transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple rounded-md px-1"
                  >
                    Workspace
                    <ArrowRight className="w-3.5 h-3.5 text-purple group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Delete Project Modal */}
      {selectedProjectForDelete && (
        <DeleteProjectModal
          isOpen={Boolean(selectedProjectForDelete)}
          onClose={() => {
            setSelectedProjectForDelete(null);
            setDeleteError(null);
          }}
          projectName={selectedProjectForDelete.name}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

      {/* Edit Project Modal */}
      {selectedProjectForEdit && (
        <EditProjectModal
          isOpen={Boolean(selectedProjectForEdit)}
          onClose={() => {
            setSelectedProjectForEdit(null);
            setUpdateError(null);
          }}
          project={selectedProjectForEdit}
          onSave={handleUpdateSave}
          isUpdating={isUpdating}
          error={updateError}
        />
      )}
    </div>
  );
};
