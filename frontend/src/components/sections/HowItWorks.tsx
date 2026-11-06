import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FileText, Search, MessageSquare, Compass, ArrowRight, Check } from 'lucide-react';
import { SectionReveal } from '../common/SectionReveal';

export const HowItWorks: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: '01',
      title: 'Describe Your Idea',
      action: 'Structured Context Intake',
      description:
        'Submit your core product concept, target audience profile, and the problem you are solving. No pitch decks or financial projections required — just raw, honest problem framing.',
      icon: FileText,
      detailBadge: 'Input Understanding',
      mockData: {
        headline: 'Concept Intake Protocol',
        items: [
          'Deconstructs target personas & proposed workflow',
          'Flags missing market context & boundary conditions',
          'Freezes submission as an immutable historical version',
        ],
      },
    },
    {
      step: '02',
      title: 'Discover Hidden Assumptions',
      action: '10-Domain Risk Matrix',
      description:
        'The engine deconstructs your idea across 10 critical risk domains. Assumptions are scored using deterministic math (Impact × Uncertainty) to isolate lethal venture risks.',
      icon: Search,
      detailBadge: 'Lethal Risk Isolation',
      mockData: {
        headline: 'Priority = Impact (1–5) × Uncertainty (1–5)',
        items: [
          '20–25: CRITICAL (Must be invalidated first)',
          '13–19: HIGH | 7–12: MEDIUM | 1–6: LOW',
          'Identifies systemic blindspots linked to exact claims',
        ],
      },
    },
    {
      step: '03',
      title: 'Validate With Real Feedback',
      action: 'The Mom Test Question Generator',
      description:
        'Receive 8–12 non-leading interview questions focused entirely on past behaviors and current expenditures. Later, paste qualitative interview transcripts to detect contradictions and confirm facts.',
      icon: MessageSquare,
      detailBadge: 'Evidence Ingestion',
      mockData: {
        headline: 'Non-Leading Behavioral Probes',
        items: [
          'Probes actual past purchases over speculative intent',
          'Extracts verbatim quotes mapped to assumptions',
          'Flags contradictions between conflicting user interviews',
        ],
      },
    },
    {
      step: '04',
      title: 'Decide What to Test Next',
      action: 'Concrete Falsification Experiments',
      description:
        'Stop guessing your next step. Get prescribed rapid, low-fidelity falsification experiments (smoke tests, concierge tests, landing page walk-throughs) with clear pass/fail thresholds.',
      icon: Compass,
      detailBadge: 'Actionable Next Step',
      mockData: {
        headline: 'Hypothesis Falsification Plan',
        items: [
          'Specifies test format (e.g. Concierge MVP, Pre-sale)',
          'Establishes quantitative failure threshold upfront',
          'Curates relevant open-source repos, models & datasets',
        ],
      },
    },
  ];

  const current = steps[activeStep];
  const CurrentIcon = current.icon;

  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 md:px-10 bg-sand-light border-t border-forest/15 paper-texture">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <SectionReveal>
          <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
            <span className="inline-block text-xs font-mono font-bold uppercase tracking-wider text-forest/70 mb-3">
              The Validation Protocol
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-forest leading-[1.15] mb-4">
              How Blindspot AI works.
            </h2>
            <p className="text-base text-forest/80 leading-relaxed">
              From unexamined concept to battle-tested evidence in four disciplined stages.
            </p>
          </div>
        </SectionReveal>

        {/* Interactive Stepper Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Step Selectors */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {steps.map((item, idx) => {
              const isSelected = activeStep === idx;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`text-left p-5 rounded-2xl border transition-all cursor-pointer select-none text-forest focus-visible:outline-2 focus-visible:outline-purple ${
                    isSelected
                      ? 'bg-sand border-forest shadow-md'
                      : 'bg-transparent border-forest/15 hover:bg-sand/60 hover:border-forest/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold tracking-wider text-forest/50">
                      STAGE {item.step}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                        isSelected ? 'bg-purple/15 text-purple' : 'bg-forest/5 text-forest/70'
                      }`}
                    >
                      {item.action}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-forest tracking-tight">
                    {item.title}
                  </h3>
                </button>
              );
            })}
          </div>

          {/* Right Column: Dynamic Stage Visualizer */}
          <div className="lg:col-span-7">
            <div className="bg-sand border-2 border-forest/20 rounded-3xl p-8 md:p-10 shadow-lg min-h-[420px] flex flex-col justify-between relative overflow-hidden">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.step}
                  initial={shouldReduceMotion ? {} : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  {/* Top Stage Header */}
                  <div className="flex items-center justify-between border-b border-forest/15 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-forest text-sand flex items-center justify-center shadow-sm">
                        <CurrentIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest/60">
                          Stage {current.step} of 04
                        </span>
                        <h4 className="text-2xl font-extrabold text-forest tracking-tight">
                          {current.title}
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-purple font-semibold bg-purple/10 px-3 py-1 rounded-full">
                      {current.detailBadge}
                    </span>
                  </div>

                  {/* Stage Narrative Description */}
                  <p className="text-base text-forest/80 leading-relaxed font-sans">
                    {current.description}
                  </p>

                  {/* Detailed Protocol Output Preview */}
                  <div className="p-6 rounded-2xl bg-sand-light border border-forest/15 space-y-3">
                    <div className="text-xs font-mono font-bold uppercase tracking-wider text-forest/70">
                      {current.mockData.headline}
                    </div>
                    <ul className="space-y-2">
                      {current.mockData.items.map((point) => (
                        <li key={point} className="flex items-start gap-2.5 text-xs md:text-sm text-forest font-medium">
                          <Check className="w-4 h-4 text-purple mt-0.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Bottom Quick Switcher */}
              <div className="pt-6 border-t border-forest/10 flex items-center justify-between mt-6">
                <span className="text-xs font-mono text-forest/60">
                  Step {activeStep + 1} / {steps.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeStep === 0}
                    onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                    className="px-3 py-1.5 text-xs font-mono rounded-lg border border-forest/20 text-forest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-forest/5 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={activeStep === steps.length - 1}
                    onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                    className="px-3 py-1.5 text-xs font-mono rounded-lg bg-forest text-sand disabled:opacity-30 disabled:cursor-not-allowed hover:bg-forest-dark cursor-pointer flex items-center gap-1"
                  >
                    Next <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
