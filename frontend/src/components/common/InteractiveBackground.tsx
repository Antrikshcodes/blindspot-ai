import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';

export const InteractiveBackground: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Smooth springs for cursor-based subtle parallax
  const mouseX = useSpring(0, { stiffness: 45, damping: 20 });
  const mouseY = useSpring(0, { stiffness: 45, damping: 20 });

  useEffect(() => {
    setMounted(true);
    if (shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
      mouseX.set(x * 14);
      mouseY.set(y * 14);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [shouldReduceMotion]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Fine Calibration Grid Overlay (Forest Green at 3% opacity) */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1F3D2B 1px, transparent 1px),
            linear-gradient(to bottom, #1F3D2B 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* 2. Precision Corner Reticle Coordinates */}
      <div className="absolute top-28 left-8 text-[10px] font-mono tracking-widest text-forest/20 uppercase hidden lg:block">
        SYS.LOC // 28°36'N · 77°12'E [CALIBRATED]
      </div>
      <div className="absolute top-28 right-8 text-[10px] font-mono tracking-widest text-forest/20 uppercase hidden lg:block">
        BLINDSPOT_ENGINE // V1.0.4-EV
      </div>

      {/* 3. Floating Geometric Apertures with Spring Parallax */}
      {!shouldReduceMotion && (
        <motion.div style={{ x: mouseX, y: mouseY }} className="absolute inset-0">
          {/* Ambient Shape 1: Top-Right Large Incomplete Aperture Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full border border-forest/10 border-dashed"
          />

          {/* Ambient Shape 2: Top-Right Concentric Orbit */}
          <div className="absolute top-12 right-12 w-[340px] h-[340px] rounded-full border border-forest/5" />

          {/* Ambient Shape 3: Mid-Left Floating Diamond Reticle */}
          <motion.div
            animate={{ y: [-10, 10, -10], rotate: [0, 4, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[38%] left-10 w-16 h-16 border border-forest/15 rotate-45 hidden md:block"
          >
            <div className="absolute inset-2 border border-dashed border-forest/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple/40" />
          </motion.div>

          {/* Ambient Shape 4: Mid-Right Floating Dashed Horizon */}
          <motion.div
            animate={{ y: [8, -8, 8] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[55%] right-16 flex items-center gap-3 hidden md:flex"
          >
            <span className="w-12 h-[1px] bg-forest/20" />
            <span className="w-2 h-2 rounded-full border border-purple text-purple flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-purple" />
            </span>
            <span className="w-24 h-[1px] border-b border-dashed border-forest/20" />
          </motion.div>

          {/* Ambient Shape 5: Lower-Left Orbit */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 220, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-32 -left-32 w-[540px] h-[540px] rounded-full border border-forest/10 border-dashed"
          />

          {/* Subtle Electric Purple Ambient Glow Accent (strictly 4% opacity) */}
          <div className="absolute top-[20%] right-[15%] w-[420px] h-[420px] rounded-full bg-purple/[0.035] blur-3xl pointer-events-none" />
          <div className="absolute bottom-[20%] left-[10%] w-[380px] h-[380px] rounded-full bg-purple/[0.025] blur-3xl pointer-events-none" />
        </motion.div>
      )}
    </div>
  );
};
