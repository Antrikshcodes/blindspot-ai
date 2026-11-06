import React, { useState } from 'react';
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

export const App: React.FC = () => {
  // Synchronously initialize intro state from sessionStorage to eliminate any transition flash
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
        {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
      </AnimatePresence>

      {/* Main Website Structure */}
      <div
        className={`flex flex-col min-h-screen transition-opacity duration-700 ease-out ${
          showIntro ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Navigation Bar */}
        <Navbar onOpenIntake={handleOpenIntake} />

        {/* Main Content Area */}
        <main id="main-content" className="flex-grow">
          {/* Section B: Hero with Interactive Idea Deconstruction Visual */}
          <Hero onOpenIntake={handleOpenIntake} onExploreClick={handleExploreClick} />

          {/* Section C: The Problem */}
          <TheProblem />

          {/* Section D: How Blindspot AI Works */}
          <HowItWorks />

          {/* Section E: Platform Capabilities */}
          <Capabilities />

          {/* Section F: Final CTA */}
          <FinalCTA onOpenIntake={handleOpenIntake} />
        </main>

        {/* Section G: Footer */}
        <Footer />
      </div>

      {/* Phase 1 Interactive Feature Preview Modal */}
      <FutureFeatureModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default App;
