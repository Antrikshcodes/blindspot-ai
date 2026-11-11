import { Link, Redirect, useParams, useSearch } from 'wouter';
import { ProjectFrame } from '@/components/project-frame';
import { ResourceWorkspace } from '@/components/resource-search/workspace';

export default function ResourcesPage() {
  const { id = '' } = useParams<{ id: string }>();
  const legacyLibrary = new URLSearchParams(useSearch()).get('collection') === 'saved';
  if (legacyLibrary) return <Redirect to={`/projects/${id}/library`} />;
  return <ProjectFrame id={id}>{(project) => (
    <>
      <ResourceWorkspace key={project.id} projectId={project.id} />
      <Link href={`/projects/${project.id}/library`} className="mt-6 inline-block text-xs text-muted-foreground underline" data-testid="link-open-resource-library">
        Open Resource Library
      </Link>
    </>
  )}</ProjectFrame>;
}
