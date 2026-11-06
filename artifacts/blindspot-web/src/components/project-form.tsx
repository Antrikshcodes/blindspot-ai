import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import {
  useCreateProject,
  useUpdateProject,
  getListProjectsQueryKey,
  getGetProjectQueryKey,
  type Project,
  type ProjectUpdate,
} from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Counter, InlineError } from '@/components/kit';

type Fields = {
  name: string;
  productDescription: string;
  problemStatement: string;
  targetAudience: string;
  proposedSolution: string;
  existingAlternatives: string[];
};

const LIMITS = { name: 100, productDescription: 4000, problemStatement: 4000, targetAudience: 1000, proposedSolution: 4000 } as const;
const empty: Fields = { name: '', productDescription: '', problemStatement: '', targetAudience: '', proposedSolution: '', existingAlternatives: [] };

const TEXT_FIELDS: { key: keyof typeof LIMITS; label: string; hint: string; area?: boolean; min?: number }[] = [
  { key: 'name', label: 'Idea name', hint: 'A working title.' },
  { key: 'problemStatement', label: 'Problem statement', hint: 'A specific, recurring problem. At least 20 characters.', area: true, min: 20 },
  { key: 'targetAudience', label: 'Target audience', hint: 'A concrete segment, not "everyone".', area: true, min: 5 },
  { key: 'productDescription', label: 'Product description', hint: 'What the proposed product does.', area: true },
  { key: 'proposedSolution', label: 'Proposed solution', hint: 'The approach you believe solves it.', area: true },
];

export function ProjectFormDialog({ open, onOpenChange, project, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; project?: Project; onCreated?: (p: Project) => void }) {
  const [f, setF] = useState<Fields>(empty);
  const [touched, setTouched] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateProject();
  const update = useUpdateProject();
  const mut = project ? update : create;

  useEffect(() => {
    if (open) {
      setTouched(false);
      create.reset();
      update.reset();
      setF(project ? { ...project, existingAlternatives: [...project.existingAlternatives] } : empty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  const alts = f.existingAlternatives;
  const errors: Partial<Record<keyof Fields, string>> = {};
  for (const t of TEXT_FIELDS) {
    const v = f[t.key].trim();
    if (!v) errors[t.key] = 'Required';
    else if (v.length > LIMITS[t.key]) errors[t.key] = `Max ${LIMITS[t.key]} characters`;
    else if (t.min && v.length < t.min) errors[t.key] = `At least ${t.min} characters`;
  }
  if (alts.length > 20) errors.existingAlternatives = 'At most 20 alternatives';
  else if (alts.some((a) => !a.trim() || a.length > 300)) errors.existingAlternatives = 'Each alternative needs 1 to 300 characters';
  const valid = Object.keys(errors).length === 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const clean: Fields = {
      name: f.name.trim(),
      productDescription: f.productDescription.trim(),
      problemStatement: f.problemStatement.trim(),
      targetAudience: f.targetAudience.trim(),
      proposedSolution: f.proposedSolution.trim(),
      existingAlternatives: alts.map((a) => a.trim()),
    };
    if (project) {
      const diff: ProjectUpdate = {};
      (Object.keys(LIMITS) as (keyof typeof LIMITS)[]).forEach((k) => {
        if (clean[k] !== project[k]) diff[k] = clean[k];
      });
      if (JSON.stringify(clean.existingAlternatives) !== JSON.stringify(project.existingAlternatives)) diff.existingAlternatives = clean.existingAlternatives;
      if (Object.keys(diff).length === 0) {
        onOpenChange(false);
        return;
      }
      update.mutate(
        { id: project.id, data: diff },
        {
          onSuccess: (res) => {
            qc.setQueryData(getGetProjectQueryKey(project.id), res);
            qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
            toast({ title: 'Project saved', description: `${Object.keys(diff).length} field(s) updated.` });
            onOpenChange(false);
          },
        },
      );
    } else {
      create.mutate(
        { data: clean },
        {
          onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
            toast({ title: 'Project created', description: res.data.name });
            onOpenChange(false);
            onCreated?.(res.data);
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto bg-card">
        <DialogHeader>
          <p className="eyebrow">{project ? 'Edit record' : 'New record'}</p>
          <DialogTitle className="font-display text-2xl">{project ? 'Revise the idea' : 'State the idea plainly'}</DialogTitle>
          <DialogDescription>Write what you believe, not what you hope. The analysis will try to find where it breaks.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {TEXT_FIELDS.map((t) => {
            const id = `pf-${t.key}`;
            const err = touched ? errors[t.key] : undefined;
            const C = t.area ? Textarea : Input;
            return (
              <div key={t.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor={id}>{t.label}</Label>
                  <Counter value={f[t.key].length} max={LIMITS[t.key]} min={t.min} />
                </div>
                <C
                  id={id}
                  value={f[t.key]}
                  onChange={(e: { target: { value: string } }) => setF({ ...f, [t.key]: e.target.value })}
                  aria-invalid={!!err}
                  aria-describedby={`${id}-hint`}
                  className={t.area ? 'min-h-[72px] bg-background' : 'bg-background'}
                  data-testid={`input-${t.key}`}
                />
                <p id={`${id}-hint`} className={`text-[11px] ${err ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {err ?? t.hint}
                </p>
              </div>
            );
          })}
          <fieldset className="space-y-2">
            <legend className="flex w-full items-baseline justify-between text-sm font-medium">
              Existing alternatives <span className="font-mono text-[10px] text-muted-foreground">{alts.length} / 20, 300 chars each</span>
            </legend>
            <p className="text-[11px] text-muted-foreground">What people use today instead, including spreadsheets and doing nothing.</p>
            {alts.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Alternative ${i + 1}`}
                  value={a}
                  maxLength={300}
                  onChange={(e) => setF({ ...f, existingAlternatives: alts.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="bg-background"
                  data-testid={`input-alternative-${i}`}
                />
                <Button type="button" size="icon" variant="ghost" aria-label={`Remove alternative ${i + 1}`} onClick={() => setF({ ...f, existingAlternatives: alts.filter((_, j) => j !== i) })}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {touched && errors.existingAlternatives && <p className="text-[11px] text-destructive">{errors.existingAlternatives}</p>}
            <Button type="button" size="sm" variant="outline" disabled={alts.length >= 20} onClick={() => setF({ ...f, existingAlternatives: [...alts, ''] })} data-testid="button-add-alternative">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add alternative
            </Button>
          </fieldset>
          <InlineError error={mut.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending} data-testid="button-save-project">
              {mut.isPending ? 'Saving...' : project ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
