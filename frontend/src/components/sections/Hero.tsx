import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Compass } from 'lucide-react';
import { MagneticButton } from '../common/MagneticButton';
import { BlindspotRevealEngine } from './BlindspotRevealEngine';

interface HeroProps {
  onOpenIntake: () => void;
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenIntake, onExploreClick }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 px-6 md:px-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Expressive Editorial Copy */}
          <div className="lg:col-span-6 flex flex-col items-start text-left z-10">
            
            {/* Tagline Badge */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest/8 border border-forest/20 text-forest text-xs font-mono font-medium tracking-wide mb-6 select-none shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-purple animate-pulse" />
              <span>Evidence-Led Product Validation</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-forest leading-[1.06] mb-6"
            >
              Your next big idea <br />
              <span className="font-serif italic font-normal text-forest">has a</span>{' '}
              <span className="relative inline-block">
                blindspot.
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3.5 text-purple"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
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
                className="w-full sm:w-auto shadow-lg shadow-purple/20"
              >
                Analyze Your Idea
                <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
              </MagneticButton>

              <MagneticButton
                variant="outline"
                size="lg"
                onClick={onExploreClick}
                className="w-full sm:w-auto"
              >
                <Compass className="w-4 h-4 mr-1 text-forest/70" />
                Explore How It Works
              </MagneticButton>
            </motion.div>

            {/* Micro Validation Badges */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-10 pt-6 border-t border-forest/15 flex flex-wrap items-center gap-6 text-xs font-mono text-forest/70"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" /> The Mom Test Logic
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" /> Zero Confirmation Bias
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" /> 10-Domain Risk Matrix
              </span>
            </motion.div>
          </div>

          {/* Right Column: The Blindspot Reveal Engine */}
          <div className="lg:col-span-6 relative flex items-center justify-center z-10">
            <BlindspotRevealEngine />
          </div>

        </div>
      </div>
    </section>
  );
};
