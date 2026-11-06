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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'The Problem', href: '#problem' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Methodology', href: '#methodology' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-sand/90 backdrop-blur-md border-b border-forest/15 py-3 shadow-xs'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
          {/* Brand Logo */}
          <a
            href="#"
            className="group focus-visible:outline-2 focus-visible:outline-purple rounded-lg transition-transform"
            aria-label="Blindspot AI Home"
          >
            <BrandLogo size="md" />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="text-sm font-sans font-medium text-forest/80 hover:text-forest transition-colors relative py-1 focus-visible:outline-2 focus-visible:outline-purple rounded"
              >
                {link.label}
              </a>
            ))}
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
              className="p-2.5 rounded-full bg-forest/5 text-forest hover:bg-forest/10 focus-visible:outline-2 focus-visible:outline-purple"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden fixed top-[65px] left-0 right-0 z-30 bg-sand border-b border-forest/20 shadow-xl overflow-hidden px-6 py-6"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className="text-lg font-sans font-medium text-forest py-2 border-b border-forest/10"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2">
                <MagneticButton
                  variant="purple"
                  size="md"
                  className="w-full justify-center"
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
