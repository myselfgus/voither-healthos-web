/**
 * ============================================
 * NAVIGATION COMPONENT
 * ============================================
 * Top navigation bar with glass effect
 * AI-EDITABLE: Modify links, styling, and behavior
 *
 * CONTENT: Edit content in /landing/content/pt.json or en.json
 */

import React, { useState, useEffect } from 'react';
import { List, X, Globe } from '@phosphor-icons/react';
import { LiquidButton } from '../shared';
import type { NavContent, Locale } from '../../types/content';

export interface NavigationProps {
  content: NavContent;
  locale: Locale;
  onToggleLocale: () => void;
  onCtaClick?: () => void;
}

/**
 * Navigation Component
 */
export function Navigation({
  content,
  locale,
  onToggleLocale,
  onCtaClick,
}: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${isScrolled ? 'glass py-3' : 'py-5'}
      `}
    >
      <div className="container">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="font-display text-xl font-bold text-text-primary">
            Voither <span className="text-gradient">{content.logo}</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {/* Links */}
            <ul className="flex gap-6">
              {content.links.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="font-ui text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Language toggle */}
            <button
              onClick={onToggleLocale}
              className="flex items-center gap-1.5 font-ui text-sm text-text-secondary hover:text-text-primary transition-colors"
              aria-label={`Switch to ${locale === 'pt' ? 'English' : 'Portuguese'}`}
            >
              <Globe weight="duotone" className="w-4 h-4" />
              <span>{content.languageToggle}</span>
            </button>

            {/* CTA */}
            <LiquidButton variant="glass-primary" size="sm" onClick={onCtaClick}>
              {content.cta}
            </LiquidButton>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden neu-icon-btn w-10 h-10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X weight="bold" className="w-5 h-5" />
            ) : (
              <List weight="bold" className="w-5 h-5" />
            )}
          </button>
        </nav>

        {/* Mobile Navigation */}
        <div
          className={`
            lg:hidden overflow-hidden transition-all duration-300
            ${isMobileMenuOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="glass rounded-xl p-4">
            <ul className="space-y-2 mb-4">
              {content.links.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="block py-2 px-3 font-ui text-text-secondary hover:text-text-primary hover:bg-ice/50 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between pt-4 border-t border-glass-border">
              <button
                onClick={onToggleLocale}
                className="flex items-center gap-1.5 font-ui text-sm text-text-secondary"
              >
                <Globe weight="duotone" className="w-4 h-4" />
                <span>{content.languageToggle}</span>
              </button>

              <LiquidButton variant="glass-primary" size="sm" onClick={onCtaClick}>
                {content.cta}
              </LiquidButton>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navigation;
