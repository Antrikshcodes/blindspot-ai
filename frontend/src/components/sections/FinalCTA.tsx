import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { MagneticButton } from '../common/MagneticButton';
import { SectionReveal } from '../common/SectionReveal';

interface FinalCTAProps {
  onOpenIntake: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onOpenIntake }) => {

  return (
    <section className="py-24 md:py-32 px-6 md:px-10 bg-forest text-sand relative overflow-hidden select-none">
      {/* Subtle Geometric Background Reticles */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-sand" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[840px] h-[840px] rounded-full border border-dashed border-sand/50" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <SectionReveal>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sand/10 border border-sand/20 text-sand text-xs font-mono font-medium tracking-wide mb-8">
            <ShieldCheck className="w-4 h-4 text-purple" />
            <span>Protect Your Most Valuable Asset: Time</span>
          </div>

          {/* Main Statement */}
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-sand leading-[1.08] mb-6">
            Build with evidence. <br />
            <span className="font-serif italic font-normal text-sand/90">Not assumptions.</span>
          </h2>

          <p className="text-base sm:text-xl text-sand/80 max-w-2xl mx-auto font-sans leading-relaxed mb-10">
            Before committing your next four weeks of coding, spend 5 minutes exposing the hidden risks that could derail your launch.
          </p>

          {/* Primary CTA: Electric Purple */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <MagneticButton
              variant="purple"
              size="lg"
              onClick={onOpenIntake}
              className="w-full sm:w-auto shadow-xl"
            >
              Start Validating
              <ArrowRight className="w-4 h-4 ml-1" />
            </MagneticButton>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-mono text-sand/60">
            <span>Free for Student Builders & Hackathon Teams</span>
            <span>•</span>
            <span>Zero Fluff</span>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
};
