import React from 'react';
import { AlertCircle, EyeOff, MessageSquareX, Sparkles } from 'lucide-react';
import { SectionReveal } from '../common/SectionReveal';
import { TiltCard } from '../common/TiltCard';

export const TheProblem: React.FC = () => {
  const issues = [
    {
      number: '01',
      title: 'Unvalidated Assumptions',
      subtitle: 'Conflating intuition with hard behavioral evidence',
      description:
        'Builders write code based on unstated premises. When teams fail to isolate what they know from what they assume, weeks of engineering are squandered building features nobody requested.',
      icon: EyeOff,
      quote: '"We assumed users would abandon existing habits simply because our UI looked cleaner."',
      dangerLabel: 'Lethal Premise',
    },
    {
      number: '02',
      title: 'Hidden Product Risks',
      subtitle: 'Treating all unknowns as equally consequential',
      description:
        'Not all risks kill a product. Without deterministic risk scoring (Impact × Uncertainty), teams obsess over secondary UI touches while lethal distribution flaws remain untouched.',
      icon: AlertCircle,
      quote: '"We spent three weeks perfecting onboarding before verifying if anyone was willing to pay."',
      dangerLabel: 'Misdirected Effort',
    },
    {
      number: '03',
      title: 'Polite Validation Lies',
      subtitle: 'Asking hypothetical questions that yield false signals',
      description:
        'Asking "Would you use an app that does X?" invariably generates enthusiastic "Yes" responses. Builders mistake social politeness for authentic commitment and willingness to adopt.',
      icon: MessageSquareX,
      quote: '"Everyone we spoke with said they loved the concept, but zero activated when launched."',
      dangerLabel: 'False-Positive Trap',
    },
  ];

  return (
    <section id="problem" className="py-20 sm:py-24 md:py-32 px-4 sm:px-6 md:px-10 bg-sand border-t border-forest/15 relative overflow-hidden">
      {/* Subtle technical background gridline */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#1F3D2B_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header with Asymmetric Visual Weight */}
        <SectionReveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 sm:mb-16 md:mb-20 gap-6 sm:gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest/5 border border-forest/15 text-xs font-mono font-bold uppercase tracking-wider text-forest/75 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-purple" />
                The Reality Check
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-forest leading-[1.12]">
                Most teams start building <br />
                <span className="font-serif italic font-normal text-forest">before they start</span> questioning.
              </h2>
            </div>
            <div className="max-w-md lg:border-l lg:border-forest/20 lg:pl-6 pb-2">
              <p className="text-sm sm:text-base text-forest/80 leading-relaxed">
                Software is cheaper to build than ever, but building the wrong thing still costs weeks of engineering momentum. Blindspot AI systematically stress-tests your concept before you write line one.
              </p>
            </div>
          </div>
        </SectionReveal>

        {/* 3 Interactive Tilt Problem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {issues.map((issue, index) => {
            const Icon = issue.icon;
            return (
              <SectionReveal key={issue.number} delay={index * 0.1}>
                <TiltCard maxTilt={5} className="h-full">
                  <div className="h-full flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-sand-light/90 backdrop-blur-xs border border-forest/20 shadow-xs hover:border-forest/50 transition-colors group relative overflow-hidden">
                    
                    {/* Top edge subtle glow on hover */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div>
                      {/* Number and Icon Header */}
                      <div className="flex items-center justify-between pb-5 border-b border-forest/10 mb-5 sm:mb-6">
                        <span className="font-mono text-2xl font-black text-forest/35 group-hover:text-forest transition-colors">
                          {issue.number}
                        </span>
                        <div className="w-11 h-11 rounded-2xl bg-forest/5 flex items-center justify-center text-forest group-hover:bg-purple/15 group-hover:text-purple transition-all duration-300 transform group-hover:scale-105">
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Title and Subtitle */}
                      <h3 className="text-lg sm:text-xl font-bold text-forest tracking-tight mb-2 group-hover:translate-x-0.5 transition-transform duration-200">
                        {issue.title}
                      </h3>
                      <p className="text-xs font-mono font-medium text-forest/60 uppercase tracking-wider mb-3 sm:mb-4">
                        {issue.subtitle}
                      </p>
                      <p className="text-xs sm:text-sm text-forest/80 leading-relaxed mb-6">
                        {issue.description}
                      </p>
                    </div>

                    {/* Pull Quote Box with dynamic border highlight */}
                    <div className="mt-auto pt-4 sm:pt-5 border-t border-forest/10 relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {issue.dangerLabel}
                        </span>
                        <span className="text-[10px] font-mono text-forest/40">RISK_CRITICAL</span>
                      </div>
                      <p className="text-xs font-serif italic text-forest/90 leading-relaxed bg-forest/5 p-3 rounded-xl border border-forest/10">
                        {issue.quote}
                      </p>
                    </div>
                  </div>
                </TiltCard>
              </SectionReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
};
