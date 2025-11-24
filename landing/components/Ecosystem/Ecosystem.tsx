/**
 * ============================================
 * ECOSYSTEM SECTION
 * ============================================
 * Product roadmap and ecosystem visualization
 * AI-EDITABLE: Modify products, status colors, and animations
 *
 * CONTENT: Edit content in /landing/content/pt.json or en.json
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Waveform,
  FileText,
  CalendarBlank,
  VideoCamera,
} from '@phosphor-icons/react';
import { Badge, LiquidGlassCard } from '../shared';
import type { EcosystemContent, EcosystemProduct } from '../../types/content';

gsap.registerPlugin(ScrollTrigger);

export interface EcosystemProps {
  content: EcosystemContent;
}

// Icon map
const iconMap: Record<string, React.ComponentType<{ weight?: string; className?: string }>> = {
  waveform: Waveform,
  document: FileText,
  calendar: CalendarBlank,
  video: VideoCamera,
};

// Status color map
const statusColors: Record<EcosystemProduct['status'], { bg: string; text: string; badge: string }> = {
  live: {
    bg: 'bg-success/10',
    text: 'text-success',
    badge: 'success',
  },
  beta: {
    bg: 'bg-info/10',
    text: 'text-info',
    badge: 'info',
  },
  development: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    badge: 'warning',
  },
  planned: {
    bg: 'bg-text-muted/10',
    text: 'text-text-muted',
    badge: 'default',
  },
};

/**
 * Product Card Component
 */
function ProductCard({ product, index }: { product: EcosystemProduct; index: number }) {
  const IconComponent = iconMap[product.icon] || FileText;
  const colors = statusColors[product.status];

  return (
    <div data-eco-product className="relative">
      {/* Connection line */}
      {index < 3 && (
        <div
          className="hidden lg:block absolute top-1/2 -right-6 w-12 h-px bg-gradient-to-r from-glass-border to-transparent"
          aria-hidden="true"
        />
      )}

      <LiquidGlassCard className="p-6 h-full" hover>
        <div className="flex flex-col h-full">
          {/* Icon and status */}
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${colors.bg}`}>
              <IconComponent weight="duotone" className={`w-6 h-6 ${colors.text}`} />
            </div>
            <Badge
              variant={colors.badge as 'success' | 'info' | 'warning' | 'default'}
              size="sm"
              pulse={product.status === 'live'}
            >
              {product.statusLabel}
            </Badge>
          </div>

          {/* Content */}
          <h3 className="heading-card mb-2">{product.name}</h3>
          <p className="text-body text-text-secondary flex-grow">
            {product.description}
          </p>

          {/* Progress indicator */}
          <div className="mt-4 pt-4 border-t border-glass-border">
            <div className="neu-progress h-1.5">
              <div
                className="neu-progress-bar"
                style={{
                  width:
                    product.status === 'live'
                      ? '100%'
                      : product.status === 'beta'
                      ? '75%'
                      : product.status === 'development'
                      ? '40%'
                      : '10%',
                }}
              />
            </div>
          </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
}

/**
 * TAM Display Component
 */
function TAMDisplay({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-baseline gap-2">
        <span className="font-display text-5xl lg:text-6xl font-bold text-gradient">
          {value}
        </span>
      </div>
      <p className="text-body text-text-secondary mt-2">{label}</p>
    </div>
  );
}

/**
 * Ecosystem Section Component
 */
export function Ecosystem({ content }: EcosystemProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.from('[data-eco-header] > *', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
        },
      });

      // Product cards animation
      gsap.from('[data-eco-product]', {
        y: 60,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-eco-products]',
          start: 'top 75%',
        },
      });

      // TAM animation
      gsap.from('[data-eco-tam]', {
        scale: 0.9,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: '[data-eco-tam]',
          start: 'top 85%',
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="section-lg relative overflow-hidden"
      id="ecossistema"
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-porcelain via-ice/20 to-porcelain"
        aria-hidden="true"
      />

      <div className="container relative z-10">
        {/* Header */}
        <div data-eco-header className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="glass" className="mb-4">
            {content.badge}
          </Badge>
          <h2 className="heading-section mb-4">{content.headline}</h2>
          <p className="text-lead">{content.description}</p>
        </div>

        {/* Product grid */}
        <div data-eco-products className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {content.products.map((product, index) => (
            <ProductCard key={index} product={product} index={index} />
          ))}
        </div>

        {/* TAM display */}
        <div data-eco-tam>
          <LiquidGlassCard className="p-8 max-w-md mx-auto" variant="subtle">
            <TAMDisplay value={content.tam.value} label={content.tam.label} />
          </LiquidGlassCard>
        </div>
      </div>
    </section>
  );
}

export default Ecosystem;
