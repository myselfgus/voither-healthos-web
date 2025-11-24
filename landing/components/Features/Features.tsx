/**
 * ============================================
 * FEATURES SECTION (MedScribe)
 * ============================================
 * Product features with particle chaos-to-order animation
 * AI-EDITABLE: Modify animations, layout, and content bindings
 *
 * CONTENT: Edit content in /landing/content/pt.json or en.json
 * ANIMATIONS: Modify particle system and GSAP timeline below
 */

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Waveform, FileText, EyeSlash } from '@phosphor-icons/react';
import { Badge, LiquidGlassCard } from '../shared';
import type { FeaturesContent } from '../../types/content';

gsap.registerPlugin(ScrollTrigger);

export interface FeaturesProps {
  content: FeaturesContent;
}

// Icon map for dynamic rendering
const iconMap: Record<string, React.ComponentType<{ weight?: string; className?: string }>> = {
  waveform: Waveform,
  document: FileText,
  'eye-off': EyeSlash,
};

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  delay: number;
}

/**
 * Particle Demo Component
 * Visualizes chaos-to-order transformation
 */
function ParticleDemo({
  beforeLabel,
  afterLabel,
}: {
  beforeLabel: string;
  afterLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [phase, setPhase] = useState<'chaos' | 'order'>('chaos');
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Initialize particles
    const particleCount = 50;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Create SOAP note grid positions (order state)
    const gridCols = 10;
    const gridRows = 5;
    const gridSpacingX = rect.width * 0.6 / gridCols;
    const gridSpacingY = rect.height * 0.6 / gridRows;
    const gridOffsetX = rect.width * 0.2;
    const gridOffsetY = rect.height * 0.2;

    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);

      particlesRef.current.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        targetX: gridOffsetX + col * gridSpacingX,
        targetY: gridOffsetY + row * gridSpacingY,
        size: 3 + Math.random() * 2,
        color: `oklch(0.7 0.12 ${260 + Math.random() * 30})`,
        delay: Math.random() * 0.5,
      });
    }

    // Animation loop
    let progress = 0;

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, rect.width, rect.height);

      particlesRef.current.forEach((particle) => {
        let x: number, y: number;

        if (phase === 'chaos') {
          // Chaotic movement
          const time = Date.now() * 0.001;
          x = particle.x + Math.sin(time + particle.delay * 10) * 20;
          y = particle.y + Math.cos(time * 0.8 + particle.delay * 10) * 15;
        } else {
          // Interpolate to order
          const easedProgress = Math.min(1, Math.max(0, (progress - particle.delay) / 1.5));
          const easeOut = 1 - Math.pow(1 - easedProgress, 3);

          x = particle.x + (particle.targetX - particle.x) * easeOut;
          y = particle.y + (particle.targetY - particle.y) * easeOut;
        }

        // Draw particle glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 2);
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw particle core
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connection lines in order phase
      if (phase === 'order' && progress > 1) {
        ctx.strokeStyle = 'oklch(0.7 0.08 260 / 0.2)';
        ctx.lineWidth = 1;

        // Draw horizontal lines
        for (let row = 0; row < gridRows; row++) {
          const y = gridOffsetY + row * gridSpacingY;
          ctx.beginPath();
          ctx.moveTo(gridOffsetX, y);
          ctx.lineTo(gridOffsetX + (gridCols - 1) * gridSpacingX, y);
          ctx.stroke();
        }
      }

      if (phase === 'order') {
        progress += 0.016;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Set up scroll trigger to start animation
    ScrollTrigger.create({
      trigger: container,
      start: 'top 60%',
      onEnter: () => {
        if (!isAnimating) {
          setIsAnimating(true);
          setTimeout(() => setPhase('order'), 500);
        }
      },
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase, isAnimating]);

  return (
    <div ref={containerRef} className="relative w-full h-64 lg:h-80">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Labels */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs font-mono">
        <span
          className={`transition-opacity duration-500 ${
            phase === 'chaos' ? 'opacity-100' : 'opacity-30'
          }`}
        >
          {beforeLabel}
        </span>
        <span
          className={`transition-opacity duration-500 ${
            phase === 'order' ? 'opacity-100' : 'opacity-30'
          }`}
        >
          {afterLabel}
        </span>
      </div>
    </div>
  );
}

/**
 * Features Section Component
 */
export function Features({ content }: FeaturesProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Animate feature cards on scroll
      gsap.from('[data-feature-card]', {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
        },
      });

      // Animate section header
      gsap.from('[data-features-header] > *', {
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
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="section-lg relative overflow-hidden"
      id="produto"
    >
      {/* Background accent */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-porcelain via-ice/20 to-porcelain"
        aria-hidden="true"
      />

      <div className="container relative z-10">
        {/* Header */}
        <div data-features-header className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="info" className="mb-4">
            {content.badge}
          </Badge>
          <h2 className="heading-section mb-4">{content.headline}</h2>
          <p className="text-lead">{content.description}</p>
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Feature cards */}
          <div className="space-y-6">
            {content.items.map((item, index) => {
              const IconComponent = iconMap[item.icon] || FileText;

              return (
                <div key={index} data-feature-card>
                  <LiquidGlassCard className="p-6" hover>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="neu-icon-btn">
                          <IconComponent weight="duotone" className="w-6 h-6 text-prisma" />
                        </div>
                      </div>
                      <div>
                        <h3 className="heading-card mb-2">{item.title}</h3>
                        <p className="text-body text-text-secondary">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </LiquidGlassCard>
                </div>
              );
            })}
          </div>

          {/* Particle demo */}
          <div data-feature-card>
            <LiquidGlassCard className="p-6" variant="subtle">
              <div className="mb-4">
                <span className="text-caption">{content.demo.label}</span>
              </div>
              <ParticleDemo
                beforeLabel={content.demo.before}
                afterLabel={content.demo.after}
              />
            </LiquidGlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Features;
