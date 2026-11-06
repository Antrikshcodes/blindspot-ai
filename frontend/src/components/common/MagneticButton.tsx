import React, { useRef, useState, useEffect } from 'react';
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
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    // Only enable magnetic pull on desktop devices with fine cursor support
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setCanHover(mq.matches);

    const handleChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (shouldReduceMotion || !canHover || !ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = (clientX - centerX) * 0.18;
    const distanceY = (clientY - centerY) * 0.18;
    setPosition({ x: distanceX, y: distanceY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const baseStyles =
    'relative inline-flex items-center justify-center font-sans font-semibold rounded-full transition-colors cursor-pointer select-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-purple focus-visible:outline-offset-2 min-h-[44px]';

  const sizeStyles = {
    sm: 'px-4 py-2 text-xs tracking-wider uppercase min-w-[44px]',
    md: 'px-6 py-3 text-sm tracking-wide',
    lg: 'px-8 py-3.5 text-base tracking-wide',
  };

  const variantStyles = {
    // Strategic Electric Purple CTA with crisp white text
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
      animate={shouldReduceMotion || !canHover ? {} : { x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};
