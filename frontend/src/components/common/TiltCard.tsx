import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Maximum rotation in degrees
  glowColor?: string; // Optional subtle hover glow
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 7,
  glowColor = 'rgba(139, 92, 246, 0.08)',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [canHover, setCanHover] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values to avoid React re-renders on pointer movement
  const xVal = useMotionValue(0);
  const yVal = useMotionValue(0);

  // Smooth spring physics for 3D tilt
  const rotateX = useSpring(0, { stiffness: 260, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 260, damping: 22 });

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setCanHover(mq.matches);

    const handleChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !canHover || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -maxTilt;
    const rY = ((x - centerX) / centerX) * maxTilt;

    rotateX.set(rX);
    rotateY.set(rY);
    xVal.set(x);
    yVal.set(y);
  };

  const handleMouseEnter = () => {
    if (canHover) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={
        shouldReduceMotion || !canHover
          ? {}
          : {
              rotateX,
              rotateY,
              transformPerspective: 1000,
            }
      }
      className={`relative transform-gpu will-change-transform ${className}`}
    >
      {/* Dynamic Cursor Light Sheen on desktop hover */}
      {isHovered && !shouldReduceMotion && canHover && (
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl transition-opacity duration-200 z-10"
          style={{
            background: `radial-gradient(circle 260px at ${xVal.get()}px ${yVal.get()}px, ${glowColor}, transparent 80%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
};
