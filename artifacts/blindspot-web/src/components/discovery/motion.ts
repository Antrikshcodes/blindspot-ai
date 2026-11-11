import { useReducedMotion, type Transition } from 'framer-motion';

export const FOREST = '#1F3D2B';
export const SAND = '#E8DCC4';
export const VIOLET = '#8B5CF6';

const ease: Transition = { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] };

/** Returns motion props that collapse to instant, opacity-free transitions under reduced motion. */
export function useFade(offset = 8) {
  const reduce = useReducedMotion();
  if (reduce) return { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } };
  return {
    initial: { opacity: 0, y: offset },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -offset / 2 },
    transition: ease,
  };
}

export function useStagger() {
  const reduce = useReducedMotion();
  return (i: number) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, x: -6 }, animate: { opacity: 1, x: 0 }, transition: { ...ease, delay: Math.min(i, 8) * 0.04 } };
}
