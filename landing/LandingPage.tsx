/**
 * ============================================
 * LANDING PAGE
 * ============================================
 * Main landing page component assembling all sections
 * AI-EDITABLE: Modify section order, add/remove sections
 *
 * CONTENT: Edit files in /landing/content/
 * STYLING: Edit files in /landing/design-system/
 */

import React, { useCallback } from 'react';
import { useContent } from './hooks/useContent';
import { AnimatedBackground } from './components/shared';
import {
  Navigation,
  Hero,
  Features,
  Intelligence,
  Architecture,
  Ecosystem,
  Footer,
} from './components';

// Import design system styles
import './design-system/index.css';

export interface LandingPageProps {
  /**
   * Initial locale (optional, will auto-detect if not provided)
   */
  initialLocale?: 'pt' | 'en';

  /**
   * Callback when CTA buttons are clicked
   */
  onCtaClick?: () => void;

  /**
   * Callback when demo button is clicked
   */
  onDemoClick?: () => void;
}

/**
 * LandingPage Component
 *
 * The main entry point for the landing page.
 * Assembles all sections and handles i18n.
 *
 * @example
 * // Basic usage
 * <LandingPage />
 *
 * @example
 * // With callbacks
 * <LandingPage
 *   initialLocale="pt"
 *   onCtaClick={() => openSignupModal()}
 *   onDemoClick={() => openDemoVideo()}
 * />
 */
export function LandingPage({
  onCtaClick,
  onDemoClick,
}: LandingPageProps) {
  const { content, locale, toggleLocale, isLoading } = useContent();

  // Handle CTA click with default behavior
  const handleCtaClick = useCallback(() => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      // Default: scroll to contact or open modal
      console.log('CTA clicked - implement signup flow');
    }
  }, [onCtaClick]);

  // Handle demo click
  const handleDemoClick = useCallback(() => {
    if (onDemoClick) {
      onDemoClick();
    } else {
      // Default: open demo video or section
      console.log('Demo clicked - implement demo flow');
    }
  }, [onDemoClick]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-porcelain">
        <div className="animate-breathe">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-prisma to-prisma-dark opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="light-mode min-h-screen bg-porcelain">
      {/* Animated background */}
      <AnimatedBackground
        variant="particles"
        particleCount={40}
        hue={260}
        speed={0.5}
        opacity={0.3}
      />

      {/* Navigation */}
      <Navigation
        content={content.nav}
        locale={locale}
        onToggleLocale={toggleLocale}
        onCtaClick={handleCtaClick}
      />

      {/* Main content */}
      <main>
        {/* Hero Section */}
        <Hero
          content={content.hero}
          onCtaClick={handleCtaClick}
          onDemoClick={handleDemoClick}
        />

        {/* Features Section (MedScribe) */}
        <Features content={content.features} />

        {/* Intelligence Section (ASL) */}
        <Intelligence content={content.intelligence} />

        {/* Architecture Section (Security) */}
        <Architecture content={content.architecture} />

        {/* Ecosystem Section (Roadmap) */}
        <Ecosystem content={content.ecosystem} />
      </main>

      {/* Footer with CTA */}
      <Footer
        ctaContent={content.cta}
        footerContent={content.footer}
        onCtaClick={handleCtaClick}
      />
    </div>
  );
}

export default LandingPage;
