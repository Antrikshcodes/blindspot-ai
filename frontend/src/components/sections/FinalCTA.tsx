import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Crosshair } from 'lucide-react';
import { MagneticButton } from '../common/MagneticButton';
import { SectionReveal } from '../common/SectionReveal';

interface FinalCTAProps {
  onOpenIntake: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onOpenIntake }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-28 md:py-40 px-6 md:px-10 bg-forest text-sand relative overflow-hidden select-none">
      {/* Concentric Rotating Reticle Shapes in Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {/* Subtle Purple Radial Core Glow */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-purple/[0.08] blur-3xl pointer-events-none" />

        {/* Concentric Rings with Spring Rotation */}
        {!shouldReduceMotion && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[640px] h-[640px] rounded-full border border-sand/10 border-dashed"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 220, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[920px] h-[920px] rounded-full border border-sand/5"
            />
          </>
        )}
        <div className="absolute w-[400px] h-[400px] rounded-full border border-sand/10" />

        {/* Crosshair Axes */}
        <div className="absolute w-full h-[1px] bg-sand/5" />
        <div className="absolute h-full w-[1px] bg-sand/5" />
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

          {/* Primary CTA: Electric Purple with Breathing Glow */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="relative group">
              {/* Subtle Purple Aura */}
              <div className="absolute -inset-1 rounded-2xl bg-purple/30 blur-md opacity-75 group-hover:opacity-100 transition duration-300" />
              <MagneticButton
                variant="purple"
                size="lg"
                onClick={onOpenIntake}
                className="relative w-full sm:w-auto shadow-2xl"
              >
                Start Validating Now
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </MagneticButton>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-xs font-mono text-sand/60">
            <span className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-purple" />
              Free for Student Builders & Hackathon Teams
            </span>
            <span>•</span>
            <span>Deterministic Math</span>
            <span>•</span>
            <span>Zero Fluff</span>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
};
