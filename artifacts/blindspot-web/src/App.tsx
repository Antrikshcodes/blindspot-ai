import { useEffect, useMemo, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AppShell } from '@/components/shell';
import { Brand } from '@/components/shell';
import ProjectsPage from '@/pages/projects';
import OverviewPage from '@/pages/overview';
import InterviewsPage from '@/pages/interviews';
import EvidencePage from '@/pages/evidence';
import ExperimentsPage from '@/pages/experiments';
import ResourcesPage from '@/pages/resources';
import ResourceLibraryPage from '@/pages/resource-library';
import RecommendationsPage from '@/pages/recommendations';
import AnalysisReportPage from '@/pages/analysis-report';
import { readError } from '@/lib/api';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY for Blindspot sign-in.');
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#b84e31',
    colorForeground: '#142a3a',
    colorMutedForeground: '#596b75',
    colorDanger: '#9e3027',
    colorBackground: '#fbfaf6',
    colorInput: '#ffffff',
    colorInputForeground: '#142a3a',
    colorNeutral: '#142a3a',
    fontFamily: 'Instrument Sans, system-ui, sans-serif',
    borderRadius: '0.375rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfaf6] rounded-xl w-[440px] max-w-full overflow-hidden border border-[#d9d2c3]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#142a3a] font-semibold',
    headerSubtitle: 'text-[#596b75]',
    socialButtonsBlockButtonText: 'text-[#142a3a]',
    formFieldLabel: 'text-[#142a3a]',
    footerActionLink: 'text-[#963e27] hover:text-[#762f1d]',
    footerActionText: 'text-[#596b75]',
    dividerText: 'text-[#596b75]',
    identityPreviewEditButton: 'text-[#963e27]',
    formFieldSuccessText: 'text-[#23634d]',
    alertText: 'text-[#8b261d]',
    logoBox: 'flex items-center justify-center',
    logoImage: 'max-h-10 w-auto',
    socialButtonsBlockButton: 'border border-[#d9d2c3] bg-white',
    formButtonPrimary: 'bg-[#172b3a] text-white hover:bg-[#263f51]',
    formFieldInput: 'border-[#c9c1b2] bg-white text-[#142a3a]',
    footerAction: 'text-[#596b75]',
    dividerLine: 'bg-[#d9d2c3]',
    alert: 'border border-[#ead1cc] bg-[#fff2ef]',
    otpCodeFieldInput: 'border-[#c9c1b2] bg-white text-[#142a3a]',
    formFieldRow: 'text-[#142a3a]',
    main: 'text-[#142a3a]',
  },
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (n, e) => {
          const s = readError(e).status;
          return (s === undefined || s >= 500) && s !== 503 && n < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

function PrivateWorkspace() {
  return (
    <AppShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={ProjectsPage} />
          <Route path="/projects/:id" component={OverviewPage} />
          <Route path="/projects/:id/analysis/:analysisId" component={AnalysisReportPage} />
          <Route path="/projects/:id/interviews" component={InterviewsPage} />
          <Route path="/projects/:id/evidence" component={EvidencePage} />
          <Route path="/projects/:id/experiments" component={ExperimentsPage} />
          <Route path="/projects/:id/resources" component={ResourcesPage} />
          <Route path="/projects/:id/library" component={ResourceLibraryPage} />
          <Route path="/projects/:id/recommendations" component={RecommendationsPage} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function PublicLanding() {
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-6 text-foreground md:px-10 md:py-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Brand />
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary">
            Sign in
          </Link>
          <Link href="/sign-up" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Create account
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 py-20 md:grid-cols-[1.1fr_.9fr] md:items-center md:py-28">
        <div className="rise">
          <p className="eyebrow">Evidence before conviction</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
            Test the idea. Find what you might be missing.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Blindspot helps you examine risky assumptions with interview evidence, measurable experiments, and source-backed research.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-up" className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Create your account
            </Link>
            <Link href="/sign-in" className="rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-secondary">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Your projects are private to your account.</p>
        </div>
        <div className="rise rounded-xl border border-card-border bg-card p-6 shadow-sm md:p-8">
          <p className="eyebrow">A more useful question</p>
          <p className="mt-5 font-display text-3xl leading-snug">“What evidence would change my mind?”</p>
          <div className="mt-7 space-y-3 border-t border-border pt-5 text-sm">
            <p><span className="mr-2 font-mono text-accent">01</span> Write down the riskiest assumptions.</p>
            <p><span className="mr-2 font-mono text-accent">02</span> Compare them with what people actually said.</p>
            <p><span className="mr-2 font-mono text-accent">03</span> Decide what to test next.</p>
          </div>
        </div>
      </section>
      <footer className="mx-auto max-w-6xl border-t border-border pt-4 text-xs text-muted-foreground">
        Blindspot records evidence and supports your judgment. It does not certify a market as validated.
      </footer>
    </main>
  );
}

function AuthPage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-4 py-8">
      <Link href="/" aria-label="Blindspot home">
        <img
          src={`${window.location.origin}${basePath}/logo.svg`}
          alt="Blindspot"
          className="h-10 w-auto"
        />
      </Link>
      {children}
    </main>
  );
}

function SignInPage() {
  return (
    <AuthPage>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthPage>
  );
}

function SignUpPage() {
  return (
    <AuthPage>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthPage>
  );
}

function Router() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  // A new cache is created for every authenticated identity. Late mutations
  // from an old account can only update their abandoned cache, never the new one.
  const queryClient = useMemo(createQueryClient, [userId]);

  useEffect(() => () => queryClient.clear(), [queryClient]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 text-sm text-muted-foreground" role="status">
        Loading secure sign-in…
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/" component={() => isSignedIn ? <PrivateWorkspace /> : <PublicLanding />} />
          <Route component={() => isSignedIn ? <PrivateWorkspace /> : <Redirect to="/" />} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back',
            subtitle: 'Sign in to access your Blindspot projects.',
          },
        },
        signUp: {
          start: {
            title: 'Create your Blindspot account',
            subtitle: 'Keep your project research private to your account.',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Router />
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkRoutes />
    </WouterRouter>
  );
}

export default App;
