/**
 * Centralized motion tokens and easing presets for Blindspot AI
 * Ensures a cohesive, cinematic motion language across all components.
 */

export const transitions = {
  // Smooth editorial ease for section reveals and text entrances
  editorial: {
    duration: 0.85,
    ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for smooth deceleration
  },
  // Snappy spring for interactive buttons and micro-interactions
  springSnappy: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  },
  // Gentle spring for card tilt and floating geometry
  springGentle: {
    type: "spring",
    stiffness: 180,
    damping: 24,
  },
  // Stagger delays
  staggerFast: 0.06,
  staggerMedium: 0.12,
  staggerSlow: 0.2,
};

export const fadeUpVariants = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: (customDelay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      delay: customDelay,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};
