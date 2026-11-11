import { useRef, useState, type FormEvent } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useCreateInterview, type Interview } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Counter, InlineError } from '@/components/kit';
import { useFade } from './motion';

export type ReportContext = { analysisId: string; version: number };

export function CreateInterviewDialog({
  projectId,
  open,
  onOpenChange,
  reportContext,
  latestAnalysisId,
  latestAnalysisVersion,
  alias,
  setAlias,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reportContext: ReportContext | null;
  latestAnalysisId?: string;
  latestAnalysisVersion?: number;
  alias: string;
  setAlias: (v: string) => void;
  onCreated: (iv: Interview) => void;
}) {
  const inFlight = useRef(false);
  const [touched, setTouched] = useState(false);
  const mutationKey = ['discovery', 'create-interview', projectId];
  const pending = useIsMutating({ mutationKey }) > 0;
  const m = useCreateInterview({ mutation: {
    mutationKey,
    onSuccess: (res) => {
      setAlias('');
      setTouched(false);
      onCreated(res.data);
      onOpenChange(false);
    },
    onSettled: () => { inFlight.current = false; },
  } });
  const fade = useFade(6);
  const trimmed = alias.trim();
  const invalid = !trimmed ? 'An alias is required.' : trimmed.length > 150 ? 'Keep the alias to 150 characters or fewer.' : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid || inFlight.current || pending) return;
    inFlight.current = true;
    m.mutate({ id: projectId, data: { participant: trimmed } });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && (pending || inFlight.current)) return;
        if (!o) m.reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto border-[#1F3D2B]/25 bg-[#F6F1E6] p-0">
        <motion.form {...fade} onSubmit={submit} className="space-y-5 p-6" noValidate>
          <DialogHeader className="text-left">
            <p className="eyebrow text-[#1F3D2B]/70">New discovery session</p>
            <DialogTitle className="font-display text-2xl text-[#1F3D2B]">Who are you talking to?</DialogTitle>
            <DialogDescription className="text-[#1F3D2B]/75">
              The session stores only a participant alias. Questions are generated from the project's latest analysis and mapped to its riskiest hypotheses.
            </DialogDescription>
            {reportContext && (
              <p role="status" className="rounded border border-[#1F3D2B]/20 bg-[#E8DCC4]/60 p-2 text-xs text-[#1F3D2B]/80" data-testid="report-session-context">
                {latestAnalysisId && reportContext.analysisId !== latestAnalysisId
                  ? `This is report v${reportContext.version}; sessions use the latest analysis${latestAnalysisVersion ? ` (v${latestAnalysisVersion})` : ''}. Questions from this older snapshot are not sent to session creation.`
                  : latestAnalysisId
                    ? `This is the latest report (v${reportContext.version}). The session uses the latest analysis; report questions are not submitted as a custom script.`
                    : 'The session is created from the project’s latest analysis. Report questions are not submitted as a custom script.'}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="alias" className="text-[#1F3D2B]">
                Participant alias <span aria-hidden className="text-[#8B5CF6]">*</span>
                <span className="sr-only">(required)</span>
              </Label>
              <Counter value={trimmed.length} max={150} />
            </div>
            <Input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onBlur={() => setTouched(true)}
              disabled={pending}
              maxLength={160}
              required
              aria-invalid={touched && !!invalid}
              aria-describedby="alias-help alias-error"
              placeholder="Clinic ops lead, Leeds"
              className="border-[#1F3D2B]/25 bg-[#FBF8F1] focus-visible:ring-[#1F3D2B]/40"
              data-testid="input-participant"
            />
            <p id="alias-help" className="text-[11px] text-[#1F3D2B]/65">
              Role and context, not a name. Avoid emails or sensitive details.
            </p>
            {touched && invalid && (
              <p id="alias-error" role="alert" className="text-xs text-destructive" data-testid="error-participant">
                {invalid}
              </p>
            )}
          </div>
          <InlineError error={m.error} />
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)} data-testid="button-cancel-interview">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!!invalid || pending}
              className="bg-[#1F3D2B] text-[#F6F1E6] hover:bg-[#1F3D2B]/90"
              data-testid="button-create-interview"
            >
              {pending ? 'Generating questions...' : 'Create interview'}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
