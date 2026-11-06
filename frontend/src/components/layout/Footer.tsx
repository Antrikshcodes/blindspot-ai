import React from 'react';
import { BrandLogo } from '../common/BrandLogo';

export const Footer: React.FC = () => {
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const elem = document.querySelector(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-forest-dark text-sand py-16 px-6 md:px-10 border-t border-sand/15 select-none">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-sand/10">
          
          {/* Brand Info Column */}
          <div className="md:col-span-6 space-y-4">
            <BrandLogo inverted size="md" />
            <p className="text-sm text-sand/75 max-w-md leading-relaxed font-sans">
              An intelligent product validation engine engineered to challenge startup assumptions, prioritize lethal risks, and prescribe falsification experiments before founders commit weeks of engineering effort.
            </p>
            <div className="text-xs font-mono text-sand/50 pt-2">
              Every idea has a blindspot.
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sand/60 mb-4">
              Validation Architecture
            </h4>
            <ul className="space-y-2.5 text-sm font-sans text-sand/80">
              <li>
                <a
                  href="#problem"
                  onClick={(e) => handleScrollTo(e, '#problem')}
                  className="hover:text-sand hover:underline underline-offset-4 transition-colors"
                >
                  The Reality Check
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleScrollTo(e, '#how-it-works')}
                  className="hover:text-sand hover:underline underline-offset-4 transition-colors"
                >
                  Validation Protocol
                </a>
              </li>
              <li>
                <a
                  href="#capabilities"
                  onClick={(e) => handleScrollTo(e, '#capabilities')}
                  className="hover:text-sand hover:underline underline-offset-4 transition-colors"
                >
                  Platform Capabilities
                </a>
              </li>
            </ul>
          </div>

          {/* Context & Attribution */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sand/60 mb-4">
              Context
            </h4>
            <div className="text-xs font-mono text-sand/70 space-y-2 leading-relaxed">
              <p>Team Null Theory</p>
              <p>CoNSTruct 2.0 Hackathon</p>
              <p className="text-sand/50">Replit × Newton School of Technology</p>
            </div>
          </div>

        </div>

        {/* Bottom Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-sand/50">
          <div>
            © {new Date().getFullYear()} Blindspot AI. All rights reserved.
          </div>
          <div>
            Designed with Forest Green, Sand Beige & Electric Purple.
          </div>
        </div>
      </div>
    </footer>
  );
};
