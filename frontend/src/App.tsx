import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { IntroOverlay } from './components/intro/IntroOverlay';
import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/sections/Hero';
import { TheProblem } from './components/sections/TheProblem';
import { HowItWorks } from './components/sections/HowItWorks';
import { Capabilities } from './components/sections/Capabilities';
import { FinalCTA } from './components/sections/FinalCTA';
import { Footer } from './components/layout/Footer';
import { FutureFeatureModal } from './components/common/FutureFeatureModal';
import { InteractiveBackground } from './components/common/InteractiveBackground';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardPlaceholder } from './routes/DashboardPlaceholder';
import { GenericProtectedPlaceholder } from './routes/GenericProtectedPlaceholder';

export const LandingPage: React.FC<{
  showIntro: boolean;
  onIntroComplete: () => void;
  onOpenIntake: () => void;
  onNavigateDashboard: () => void;
}> = ({ showIntro, onIntroComplete, onOpenIntake, onNavigateDashboard }) => {
  const handleExploreClick = () => {
    const el = document.querySelector('#how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-sand text-forest relative flex flex-col selection:bg-purple/20 selection:text-forest overflow-x-hidden">
      {/* Dynamic Ambient Calibrated Grid & Parallax Geometry */}
      <InteractiveBackground />

      {/* 3-Second Cinematic Intro Animation Overlay */}
      <AnimatePresence mode="wait">
        {showIntro && <IntroOverlay onComplete={onIntroComplete} />}
      </AnimatePresence>

      {/* Main Website Structure */}
      <div
        className={`flex flex-col min-h-screen transition-opacity duration-700 ease-out ${
          showIntro ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Navigation Bar with Clerk Authentication States */}
        <Navbar onOpenIntake={onOpenIntake} onNavigateDashboard={onNavigateDashboard} />

        {/* Main Content Area */}
        <main id="main-content" className="flex-grow">
          {/* Section B: Hero with Interactive Idea Deconstruction Visual */}
          <Hero onOpenIntake={onOpenIntake} onExploreClick={handleExploreClick} />

          {/* Section C: The Problem */}
          <TheProblem />

          {/* Section D: How Blindspot AI Works */}
          <HowItWorks />

          {/* Section E: Platform Capabilities */}
          <Capabilities />

          {/* Section F: Final CTA */}
          <FinalCTA onOpenIntake={onOpenIntake} />
        </main>

        {/* Section G: Footer */}
        <Footer />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const navigate = useNavigate();

  // Synchronously initialize intro state from sessionStorage to eliminate transition flash
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('blindspot_has_seen_intro') !== 'true';
    } catch {
      return true;
    }
  });

  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleOpenIntake = () => {
    setModalOpen(true);
  };

  const handleNavigateDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <>
      <Routes>
        {/* Public Landing Page */}
        <Route
          path="/"
          element={
            <LandingPage
              showIntro={showIntro}
              onIntroComplete={handleIntroComplete}
              onOpenIntake={handleOpenIntake}
              onNavigateDashboard={handleNavigateDashboard}
            />
          }
        />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPlaceholder />
            </ProtectedRoute>
          }
        />

        {/* Protected Projects Route */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <GenericProtectedPlaceholder viewName="Projects Collection" />
            </ProtectedRoute>
          }
        />

        {/* Protected Project Detail Route */}
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <GenericProtectedPlaceholder viewName="Project Workspace" />
            </ProtectedRoute>
          }
        />

        {/* Catch-all fallback redirects to landing page */}
        <Route
          path="*"
          element={
            <LandingPage
              showIntro={showIntro}
              onIntroComplete={handleIntroComplete}
              onOpenIntake={handleOpenIntake}
              onNavigateDashboard={handleNavigateDashboard}
            />
          }
        />
      </Routes>

      {/* Phase 1 Interactive Feature Preview Modal */}
      <FutureFeatureModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default App;
