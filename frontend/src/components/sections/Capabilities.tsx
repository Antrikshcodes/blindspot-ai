import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Brain,
  Layers,
  HelpCircle,
  FileCheck,
  FlaskConical,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import { SectionReveal } from '../common/SectionReveal';

export const Capabilities: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const capabilities = [
    {
      title: 'AI Assumption Extraction',
      category: '10-Domain Taxonomy',
      description:
        'Breaks down vague pitch descriptions into 3 to 15 atomic, falsifiable premises across Problem, Customer, Demand, Behaviour, Willingness to Pay, Technical, Distribution, Business Model, Competitive, and Operational risks.',
      icon: Brain,
      tag: 'Phase 02 AI Engine',
      meta: 'Identifies unstated assumptions',
    },
    {
      title: 'Deterministic Risk Scoring',
      category: '2D Prioritization Matrix',
      description:
        'Calculates a rigorous composite Priority Score = Impact (1–5) × Uncertainty (1–5). Automatically flags CRITICAL (20–25) and HIGH (13–19) lethal assumptions so founders know exactly what to test first.',
      icon: Layers,
      tag: 'Mathematical Heuristic',
      meta: 'Zero arbitrary popularity ranks',
    },
    {
      title: 'The Mom Test Interview Scripts',
      category: 'Behavioral Discovery',
      description:
        'Generates 8 to 12 non-leading interview questions strictly anchored to past behaviors and current expenditures. Prevents speculative "Would you use this?" prompts that elicit false positive encouragement.',
      icon: HelpCircle,
      tag: 'Discovery Protocol',
      meta: 'Non-leading interview guides',
    },
    {
      title: 'Evidence & Contradiction Engine',
      category: 'Qualitative Synthesis',
      description:
        'Parses raw interview notes and call transcripts. Associates verbatim quotes with registered hypotheses and tags them as Supporting, Invalidating, or Neutral, flagging direct contradictions between respondents.',
      icon: FileCheck,
      tag: 'Truth Enforcement',
      meta: 'Verbatim quote mapping',
    },
    {
      title: 'Falsification Experiment Board',
      category: 'Lean Validation',
      description:
        'Prescribes specific, low-fidelity experiments (smoke test, concierge MVP, landing page walkthrough, pre-sales) complete with predetermined quantitative failure thresholds and execution timelines.',
      icon: FlaskConical,
      tag: 'Actionable Planning',
      meta: 'Concrete pass/fail thresholds',
    },
    {
      title: 'Real-World Resource Intelligence',
      category: 'Provider Discovery',
      description:
        'Designed to connect founders directly to verified technical assets: GitHub open-source repositories, Hugging Face models & datasets, UCI datasets, and APIs.guru specs matching the analyzed technical constraints.',
      icon: Database,
      tag: 'Phase 03 Pipeline',
      meta: 'GitHub · Hugging Face · UCI · APIs.guru',
    },
  ];

  return (
    <section id="capabilities" className="py-24 md:py-32 px-6 md:px-10 bg-sand border-t border-forest/15 paper-texture">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <SectionReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 md:mb-20">
            <div className="max-w-2xl">
              <span className="inline-block text-xs font-mono font-bold uppercase tracking-wider text-forest/70 mb-3">
                Platform Capabilities
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-forest leading-[1.12]">
                An intellectual adversary, <br />
                <span className="font-serif italic font-normal text-forest">not a cheerleader.</span>
              </h2>
            </div>
            <p className="mt-4 md:mt-0 text-sm md:text-base text-forest/75 max-w-sm leading-relaxed">
              Every feature is built around the scientific method: isolating hypotheses, observing customer evidence, and falsifying fatal flaws early.
            </p>
          </div>
        </SectionReveal>

        {/* 6 Capabilities Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            const isHovered = hoveredIdx === idx;

            return (
              <SectionReveal key={cap.title} delay={idx * 0.08}>
                <motion.div
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  animate={shouldReduceMotion ? {} : { y: isHovered ? -6 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="h-full flex flex-col justify-between p-8 rounded-3xl bg-sand-light border border-forest/20 shadow-xs hover:border-forest/50 hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
                >
                  <div>
                    {/* Top Tag Row */}
                    <div className="flex items-center justify-between pb-4 border-b border-forest/10 mb-6">
                      <div className="w-11 h-11 rounded-2xl bg-forest/5 flex items-center justify-center text-forest group-hover:bg-purple/15 group-hover:text-purple transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-forest/60">
                        {cap.category}
                      </span>
                    </div>

                    {/* Title & Tag */}
                    <div className="mb-3">
                      <span className="text-[10px] font-mono text-purple font-bold tracking-wide uppercase block mb-1">
                        {cap.tag}
                      </span>
                      <h3 className="text-xl font-bold text-forest tracking-tight">
                        {cap.title}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-forest/80 leading-relaxed mb-6 font-sans">
                      {cap.description}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-forest/10 flex items-center justify-between text-xs font-mono text-forest/70">
                    <span>{cap.meta}</span>
                    <ArrowUpRight className="w-4 h-4 text-forest/40 group-hover:text-purple group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                </motion.div>
              </SectionReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
};
