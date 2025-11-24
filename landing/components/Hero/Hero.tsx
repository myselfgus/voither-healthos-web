/**
 * ============================================
 * HERO SECTION
 * ============================================
 * Main hero with GSAP scroll-triggered animations
 * AI-EDITABLE: Modify animations, layout, and content bindings
 *
 * CONTENT: Edit content in /landing/content/pt.json or en.json
 * ANIMATIONS: Modify GSAP timeline below
 * COLORS: Edit /landing/design-system/tokens.css
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Play } from '@phosphor-icons/react';
import { Badge, LiquidButton, BreathingSphere } from '../shared';
import type { HeroContent } from '../../types/content';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

export interface HeroProps {
  content: HeroContent;
  onCtaClick?: () => void;
  onDemoClick?: () => void;
}

/**
 * Hero Section Component
 *
 * Features:
 * - Scroll-triggered word transformation (burocracia → invisivel)
 * - Breathing sphere animation
 * - Stats counter animation
 * - GSAP-powered entrance animations
 */
export function Hero({ content, onCtaClick, onDemoClick }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const headline = headlineRef.current;
    const highlight = highlightRef.current;
    const stats = statsRef.current;

    if (!section || !headline || !highlight || !stats) return;

    // Create GSAP context for cleanup
    const ctx = gsap.context(() => {
      // Initial entrance animation timeline
      const entranceTl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      entranceTl
        .from('[data-hero-badge]', {
          y: -20,
          opacity: 0,
          duration: 0.6,
        })
        .from(
          '[data-hero-headline] > *',
          {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
          },
          '-=0.3'
        )
        .from(
          '[data-hero-description]',
          {
            y: 20,
            opacity: 0,
            duration: 0.6,
          },
          '-=0.4'
        )
        .from(
          '[data-hero-cta] > *',
          {
            y: 20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
          },
          '-=0.3'
        )
        .from(
          '[data-hero-stats] > *',
          {
            y: 30,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
          },
          '-=0.2'
        )
        .from(
          '[data-hero-sphere]',
          {
            scale: 0.8,
            opacity: 0,
            duration: 1,
          },
          '-=0.8'
        );

      // Scroll-triggered word transformation
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      // Animate highlight word change
      scrollTl.to(highlight, {
        '--word-progress': 1,
        duration: 0.5,
      });

      // Parallax effects
      gsap.to('[data-hero-sphere]', {
        y: 100,
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      // Stats counter animation
      const statValues = stats.querySelectorAll('[data-stat-value]');
      statValues.forEach((stat) => {
        const value = stat.textContent || '';
        const numericValue = parseInt(value.replace(/\D/g, ''), 10);

        if (!isNaN(numericValue) && numericValue > 0) {
          gsap.from(stat, {
            textContent: 0,
            duration: 2,
            ease: 'power2.out',
            snap: { textContent: 1 },
            scrollTrigger: {
              trigger: stat,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
            modifiers: {
              textContent: (value: string) => {
                const num = parseInt(value, 10);
                return value.includes('%') ? `${num}%` : num.toString();
              },
            },
          });
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      id="hero"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-porcelain via-ice/30 to-porcelain"
        aria-hidden="true"
      />

      {/* Breathing sphere - positioned right */}
      <div
        data-hero-sphere
        className="absolute right-[-10%] top-1/2 -translate-y-1/2 opacity-60 lg:opacity-80"
      >
        <BreathingSphere size={500} hue={260} speed={0.8} glowIntensity={0.5} />
      </div>

      {/* Content container */}
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center lg:text-left lg:mx-0">
          {/* Badge */}
          <div data-hero-badge className="mb-6">
            <Badge variant="glass" icon={<span className="w-2 h-2 rounded-full bg-prisma animate-pulse" />}>
              {content.badge}
            </Badge>
          </div>

          {/* Headline */}
          <h1
            ref={headlineRef}
            data-hero-headline
            className="heading-hero mb-6"
          >
            <span className="block">{content.headline.line1}</span>
            <span className="block">
              <span
                ref={highlightRef}
                className="relative inline-block"
                style={{ '--word-progress': 0 } as React.CSSProperties}
              >
                {/* Original word */}
                <span
                  className="text-gradient transition-opacity duration-500"
                  style={{
                    opacity: 'calc(1 - var(--word-progress))',
                  }}
                >
                  {content.headline.highlight}
                </span>
                {/* Transformed word */}
                <span
                  className="absolute inset-0 text-gradient transition-opacity duration-500"
                  style={{
                    opacity: 'var(--word-progress)',
                  }}
                >
                  {content.headline.highlightAlt}
                </span>
              </span>
            </span>
            <span className="block text-text-secondary">
              {content.headline.line2}
            </span>
          </h1>

          {/* Description */}
          <p
            data-hero-description
            className="text-lead max-w-2xl mb-8 lg:mx-0 mx-auto"
          >
            {content.description}
          </p>

          {/* CTAs */}
          <div
            data-hero-cta
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
          >
            <LiquidButton
              variant="neu-primary"
              size="lg"
              icon={<ArrowDown weight="bold" className="w-5 h-5" />}
              onClick={onCtaClick}
            >
              {content.cta.primary}
            </LiquidButton>
            <LiquidButton
              variant="glass"
              size="lg"
              icon={<Play weight="fill" className="w-5 h-5" />}
              iconPosition="left"
              onClick={onDemoClick}
            >
              {content.cta.secondary}
            </LiquidButton>
          </div>

          {/* Stats */}
          <div
            ref={statsRef}
            data-hero-stats
            className="grid grid-cols-3 gap-6 max-w-xl lg:mx-0 mx-auto"
          >
            {content.stats.map((stat, index) => (
              <div
                key={index}
                className="liquid-glass-card p-4 text-center"
              >
                <div
                  data-stat-value
                  className="font-display text-3xl lg:text-4xl font-bold text-prisma mb-1"
                >
                  {stat.value}
                </div>
                <div className="text-small text-text-muted">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <span className="text-xs font-ui uppercase tracking-widest">Scroll</span>
          <ArrowDown weight="bold" className="w-5 h-5" />
        </div>
      </div>
    </section>
  );
}

export default Hero;
