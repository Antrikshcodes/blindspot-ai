import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Pencil, Plus, Trash2, ArrowUpRight } from 'lucide-react';
import { useListProjects, getListProjectsQueryKey, type Project } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorPanel, Pager, RowsSkeleton } from '@/components/kit';
import { ProjectFormDialog } from '@/components/project-form';
import { DeleteProjectDialog } from '@/components/delete-project';
import { PAGE_SIZE, fmtDay } from '@/lib/api';

export default function ProjectsPage() {
  const [page, setPage] = useState(1);
  const params = { page, limit: PAGE_SIZE };
  const q = useListProjects(params, { query: { queryKey: getListProjectsQueryKey(params) } });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [, navigate] = useLocation();
  const items = q.data?.data.items ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 md:px-8">
      <header className="rise mb-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="font-display text-4xl leading-[1.05] md:text-6xl">
            Ideas on <em className="text-accent">trial</em>.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Each project is a claim under cross-examination: ranked hypotheses, interview notes, cited evidence and experiments. Nothing here certifies demand.
          </p>
        </div>
        <Button size="lg" onClick={() => setCreating(true)} data-testid="button-new-project">
          <Plus className="mr-1.5 h-4 w-4" /> New project
        </Button>
      </header>

      {q.isLoading ? (
        <RowsSkeleton rows={5} />
      ) : q.isError ? (
        <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load projects" />
      ) : items.length === 0 ? (
        page > 1 ? (
          <EmptyState mark="END" title="No more projects" body="This page is empty." action={<Button variant="outline" onClick={() => setPage(1)}>First page</Button>} />
        ) : (
          <EmptyState mark="00" title="No ideas on file" body="Start with the idea you are most attached to. It is usually the one hiding the riskiest assumption." action={<Button onClick={() => setCreating(true)}>Create the first project</Button>} />
        )
      ) : (
        <ol className="divide-y divide-foreground/10 border-y border-foreground/10">
          {items.map((p, i) => (
            <li key={p.id} className="rise group grid gap-2 py-4 md:grid-cols-[3rem_1fr_auto] md:items-start md:gap-4" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-project-${p.id}`}>
              <span className="hidden font-mono text-xs text-muted-foreground md:block">{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</span>
              <Link href={`/projects/${p.id}`} className="min-w-0" data-testid={`link-project-${p.id}`}>
                <h2 className="flex items-center gap-1.5 font-display text-2xl leading-tight transition-colors group-hover:text-accent">
                  {p.name} <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.problemStatement}</p>
                <p className="mt-1.5 font-mono text-[10.5px] text-muted-foreground">
                  For {p.targetAudience.slice(0, 80)}{p.targetAudience.length > 80 ? '...' : ''} / {p.existingAlternatives.length} alternatives / updated {fmtDay(p.updatedAt)}
                </p>
              </Link>
              <div className="flex gap-1 md:opacity-60 md:transition-opacity md:group-hover:opacity-100">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} data-testid={`button-edit-${p.id}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`} data-testid={`button-delete-${p.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Pager page={page} setPage={setPage} count={items.length} limit={PAGE_SIZE} label="Projects pagination" />

      <ProjectFormDialog open={creating} onOpenChange={setCreating} onCreated={(p) => navigate(`/projects/${p.id}`)} />
      <ProjectFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} project={editing ?? undefined} />
      <DeleteProjectDialog project={deleting} open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} />
    </div>
  );
}
