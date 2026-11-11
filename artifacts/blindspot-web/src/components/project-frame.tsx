import { Fragment, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useGetProject, getGetProjectQueryKey, type Project } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
import { ErrorPanel, EmptyState, RowsSkeleton } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { readError } from '@/lib/api';

const TABS = [
  { seg: '', label: 'Overview' },
  { seg: '/interviews', label: 'Customer Discovery', tid: 'interviews' },
  { seg: '/evidence', label: 'Evidence Intelligence', tid: 'evidence' },
  { seg: '/experiments', label: 'Experiments' },
  { seg: '/resources', label: 'Resource Intelligence', tid: 'resources' },
  { seg: '/library', label: 'Resource Library', tid: 'library' },
];

export function ProjectFrame({ id, children }: { id: string; children: (p: Project) => ReactNode }) {
  const [loc] = useLocation();
  const q = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const project = q.data?.data;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 md:px-8">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="link-back-projects">
        <ArrowLeft className="h-3 w-3" /> All projects
      </Link>
      {q.isLoading ? (
        <RowsSkeleton rows={5} />
      ) : q.isError ? (
        readError(q.error).status === 404 ? (
          <EmptyState mark="404" title="Project not found" body="It may have been deleted, along with everything it owned." action={<Button asChild><Link href="/">Back to projects</Link></Button>} />
        ) : (
          <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load project" />
        )
      ) : project ? (
        <>
          <header className="rise mb-5">
            <p className="eyebrow">Project</p>
            <h1 className="font-display text-3xl leading-tight md:text-4xl" data-testid="text-project-name">{project.name}</h1>
          </header>
          <nav aria-label="Project sections" className="sticky top-0 z-20 -mx-4 mb-6 border-b border-foreground/10 bg-background/90 px-4 backdrop-blur md:mx-0 md:px-0">
            <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
              {TABS.map((t) => {
                const href = `/projects/${id}${t.seg}`;
                const active = loc === href || (t.seg === '' && loc.startsWith(`/projects/${id}/analysis/`));
                return (
                  <li key={t.label}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`relative block whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      data-testid={`tab-${'tid' in t ? t.tid : t.label.toLowerCase()}`}
                    >
                      {t.label}
                      <span className={`absolute inset-x-3 -bottom-px h-0.5 origin-left bg-accent transition-transform duration-300 ${active ? 'scale-x-100' : 'scale-x-0'}`} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Fragment key={id}>{children(project)}</Fragment>
        </>
      ) : null}
    </div>
  );
}
