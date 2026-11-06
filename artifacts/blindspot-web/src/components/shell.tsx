import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ShieldAlert, FolderKanban } from 'lucide-react';

export function DevBanner() {
  return (
    <div role="note" className="border-b border-accent/30 bg-accent/10 px-4 py-1.5 text-[11.5px] text-foreground/85" data-testid="banner-dev-preview">
      <span className="inline-flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
        <span>
          <strong className="font-semibold">Development preview, not private yet.</strong> There is no sign-in; anyone with access to this environment can read these records. Production intentionally returns AUTH_NOT_READY until project authorization ships.
        </span>
      </span>
    </div>
  );
}

export function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" data-testid="link-home">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-foreground/95">
        <span className="h-3.5 w-3.5 rounded-full bg-sidebar transition-transform duration-300 group-hover:translate-x-1" />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
      </span>
      <span className="font-display text-lg italic tracking-tight">Blindspot</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  useEffect(() => {
    const section = loc === '/' ? 'Projects' : /^\/projects\/[^/]+$/.test(loc)
      ? 'Project overview' : ({
        interviews: 'Interviews', evidence: 'Evidence review', experiments: 'Experiments', resources: 'Resource intelligence',
      } as Record<string, string>)[loc.split('/').pop() ?? ''] ?? 'Page not found';
    document.title = `${section} · Blindspot AI`;
  }, [loc]);
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <DevBanner />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:w-56 md:flex-col md:items-stretch md:justify-start md:gap-8 md:px-5 md:py-6">
          <Brand />
          <nav aria-label="Primary" className="md:space-y-1">
            <Link
              href="/"
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent ${loc === '/' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/75'}`}
              data-testid="link-projects"
            >
              <FolderKanban className="h-4 w-4" aria-hidden /> Projects
            </Link>
          </nav>
          <p className="hidden text-[11px] leading-relaxed text-sidebar-foreground/55 md:mt-auto md:block">
            Blindspot argues with your idea. It records what people actually said, and never declares a market validated.
          </p>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
