import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface IntroOverlayProps {
  onComplete: () => void;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ onComplete }) => {
  const shouldReduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<'entering' | 'assembled' | 'tagline'>('entering');
  const timerRefs = useRef<NodeJS.Timeout[]>([]);
  const hasDismissedRef = useRef(false);

  // Safe dismiss function that cleans up all pending timers
  const dismissIntro = useCallback(() => {
    if (hasDismissedRef.current) return;
    hasDismissedRef.current = true;

    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    document.body.style.overflow = '';

    try {
      sessionStorage.setItem('blindspot_has_seen_intro', 'true');
    } catch {
      // Ignore storage errors in restricted iframe/private mode environments
    }

    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // If user prefers reduced motion, bypass intro immediately
    if (shouldReduceMotion) {
      dismissIntro();
      return;
    }

    // Lock body scrolling during intro overlay
    document.body.style.overflow = 'hidden';

    // Keyboard accessibility: Escape skips intro
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Choreographed 3.00-second sequence
    // 0.00 - 0.70s: Abstract geometric entrance
    // 0.70s: Assemble shapes into logo and reveal brand typography
    const t1 = setTimeout(() => {
      setPhase('assembled');
    }, 700);

    // 1.80s: Reveal the philosophical tagline "Every idea has a blindspot."
    const t2 = setTimeout(() => {
      setPhase('tagline');
    }, 1800);

    // 3.00s: Exactly complete and hand over to landing page
    const t3 = setTimeout(() => {
      dismissIntro();
    }, 3000);

    timerRefs.current = [t1, t2, t3];

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      timerRefs.current.forEach(clearTimeout);
      document.body.style.overflow = '';
    };
  }, [shouldReduceMotion, dismissIntro]);

  return (
    <motion.div
      key="intro-overlay"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sand text-forest overflow-hidden select-none"
      role="dialog"
      aria-label="Blindspot AI introduction animation"
      aria-modal="true"
    >
      {/* Subtle Ambient Background Grid Reticles */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-forest/20" />
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-forest/20" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-dashed border-forest/20" />
      </div>

      {/* Central Logo Assembly Container */}
      <div className="relative flex flex-col items-center text-center px-6">
        {/* Geometric Aperture Animation */}
        <div className="relative w-28 h-28 md:w-36 md:h-36 mb-6 flex items-center justify-center">
          <motion.svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Segment 1: Upper Right Blade */}
            <motion.path
              d="M50 8 A42 42 0 0 1 92 50"
              stroke="#1F3D2B"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0, rotate: -45 }}
              animate={{ pathLength: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Segment 2: Lower Left Blade */}
            <motion.path
              d="M50 92 A42 42 0 0 1 8 50"
              stroke="#1F3D2B"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0, rotate: 45 }}
              animate={{ pathLength: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Inner Concentric Iris Circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="24"
              stroke="#1F3D2B"
              strokeWidth="2.5"
              strokeDasharray="60 20"
              initial={{ scale: 0.4, opacity: 0, rotate: 90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Precision Crosshair Marks */}
            <motion.line
              x1="50"
              y1="18"
              x2="50"
              y2="28"
              stroke="#1F3D2B"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            />
            <motion.line
              x1="50"
              y1="72"
              x2="50"
              y2="82"
              stroke="#1F3D2B"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            />
            {/* Central Electric Purple Focal Point (The Blindspot) */}
            <motion.circle
              cx="50"
              cy="50"
              r="7"
              fill="#8B5CF6"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.25, 1], opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.85, ease: 'easeOut' }}
            />
          </motion.svg>
        </div>

        {/* Typography Stagger: Brand Name */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={phase !== 'entering' ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-1 text-3xl md:text-5xl font-extrabold tracking-tight text-forest"
        >
          <span>Blindspot</span>
          <span className="text-purple">AI</span>
        </motion.div>

        {/* Tagline Reveal (1.80s – 2.70s) */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={phase === 'tagline' ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 text-base md:text-xl font-serif italic text-forest/80 tracking-wide max-w-sm"
        >
          Every idea has a blindspot.
        </motion.p>
      </div>

      {/* Accessible, Responsive "Skip Intro" Button */}
      <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-50">
        <button
          onClick={dismissIntro}
          type="button"
          className="group flex items-center gap-2 px-5 py-3 min-h-[44px] min-w-[44px] rounded-full text-xs md:text-sm font-mono uppercase tracking-wider text-forest font-semibold bg-sand-muted/80 hover:bg-sand-muted border border-forest/25 shadow-xs transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-purple active:scale-95"
          aria-label="Skip cinematic introduction (press Escape)"
        >
          <span>Skip Intro</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 text-forest" />
        </button>
      </div>
    </motion.div>
  );
};
