import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Maximum rotation in degrees
  glowColor?: string; // Optional subtle hover glow
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 8,
  glowColor = 'rgba(139, 92, 246, 0.12)',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -maxTilt;
    const rY = ((x - centerX) / centerX) * maxTilt;

    setRotateX(rX);
    setRotateY(rY);
    setMousePos({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={
        shouldReduceMotion
          ? {}
          : {
              rotateX,
              rotateY,
              transformPerspective: 1000,
            }
      }
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 24,
      }}
      className={`relative transform-gpu will-change-transform ${className}`}
    >
      {/* Dynamic Cursor Light Sheen */}
      {isHovered && !shouldReduceMotion && (
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(circle 240px at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 80%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
};
