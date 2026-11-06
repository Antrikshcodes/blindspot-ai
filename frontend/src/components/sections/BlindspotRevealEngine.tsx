import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';
import { ShieldAlert, Target, Compass, CheckCircle2, ChevronRight } from 'lucide-react';

interface DiscoveryNode {
  id: 'assumption' | 'risk' | 'evidence' | 'insight';
  label: string;
  tag: string;
  angle: number; // Degree position on orbit
  radius: number; // Radius in SVG units
  domain: string;
  finding: string;
  metric: string;
  status: string;
  icon: React.ElementType;
}

export const BlindspotRevealEngine: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeNode, setActiveNode] = useState<DiscoveryNode['id']>('assumption');
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setCanHover(mq.matches);

    const handleChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Smooth springs for 3D card tilt & pointer responsiveness
  const rotateX = useSpring(0, { stiffness: 220, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !canHover || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    rotateX.set((-y / (rect.height / 2)) * 6);
    rotateY.set((x / (rect.width / 2)) * 6);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const nodes: DiscoveryNode[] = [
    {
      id: 'assumption',
      label: 'Assumption',
      tag: '01. UNSTATED PREMISE',
      angle: 45,
      radius: 145,
      domain: 'WILLINGNESS_TO_PAY',
      finding: 'Belief that users will subscribe at $20/mo instead of tolerating ad-supported free tools.',
      metric: 'Uncertainty: 5/5',
      status: 'UNTESTED HYPOTHESIS',
      icon: Target,
    },
    {
      id: 'risk',
      label: 'Risk',
      tag: '02. LETHAL RISK MATRIX',
      angle: 135,
      radius: 145,
      domain: 'PRIORITY: 25/25',
      finding: 'Composite score exceeds critical threshold (Impact 5 × Uncertainty 5 = 25). Must falsify before coding.',
      metric: 'Lethal Venture Risk',
      status: 'CRITICAL THRESHOLD',
      icon: ShieldAlert,
    },
    {
      id: 'evidence',
      label: 'Evidence',
      tag: '03. THE MOM TEST PROBE',
      angle: 225,
      radius: 145,
      domain: 'BEHAVIORAL INQUIRY',
      finding: '"How did you solve this problem last Tuesday, and what did you actually pay for that workaround?"',
      metric: 'Verbatim Quote Mapping',
      status: 'GROUNDED VERIFICATION',
      icon: CheckCircle2,
    },
    {
      id: 'insight',
      label: 'Insight',
      tag: '04. FALSIFICATION TEST',
      angle: 315,
      radius: 145,
      domain: 'PRE-COMMITMENT EXPERIMENT',
      finding: 'Run a 5-day concierge test. If fewer than 4 of 20 interviewees commit a letter of intent, abandon feature.',
      metric: 'Failure Threshold: <20%',
      status: 'ACTIONABLE NEXT STEP',
      icon: Compass,
    },
  ];

  const currentNode = nodes.find((n) => n.id === activeNode) || nodes[0];
  const CurrentIcon = currentNode.icon;

  // Active target angle for the moving beam and purple focal reticle
  const activeAngleRad = (currentNode.angle * Math.PI) / 180;
  const targetX = 200 + Math.cos(activeAngleRad) * 145;
  const targetY = 200 + Math.sin(activeAngleRad) * 145;

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        shouldReduceMotion || !canHover
          ? {}
          : {
              rotateX,
              rotateY,
              transformPerspective: 1200,
            }
      }
      className="relative w-full max-w-xl mx-auto bg-sand-light/95 border-2 border-forest/25 rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl backdrop-blur-md transform-gpu select-none transition-shadow hover:shadow-purple/10"
    >
      {/* Top Status Bar with Live Diagnostics Header */}
      <div className="flex items-center justify-between pb-4 border-b border-forest/15 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple" />
          </span>
          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-widest text-forest uppercase">
            BLINDSPOT REVEAL ENGINE
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-forest/60">
          <span className="hidden sm:inline">RADAR: ACTIVE</span>
          <span className="px-2 py-0.5 rounded-full bg-purple/15 text-purple font-bold">
            SCANNING
          </span>
        </div>
      </div>

      {/* Main SVG Aperture Radar Engine Container */}
      <div className="relative w-full aspect-square max-w-[270px] sm:max-w-[340px] md:max-w-[380px] mx-auto flex items-center justify-center">
        
        {/* SVG Core Diagram */}
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Dynamic Purple Beam Gradient */}
            <linearGradient id="beamGradient" x1="200" y1="200" x2={targetX} y2={targetY} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.2" />
            </linearGradient>

            {/* Subtle Radial Glow */}
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Background Grid & Cardinal Coordinate Lines */}
          <g opacity="0.18">
            <line x1="200" y1="20" x2="200" y2="380" stroke="#1F3D2B" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="20" y1="200" x2="380" y2="200" stroke="#1F3D2B" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="200" cy="200" r="185" stroke="#1F3D2B" strokeWidth="1" />
          </g>

          {/* 2. Outer Ring: Clockwise Slow Rotation with Degree Ticks */}
          <motion.g
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '200px 200px' }}
          >
            <circle cx="200" cy="200" r="170" stroke="#1F3D2B" strokeWidth="1.5" strokeDasharray="6 12" opacity="0.3" />
            <circle cx="200" cy="30" r="2.5" fill="#1F3D2B" />
            <circle cx="370" cy="200" r="2.5" fill="#1F3D2B" />
            <circle cx="200" cy="370" r="2.5" fill="#1F3D2B" />
            <circle cx="30" cy="200" r="2.5" fill="#1F3D2B" />
          </motion.g>

          {/* 3. Middle Ring: The Incomplete Circular Aperture (The Blindspot Arc) */}
          <motion.g
            animate={shouldReduceMotion ? {} : { rotate: -360 }}
            transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '200px 200px' }}
          >
            <path
              d="M200 55 A145 145 0 1 1 70 270"
              stroke="#1F3D2B"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path
              d="M70 270 A145 145 0 0 1 200 55"
              stroke="#8B5CF6"
              strokeWidth="1.5"
              strokeDasharray="4 8"
              opacity="0.4"
            />
          </motion.g>

          {/* 4. Active Inspection Beam connecting Center to Selected Node */}
          <motion.line
            x1="200"
            y1="200"
            animate={{ x2: targetX, y2: targetY }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            stroke="url(#beamGradient)"
            strokeWidth="2"
            strokeDasharray="4 2"
          />

          {/* 5. Inner Ring: Precision Optical Reticle */}
          <motion.circle
            cx="200"
            cy="200"
            r="80"
            stroke="#1F3D2B"
            strokeWidth="2"
            strokeDasharray="30 15"
            opacity="0.5"
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '200px 200px' }}
          />

          {/* 6. Central Core: Multi-layered Target & Ambient Glow */}
          <circle cx="200" cy="200" r="50" fill="url(#coreGlow)" />
          
          <g>
            <circle cx="200" cy="200" r="32" fill="#E8DCC4" stroke="#1F3D2B" strokeWidth="2.5" />
            <line x1="200" y1="176" x2="200" y2="224" stroke="#1F3D2B" strokeWidth="1.5" opacity="0.6" />
            <line x1="176" y1="200" x2="224" y2="200" stroke="#1F3D2B" strokeWidth="1.5" opacity="0.6" />
            <circle cx="200" cy="200" r="8" fill="#1F3D2B" />
          </g>

          {/* 7. The Traveling Electric Purple Focal Target Reticle */}
          <motion.g
            animate={{ x: targetX, y: targetY }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <circle cx="0" cy="0" r="16" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="8 4" />
            <circle cx="0" cy="0" r="6" fill="#8B5CF6" />
            <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
          </motion.g>
        </svg>

        {/* 4 Interactive Node Buttons Mounted Around the Orbit */}
        {nodes.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          const percentX = 50 + (Math.cos(rad) * 145 * 100) / 400;
          const percentY = 50 + (Math.sin(rad) * 145 * 100) / 400;
          const isSelected = activeNode === node.id;
          const NodeIcon = node.icon;

          return (
            <div
              key={node.id}
              style={{
                left: `${percentX}%`,
                top: `${percentY}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <button
                type="button"
                onClick={() => setActiveNode(node.id)}
                onMouseEnter={() => {
                  if (canHover) setActiveNode(node.id);
                }}
                className={`group relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-purple min-h-[40px] min-w-[40px] ${
                  isSelected
                    ? 'bg-purple text-white shadow-lg shadow-purple/30 scale-110 ring-4 ring-purple/20'
                    : 'bg-sand border-2 border-forest/40 text-forest hover:border-forest hover:scale-105 shadow-sm'
                }`}
                aria-label={`Inspect ${node.label}: ${node.finding}`}
              >
                <NodeIcon className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:rotate-6" />

                {/* Micro-Badge indicator visible on hover / active */}
                <span
                  className={`absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 pointer-events-none shadow-xs hidden sm:block ${
                    isSelected
                      ? 'bg-purple text-white opacity-100 translate-y-0'
                      : 'bg-sand-light border border-forest/20 text-forest/70 opacity-0 group-hover:opacity-100 group-hover:translate-y-0.5'
                  }`}
                >
                  {node.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Dynamic Contextual Output Card (The Uncovered Truth) */}
      <div className="mt-6 sm:mt-8 pt-4 border-t border-forest/15">
        <motion.div
          key={currentNode.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="p-4 sm:p-5 rounded-2xl bg-sand border border-forest/20 shadow-xs space-y-2.5 sm:space-y-3"
        >
          {/* Tag and Domain Header */}
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-mono font-bold uppercase tracking-wider text-purple flex items-center gap-1.5 truncate">
              <CurrentIcon className="w-4 h-4 shrink-0" />
              {currentNode.tag}
            </span>
            <span className="font-mono text-forest/60 text-[10px] sm:text-[11px] bg-forest/5 px-2 py-0.5 rounded-full font-semibold shrink-0">
              {currentNode.domain}
            </span>
          </div>

          {/* Finding Narrative */}
          <p className="text-xs sm:text-sm font-semibold text-forest leading-relaxed">
            {currentNode.finding}
          </p>

          {/* Bottom Analytical Metric Bar */}
          <div className="pt-2 border-t border-forest/10 flex flex-wrap items-center justify-between text-[11px] sm:text-xs font-mono gap-1">
            <span className="text-forest/70 font-medium">
              Metric: <strong className="text-forest">{currentNode.metric}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple/10 text-purple font-bold text-[10px] sm:text-[11px]">
              {currentNode.status}
            </span>
          </div>
        </motion.div>

        {/* Interaction Hint */}
        <div className="mt-2.5 text-center flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-mono text-forest/50">
          <span>Tap or hover aperture nodes to inspect assumptions</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </motion.div>
  );
};
