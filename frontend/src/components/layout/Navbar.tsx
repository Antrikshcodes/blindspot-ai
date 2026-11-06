import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { MagneticButton } from '../common/MagneticButton';

interface NavbarProps {
  onOpenIntake: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenIntake }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  const navLinks = [
    { label: 'The Problem', href: '#problem' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Capabilities', href: '#capabilities' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Robust active section detection across viewport heights
      const sections = ['problem', 'how-it-works', 'capabilities'];
      let current = '';
      const vh = window.innerHeight;

      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= vh * 0.45 && rect.bottom >= vh * 0.15) {
            current = `#${id}`;
            break;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard accessibility: Escape closes mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setActiveSection(href);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-sand/92 backdrop-blur-md border-b border-forest/15 py-2.5 sm:py-3 shadow-xs'
            : 'bg-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex items-center justify-between">
          {/* Brand Logo with smooth scroll to top */}
          <a
            href="#"
            onClick={handleLogoClick}
            className="group flex items-center focus-visible:outline-2 focus-visible:outline-purple rounded-lg transition-transform hover:scale-[1.02]"
            aria-label="Blindspot AI — Scroll to top of page"
          >
            <BrandLogo size="md" />
          </a>

          {/* Desktop Navigation Links with Framer Motion Sliding Pill Indicator */}
          <nav className="hidden md:flex items-center gap-1 bg-forest/5 p-1 rounded-full border border-forest/10" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className={`relative px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors rounded-full focus-visible:outline-2 focus-visible:outline-purple ${
                    isActive ? 'text-sand font-bold' : 'text-forest/75 hover:text-forest'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-forest rounded-full -z-10 shadow-xs"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Right Action: Strategic Electric Purple CTA */}
          <div className="hidden md:flex items-center gap-4">
            <MagneticButton variant="purple" size="sm" onClick={onOpenIntake}>
              Analyze Your Idea
              <ArrowUpRight className="w-4 h-4 ml-0.5" />
            </MagneticButton>
          </div>

          {/* Mobile Menu Trigger Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2.5 rounded-full bg-forest/5 text-forest hover:bg-forest/10 focus-visible:outline-2 focus-visible:outline-purple min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Accessible Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="md:hidden fixed top-[60px] left-0 right-0 z-30 bg-sand/98 backdrop-blur-lg border-b border-forest/20 shadow-xl overflow-hidden px-4 sm:px-6 py-6"
            role="dialog"
            aria-label="Mobile Navigation"
          >
            <div className="flex flex-col gap-2.5">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className={`text-base font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-between min-h-[44px] ${
                    activeSection === link.href ? 'bg-forest text-sand' : 'text-forest hover:bg-forest/5'
                  }`}
                >
                  <span>{link.label}</span>
                  <span className="text-xs text-forest/40 font-mono tracking-widest uppercase">Inspect</span>
                </a>
              ))}
              <div className="pt-3 border-t border-forest/10 mt-1">
                <MagneticButton
                  variant="purple"
                  size="md"
                  className="w-full justify-center min-h-[44px]"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenIntake();
                  }}
                >
                  Analyze Your Idea
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </MagneticButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
