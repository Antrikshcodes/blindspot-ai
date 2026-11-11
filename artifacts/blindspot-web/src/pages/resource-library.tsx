import { useParams } from 'wouter';
import { ProjectFrame } from '@/components/project-frame';
import { ResourceLibrary } from '@/components/resource-library';

export default function ResourceLibraryPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(p) => <ResourceLibrary key={p.id} projectId={p.id} />}</ProjectFrame>;
}
