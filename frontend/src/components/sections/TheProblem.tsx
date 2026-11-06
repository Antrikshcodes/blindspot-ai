import React from 'react';
import { AlertCircle, EyeOff, MessageSquareX } from 'lucide-react';
import { SectionReveal } from '../common/SectionReveal';

export const TheProblem: React.FC = () => {

  const issues = [
    {
      number: '01',
      title: 'Unvalidated Assumptions',
      subtitle: 'Conflating beliefs with hard behavioral facts',
      description:
        'Founders write code based on unstated premises. When teams do not separate what they know from what they assume, months of engineering are wasted building features nobody needs.',
      icon: EyeOff,
      quote: '"We assume users will switch habits because our product is cleaner."',
      dangerLabel: 'Lethal Premise',
    },
    {
      number: '02',
      title: 'Hidden Product Risks',
      subtitle: 'Treating all uncertainties as equally important',
      description:
        'Not all risks kill a startup. Without deterministic risk scoring ($Impact \\times Uncertainty$), teams focus on trivial operational details while lethal business and distribution flaws remain unaddressed.',
      icon: AlertCircle,
      quote: '"We polished the onboarding flow before testing if anyone would pay."',
      dangerLabel: 'Misdirected Effort',
    },
    {
      number: '03',
      title: 'Leading Discovery & False Signals',
      subtitle: 'Asking speculative questions that yield polite lies',
      description:
        'Asking "Would you buy an app that does X?" always gets an encouraging "Yes". Founders fall prey to confirmation bias, mistaking polite validation for actual user willingness to change.',
      icon: MessageSquareX,
      quote: '"Everyone we spoke to loved the idea, but nobody signed up."',
      dangerLabel: 'The False-Positive Trap',
    },
  ];

  return (
    <section id="problem" className="py-24 md:py-32 px-6 md:px-10 bg-sand border-t border-forest/15 paper-texture">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <SectionReveal>
          <div className="max-w-3xl mb-16 md:mb-20">
            <span className="inline-block text-xs font-mono font-bold uppercase tracking-wider text-forest/70 mb-3">
              The Reality Check
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-forest leading-[1.12] mb-6">
              Most teams start building <br />
              <span className="font-serif italic font-normal text-forest">before they start</span> questioning.
            </h2>
            <p className="text-base sm:text-lg text-forest/80 leading-relaxed max-w-2xl">
              Software is cheaper to build than ever, but building the wrong thing still costs weeks of momentum. The graveyard of hackathon projects and student startups is filled with well-engineered products that answered questions nobody asked.
            </p>
          </div>
        </SectionReveal>

        {/* 3 Key Problem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {issues.map((issue, index) => {
            const Icon = issue.icon;
            return (
              <SectionReveal key={issue.number} delay={index * 0.12}>
                <div className="h-full flex flex-col justify-between p-8 rounded-3xl bg-sand-light border border-forest/20 shadow-xs hover:border-forest/50 transition-all duration-300 group">
                  <div>
                    {/* Number and Icon Header */}
                    <div className="flex items-center justify-between pb-6 border-b border-forest/10 mb-6">
                      <span className="font-mono text-2xl font-bold text-forest/40 group-hover:text-forest transition-colors">
                        {issue.number}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-forest/5 flex items-center justify-center text-forest group-hover:bg-purple/15 group-hover:text-purple transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Title and Content */}
                    <h3 className="text-xl font-bold text-forest tracking-tight mb-2">
                      {issue.title}
                    </h3>
                    <p className="text-xs font-mono font-medium text-forest/60 uppercase tracking-wide mb-4">
                      {issue.subtitle}
                    </p>
                    <p className="text-sm text-forest/80 leading-relaxed mb-6">
                      {issue.description}
                    </p>
                  </div>

                  {/* Pull Quote Box */}
                  <div className="mt-auto pt-4 border-t border-forest/10">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple block mb-1">
                      {issue.dangerLabel}
                    </span>
                    <p className="text-xs font-serif italic text-forest/90">
                      {issue.quote}
                    </p>
                  </div>
                </div>
              </SectionReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
};
