import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  width?: 'full' | 'auto';
}

export const SectionReveal: React.FC<SectionRevealProps> = ({
  children,
  className = '',
  delay = 0,
  width = 'full',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={`${width === 'full' ? 'w-full' : ''} ${className}`}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`${width === 'full' ? 'w-full' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
};

