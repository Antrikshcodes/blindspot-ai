import { useParams } from 'wouter';
import { ProjectFrame } from '@/components/project-frame';
import { RecommendationWorkspace } from '@/components/resource-recommendations/workspace';

export default function RecommendationsPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(project) => <RecommendationWorkspace key={project.id} project={project} />}</ProjectFrame>;
}
