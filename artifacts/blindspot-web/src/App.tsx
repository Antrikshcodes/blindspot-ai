import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AppShell } from '@/components/shell';
import ProjectsPage from '@/pages/projects';
import OverviewPage from '@/pages/overview';
import InterviewsPage from '@/pages/interviews';
import EvidencePage from '@/pages/evidence';
import ExperimentsPage from '@/pages/experiments';
import ResourcesPage from '@/pages/resources';
import ResourceLibraryPage from '@/pages/resource-library';
import AnalysisReportPage from '@/pages/analysis-report';
import { readError } from '@/lib/api';

const queryClient = new QueryClient({
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

function Router() {
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
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
