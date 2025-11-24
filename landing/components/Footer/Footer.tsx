/**
 * ============================================
 * FOOTER SECTION
 * ============================================
 * Site footer with CTA, links, and social media
 * AI-EDITABLE: Modify layout, links, and styling
 *
 * CONTENT: Edit content in /landing/content/pt.json or en.json
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  LinkedinLogo,
  XLogo,
  GithubLogo,
  ArrowRight,
} from '@phosphor-icons/react';
import { LiquidButton, LiquidGlassCard } from '../shared';
import type { CTAContent, FooterContent } from '../../types/content';

gsap.registerPlugin(ScrollTrigger);

export interface FooterProps {
  ctaContent: CTAContent;
  footerContent: FooterContent;
  onCtaClick?: () => void;
}

// Social icon map
const socialIcons: Record<string, React.ComponentType<{ weight?: string; className?: string }>> = {
  linkedin: LinkedinLogo,
  twitter: XLogo,
  github: GithubLogo,
};

/**
 * CTA Section Component
 */
function CTASection({
  content,
  onCtaClick,
}: {
  content: CTAContent;
  onCtaClick?: () => void;
}) {
  return (
    <div data-footer-cta className="py-20">
      <LiquidGlassCard className="p-8 lg:p-12 max-w-3xl mx-auto text-center">
        <h2 className="heading-section mb-4">{content.headline}</h2>
        <p className="text-lead mb-8">{content.description}</p>

        <div className="flex flex-col items-center gap-4">
          <LiquidButton
            variant="neu-primary"
            size="lg"
            icon={<ArrowRight weight="bold" className="w-5 h-5" />}
            onClick={onCtaClick}
          >
            {content.button}
          </LiquidButton>
          <span className="text-small text-text-muted">{content.note}</span>
        </div>
      </LiquidGlassCard>
    </div>
  );
}

/**
 * Footer Component
 */
export function Footer({ ctaContent, footerContent, onCtaClick }: FooterProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // CTA animation
      gsap.from('[data-footer-cta] > *', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-footer-cta]',
          start: 'top 80%',
        },
      });

      // Footer content animation
      gsap.from('[data-footer-content] > *', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-footer-content]',
          start: 'top 90%',
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={sectionRef} className="relative overflow-hidden">
      {/* CTA Section */}
      <div className="container">
        <CTASection content={ctaContent} onCtaClick={onCtaClick} />
      </div>

      {/* Footer Content */}
      <div className="liquid-glass-panel py-12">
        <div className="container">
          <div data-footer-content className="flex flex-col lg:flex-row justify-between items-center gap-8">
            {/* Logo and tagline */}
            <div className="text-center lg:text-left">
              <div className="font-display text-2xl font-bold text-text-primary mb-2">
                Voither <span className="text-gradient">HealthOS</span>
              </div>
              <p className="text-small text-text-secondary max-w-xs">
                {footerContent.tagline}
              </p>
            </div>

            {/* Values */}
            <div className="flex flex-wrap justify-center gap-4">
              {footerContent.values.map((value, index) => (
                <span
                  key={index}
                  className="text-small text-text-muted flex items-center gap-2"
                >
                  {index > 0 && <span className="w-1 h-1 rounded-full bg-text-muted/50" />}
                  {value}
                </span>
              ))}
            </div>

            {/* Social links */}
            <div className="flex gap-3">
              {footerContent.social.map((social, index) => {
                const IconComponent = socialIcons[social.platform] || GithubLogo;

                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neu-icon-btn w-10 h-10"
                    aria-label={social.platform}
                  >
                    <IconComponent weight="fill" className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-8 pt-8 border-t border-glass-border">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {/* Copyright */}
              <div className="text-small text-text-muted">
                &copy; {footerContent.copyright}. All rights reserved.
              </div>

              {/* Links */}
              <nav className="flex gap-6">
                {footerContent.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.href}
                    className="link-subtle text-small"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
