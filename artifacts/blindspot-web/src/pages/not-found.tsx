import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center px-6">
      <p className="eyebrow">404 / no record</p>
      <h1 className="font-display text-5xl leading-tight">This page is a <em className="text-accent">blind spot</em>.</h1>
      <p className="mt-3 text-sm text-muted-foreground">Nothing lives at this address. It may have been deleted along with its project.</p>
      <Button asChild className="mt-6 w-fit"><Link href="/">Back to projects</Link></Button>
    </div>
  );
}
