import React, { useRef, useState } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

interface MagneticButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'purple' | 'forest' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  variant = 'forest',
  size = 'md',
  className = '',
  onClick,
  ...props
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (shouldReduceMotion || !ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = (clientX - centerX) * 0.22;
    const distanceY = (clientY - centerY) * 0.22;
    setPosition({ x: distanceX, y: distanceY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const baseStyles =
    'relative inline-flex items-center justify-center font-medium font-sans rounded-full transition-colors cursor-pointer select-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-purple focus-visible:outline-offset-2';

  const sizeStyles = {
    sm: 'px-4 py-1.5 text-xs tracking-wide',
    md: 'px-6 py-3 text-sm tracking-wide',
    lg: 'px-8 py-4 text-base tracking-wide',
  };

  const variantStyles = {
    // Strategic Electric Purple CTA
    purple:
      'bg-purple text-white hover:bg-purple-hover shadow-sm hover:shadow-md hover:shadow-purple/20',
    // Dominant Forest Green
    forest:
      'bg-forest text-sand hover:bg-forest-dark border border-forest-dark/40 shadow-sm',
    // Clean Minimalist Outline
    outline:
      'bg-transparent text-forest border border-forest/30 hover:border-forest hover:bg-forest/5',
    // Subtle Ghost
    ghost:
      'bg-transparent text-forest hover:bg-forest/10',
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={shouldReduceMotion ? {} : { x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};

