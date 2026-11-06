import { useQueryClient } from '@tanstack/react-query';
import { useDeleteProject, getListProjectsQueryKey, type Project } from '@workspace/api-client-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { InlineError } from '@/components/kit';

export function DeleteProjectDialog({ project, open, onOpenChange, onDeleted }: { project: Project | null; open: boolean; onOpenChange: (o: boolean) => void; onDeleted?: () => void }) {
  const del = useDeleteProject();
  const qc = useQueryClient();
  const { toast } = useToast();
  if (!project) return null;
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) del.reset(); onOpenChange(o); }}>
      <AlertDialogContent className="bg-card">
        <AlertDialogHeader>
          <p className="eyebrow text-destructive">Irreversible</p>
          <AlertDialogTitle className="font-display text-2xl">Delete "{project.name}"?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>Deletion cascades to every record this project owns:</p>
              <ul className="list-disc space-y-0.5 pl-5 text-foreground/85">
                <li>All analysis versions and ranked hypotheses, with their reviewed outcomes</li>
                <li>Interviews, mapped questions and raw interview notes</li>
                <li>Evidence records and feedback summaries</li>
                <li>Experiments and their observed results</li>
                <li>Resource searches, recommendations and saved resources</li>
              </ul>
              <p className="text-muted-foreground">Shared global source records are kept. There is no undo.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <InlineError error={del.error} />
        <AlertDialogFooter>
          <AlertDialogCancel>Keep project</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={del.isPending}
            data-testid="button-confirm-delete"
            onClick={() =>
              del.mutate(
                { id: project.id },
                {
                  onSuccess: () => {
                    qc.removeQueries({ predicate: (q) => String(q.queryKey[0]).includes(project.id) });
                    qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
                    toast({ title: 'Project deleted', description: `${project.name} and all owned records were removed.` });
                    onOpenChange(false);
                    onDeleted?.();
                  },
                },
              )
            }
          >
            {del.isPending ? 'Deleting...' : 'Delete everything'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
