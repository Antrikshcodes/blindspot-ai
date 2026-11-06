import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FileText, Search, MessageSquare, Compass, ArrowRight, Check, ChevronRight } from 'lucide-react';
import { SectionReveal } from '../common/SectionReveal';
import { TiltCard } from '../common/TiltCard';

export const HowItWorks: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  const journeySteps = [
    { label: 'IDEA', short: 'Concept', index: 0 },
    { label: 'ASSUMPTIONS', short: 'Risk Matrix', index: 1 },
    { label: 'EVIDENCE', short: 'The Mom Test', index: 2 },
    { label: 'EXPERIMENT', short: 'Next Action', index: 3 },
  ];

  const steps = [
    {
      step: '01',
      phaseName: 'IDEA',
      title: 'Describe Your Idea',
      action: 'Structured Context Intake',
      description:
        'Submit your core product concept, target audience profile, and the acute pain point you aim to address. No pitch decks or inflated TAM figures required — just raw, unembellished problem framing.',
      icon: FileText,
      detailBadge: 'Input Understanding',
      mockData: {
        headline: 'Concept Intake Protocol',
        items: [
          'Deconstructs target personas & proposed user workflows',
          'Flags missing market context & untested boundary conditions',
          'Freezes submission as an immutable historical reference version',
        ],
      },
    },
    {
      step: '02',
      phaseName: 'ASSUMPTIONS',
      title: 'Discover Hidden Assumptions',
      action: '10-Domain Risk Matrix',
      description:
        'The engine deconstructs your idea across 10 critical risk domains. Assumptions are scored using deterministic math (Impact × Uncertainty) to isolate truly lethal venture threats.',
      icon: Search,
      detailBadge: 'Lethal Risk Isolation',
      mockData: {
        headline: 'Priority = Impact (1–5) × Uncertainty (1–5)',
        items: [
          'Score 20–25: CRITICAL (Must be invalidated first)',
          'Score 13–19: HIGH | 7–12: MEDIUM | 1–6: LOW',
          'Systemic blindspots automatically linked to exact premises',
        ],
      },
    },
    {
      step: '03',
      phaseName: 'EVIDENCE',
      title: 'Validate With Real Evidence',
      action: 'The Mom Test Question Generator',
      description:
        'Receive 8–12 non-leading interview questions focused entirely on past behaviors and current expenditures. Later, ingest qualitative interview transcripts to detect contradictions and confirm facts.',
      icon: MessageSquare,
      detailBadge: 'Evidence Ingestion',
      mockData: {
        headline: 'Non-Leading Behavioral Probes',
        items: [
          'Probes actual past purchases over speculative intent',
          'Extracts verbatim quotes mapped directly to assumptions',
          'Flags contradictions between conflicting user interviews',
        ],
      },
    },
    {
      step: '04',
      phaseName: 'EXPERIMENT',
      title: 'Decide What to Test Next',
      action: 'Concrete Falsification Experiments',
      description:
        'Stop guessing your next sprint. Get prescribed rapid, low-fidelity falsification experiments (smoke tests, concierge tests, landing page walk-throughs) with quantitative pass/fail thresholds.',
      icon: Compass,
      detailBadge: 'Actionable Next Step',
      mockData: {
        headline: 'Hypothesis Falsification Plan',
        items: [
          'Specifies test format (e.g. Concierge MVP, Pre-sale, Fake Door)',
          'Establishes quantitative failure threshold upfront',
          'Curates relevant open-source repos, models & datasets',
        ],
      },
    },
  ];

  const current = steps[activeStep];
  const CurrentIcon = current.icon;

  return (
    <section id="how-it-works" className="py-20 sm:py-24 md:py-32 px-4 sm:px-6 md:px-10 bg-sand-light border-t border-forest/15 relative overflow-hidden">
      {/* Background Section Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-forest/[0.02] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <SectionReveal>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest/5 border border-forest/15 text-xs font-mono font-bold uppercase tracking-wider text-forest/75 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple" />
              The Validation Protocol
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-forest leading-[1.15] mb-4">
              How Blindspot AI works.
            </h2>
            <p className="text-sm sm:text-base text-forest/80 leading-relaxed">
              From unexamined concept to battle-tested evidence through four disciplined, systematic phases.
            </p>
          </div>
        </SectionReveal>

        {/* Visual Journey Rail: IDEA ──► ASSUMPTIONS ──► EVIDENCE ──► EXPERIMENT */}
        <SectionReveal delay={0.1}>
          <div className="mb-10 sm:mb-14 p-3 sm:p-5 md:p-6 rounded-3xl bg-sand border border-forest/20 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 relative">
              {/* Connecting line behind items on desktop */}
              <div className="hidden sm:block absolute left-8 right-8 top-1/2 -translate-y-1/2 h-[2px] bg-forest/10 -z-0" />
              
              {journeySteps.map((step, idx) => {
                const isActive = activeStep === idx;
                const isPassed = activeStep > idx;

                return (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`relative z-10 flex-1 flex sm:flex-col items-center justify-between sm:justify-center p-3 sm:py-4 sm:px-3 rounded-2xl transition-all cursor-pointer select-none text-left sm:text-center group min-h-[48px] focus-visible:outline-2 focus-visible:outline-purple ${
                      isActive
                        ? 'bg-forest text-sand shadow-md'
                        : 'bg-sand hover:bg-forest/5 text-forest border border-forest/10'
                    }`}
                    aria-label={`Step ${idx + 1}: ${step.label}`}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-center sm:flex-col gap-3 sm:gap-1.5">
                      {/* Node Indicator */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-transform ${
                          isActive
                            ? 'bg-purple text-white ring-4 ring-purple/20 scale-110'
                            : isPassed
                            ? 'bg-forest/20 text-forest'
                            : 'bg-forest/10 text-forest/60'
                        }`}
                      >
                        {isPassed ? '✓' : `0${idx + 1}`}
                      </div>

                      {/* Phase Label */}
                      <span className={`text-xs font-mono font-bold tracking-wider ${isActive ? 'text-sand' : 'text-forest'}`}>
                        {step.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 sm:hidden">
                      <span className="text-[10px] font-mono text-forest/50">{step.short}</span>
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-sand' : 'text-forest/40'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionReveal>

        {/* Interactive Stepper Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left Column: Interactive Step Cards */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {steps.map((item, idx) => {
              const isSelected = activeStep === idx;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none text-forest focus-visible:outline-2 focus-visible:outline-purple min-h-[48px] ${
                    isSelected
                      ? 'bg-sand border-forest shadow-md sm:translate-x-1'
                      : 'bg-transparent border-forest/15 hover:bg-sand/60 hover:border-forest/40'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold tracking-wider text-forest/50">
                      STAGE {item.step} // {item.phaseName}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                        isSelected ? 'bg-purple/15 text-purple' : 'bg-forest/5 text-forest/70'
                      }`}
                    >
                      {item.action}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-forest tracking-tight">
                    {item.title}
                  </h3>
                </button>
              );
            })}
          </div>

          {/* Right Column: Dynamic Stage Visualizer with TiltCard */}
          <div className="lg:col-span-7">
            <TiltCard maxTilt={3}>
              <div className="bg-sand border-2 border-forest/20 rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg min-h-[400px] flex flex-col justify-between relative overflow-hidden">
                
                {/* Visual Ambient Reticle in background */}
                <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full border border-forest/10 border-dashed pointer-events-none" />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.step}
                    initial={shouldReduceMotion ? {} : { opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, x: -14 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-5 sm:space-y-6"
                  >
                    {/* Top Stage Header */}
                    <div className="flex flex-wrap items-center justify-between border-b border-forest/15 pb-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-forest text-sand flex items-center justify-center shadow-xs shrink-0">
                          <CurrentIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest/60">
                            Stage {current.step} of 04 // {current.phaseName}
                          </span>
                          <h4 className="text-xl sm:text-2xl font-extrabold text-forest tracking-tight">
                            {current.title}
                          </h4>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-purple font-semibold bg-purple/10 px-3 py-1 rounded-full border border-purple/20">
                        {current.detailBadge}
                      </span>
                    </div>

                    {/* Stage Narrative Description */}
                    <p className="text-sm sm:text-base text-forest/80 leading-relaxed font-sans">
                      {current.description}
                    </p>

                    {/* Detailed Protocol Output Preview */}
                    <div className="p-4 sm:p-6 rounded-2xl bg-sand-light border border-forest/15 space-y-3">
                      <div className="text-xs font-mono font-bold uppercase tracking-wider text-forest/70">
                        {current.mockData.headline}
                      </div>
                      <ul className="space-y-2 sm:space-y-2.5">
                        {current.mockData.items.map((point) => (
                          <li key={point} className="flex items-start gap-2.5 text-xs sm:text-sm text-forest font-medium">
                            <Check className="w-4 h-4 text-purple mt-0.5 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Bottom Quick Switcher */}
                <div className="pt-5 sm:pt-6 border-t border-forest/10 flex items-center justify-between mt-6">
                  <span className="text-xs font-mono text-forest/60">
                    Step {activeStep + 1} / {steps.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-2 text-xs font-mono rounded-lg border border-forest/20 text-forest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-forest/5 cursor-pointer min-h-[36px]"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={activeStep === steps.length - 1}
                      onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                      className="px-3.5 py-2 text-xs font-mono rounded-lg bg-forest text-sand disabled:opacity-30 disabled:cursor-not-allowed hover:bg-forest-dark cursor-pointer flex items-center gap-1.5 font-semibold min-h-[36px]"
                    >
                      Next <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            </TiltCard>
          </div>

        </div>

      </div>
    </section>
  );
};
