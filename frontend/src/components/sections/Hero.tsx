import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Compass, ShieldAlert, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { MagneticButton } from '../common/MagneticButton';

interface HeroProps {
  onOpenIntake: () => void;
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenIntake, onExploreClick }) => {
  const shouldReduceMotion = useReducedMotion();
  const [activeLens, setActiveLens] = useState<'problem' | 'customer' | 'solution' | 'monetization'>('problem');

  const lenses = [
    {
      id: 'problem' as const,
      name: 'Problem Risk',
      icon: ShieldAlert,
      tag: 'Pain Severity',
      revealedAssumption: 'Assumption: Users actively search for an alternative and feel acute daily pain.',
      verdict: 'UNVERIFIED — Needs Past-Behavior Probe',
    },
    {
      id: 'customer' as const,
      name: 'Customer Risk',
      icon: Target,
      tag: 'Audience Access',
      revealedAssumption: 'Assumption: Decision makers can be identified and reached without expensive sales cycles.',
      verdict: 'HIGH UNCERTAINTY — Test Outreach Friction',
    },
    {
      id: 'solution' as const,
      name: 'Solution Risk',
      icon: Compass,
      tag: 'Root Cause',
      revealedAssumption: 'Assumption: The proposed software workflow actually replaces their manual spreadsheet habit.',
      verdict: 'LETHAL RISK — Observe Current Workaround',
    },
    {
      id: 'monetization' as const,
      name: 'Monetization Risk',
      icon: Sparkles,
      tag: 'Economic Viability',
      revealedAssumption: 'Assumption: Customers will pay sustainable unit economics rather than demanding freemium.',
      verdict: 'CRITICAL — Falsify with Pre-order Test',
    },
  ];

  const currentLens = lenses.find((l) => l.id === activeLens) || lenses[0];

  return (
    <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 px-6 md:px-10 overflow-hidden paper-texture">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Expressive Editorial Copy */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Tagline Badge */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest/8 border border-forest/15 text-forest text-xs font-mono font-medium tracking-wide mb-6 select-none"
            >
              <span className="w-2 h-2 rounded-full bg-purple animate-pulse" />
              <span>Evidence-Led Product Validation</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-forest leading-[1.08] mb-6"
            >
              Your next big idea <br />
              <span className="font-serif italic font-normal text-forest">has a</span>{' '}
              <span className="relative inline-block">
                blindspot.
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-purple"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 9 C50 2, 150 2, 198 9"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </motion.h1>

            {/* Supporting Subtitle */}
            <motion.p
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg sm:text-xl text-forest/80 font-sans max-w-xl leading-relaxed mb-10"
            >
              Discover hidden assumptions, challenge risky decisions, and validate what matters before you build.
            </motion.p>

            {/* CTA Group: Strategic Electric Purple + Forest Outline */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4 w-full sm:w-auto"
            >
              <MagneticButton
                variant="purple"
                size="lg"
                onClick={onOpenIntake}
                className="w-full sm:w-auto shadow-md"
              >
                Analyze Your Idea
                <ArrowRight className="w-4 h-4 ml-1" />
              </MagneticButton>

              <MagneticButton
                variant="outline"
                size="lg"
                onClick={onExploreClick}
                className="w-full sm:w-auto"
              >
                Explore How It Works
              </MagneticButton>
            </motion.div>

            {/* Micro Trust Indicators (Truthful & Honest) */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-10 pt-6 border-t border-forest/10 flex flex-wrap items-center gap-6 text-xs font-mono text-forest/70"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" /> The Mom Test Logic
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" /> Zero Confirmation Bias
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" /> 10-Domain Risk Matrix
              </span>
            </motion.div>
          </div>

          {/* Right Column: Custom Interactive Idea Deconstruction Visual */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-sand-light/95 border-2 border-forest/20 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
            >
              {/* Visual Header */}
              <div className="flex items-center justify-between pb-4 border-b border-forest/10 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-forest" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-forest">
                    Interactive Risk Deconstruction
                  </span>
                </div>
                <span className="text-[11px] font-mono text-purple font-bold bg-purple/10 px-2.5 py-0.5 rounded-full">
                  Live Simulator
                </span>
              </div>

              {/* Central Radar Visual */}
              <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center mb-6">
                
                {/* Concentric Calibration Circles */}
                <div className="absolute inset-0 rounded-full border border-forest/15 animate-spin-slow pointer-events-none" />
                <div className="absolute inset-8 rounded-full border border-dashed border-forest/25 pointer-events-none" />
                <div className="absolute inset-16 rounded-full border border-forest/20 pointer-events-none" />

                {/* Central Target Reticle */}
                <div className="relative z-10 w-24 h-24 rounded-full bg-sand border-2 border-forest flex flex-col items-center justify-center text-center p-2 shadow-inner">
                  <span className="text-[10px] font-mono uppercase text-forest/60">Target</span>
                  <span className="text-xs font-extrabold text-forest uppercase">Core Idea</span>
                  {/* The Uncovered Blindspot Pin */}
                  <motion.div
                    key={activeLens}
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1] }}
                    transition={{ duration: 0.4 }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-purple flex items-center justify-center text-white shadow-md"
                  >
                    <span className="text-[10px] font-mono font-bold">!</span>
                  </motion.div>
                </div>

                {/* 4 Interactive Orbiting Risk Lenses */}
                {lenses.map((lens, index) => {
                  const angles = [0, 90, 180, 270];
                  const angle = angles[index];
                  const radians = (angle * Math.PI) / 180;
                  const radius = 110;
                  const x = Math.cos(radians) * radius;
                  const y = Math.sin(radians) * radius;
                  const isSelected = activeLens === lens.id;

                  const Icon = lens.icon;

                  return (
                    <button
                      key={lens.id}
                      type="button"
                      onClick={() => setActiveLens(lens.id)}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute z-20 w-11 h-11 -ml-5.5 -mt-5.5 rounded-full flex items-center justify-center transition-all cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-purple ${
                        isSelected
                          ? 'bg-purple text-white shadow-lg scale-110 ring-4 ring-purple/20'
                          : 'bg-sand border-2 border-forest/40 text-forest hover:border-forest hover:scale-105'
                      }`}
                      aria-label={`Select ${lens.name}`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Lens Inspector Card */}
              <motion.div
                key={activeLens}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 rounded-2xl bg-sand border border-forest/15"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                    {currentLens.name}
                  </span>
                  <span className="font-mono text-purple font-semibold text-[11px] bg-purple/10 px-2 py-0.5 rounded-md">
                    {currentLens.tag}
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium text-forest/90 leading-snug mb-2">
                  {currentLens.revealedAssumption}
                </p>
                <div className="text-[11px] font-mono font-bold text-forest/70 uppercase">
                  Verdict: <span className="text-purple">{currentLens.verdict}</span>
                </div>
              </motion.div>

              <div className="mt-3 text-center">
                <span className="text-[11px] font-mono text-forest/50">
                  Click any lens node above to inspect hidden assumptions
                </span>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};
