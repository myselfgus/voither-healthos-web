/**
 * ============================================
 * ARCHITECTURE SECTION
 * ============================================
 * Security and sovereignty visualization with interactive capsule grid
 * AI-EDITABLE: Modify grid behavior, animations, and content
 *
 * CONTENT: Edit content in /landing/content/pt.json or en.json
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Shield, UserCheck, Lock, LockOpen } from '@phosphor-icons/react';
import { Badge, LiquidGlassCard } from '../shared';
import type { ArchitectureContent } from '../../types/content';

gsap.registerPlugin(ScrollTrigger);

export interface ArchitectureProps {
  content: ArchitectureContent;
}

// Icon map
const iconMap: Record<string, React.ComponentType<{ weight?: string; className?: string }>> = {
  shield: Shield,
  'user-check': UserCheck,
  lock: Lock,
};

interface CapsuleState {
  isNear: boolean;
  isUnlocked: boolean;
}

/**
 * Interactive Capsule Grid
 * Visualizes isolated PatientActors
 */
function CapsuleGrid({ title, description }: { title: string; description: string }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [capsules, setCapsules] = useState<CapsuleState[]>(
    Array(24).fill({ isNear: false, isUnlocked: false })
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const capsuleElements = grid.querySelectorAll('[data-capsule]');
    const newStates: CapsuleState[] = [];

    capsuleElements.forEach((capsule, index) => {
      const capsuleRect = capsule.getBoundingClientRect();
      const capsuleX = capsuleRect.left - rect.left + capsuleRect.width / 2;
      const capsuleY = capsuleRect.top - rect.top + capsuleRect.height / 2;

      const distance = Math.sqrt(
        Math.pow(mouseX - capsuleX, 2) + Math.pow(mouseY - capsuleY, 2)
      );

      newStates[index] = {
        isNear: distance < 80,
        isUnlocked: distance < 40,
      };
    });

    setCapsules(newStates);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCapsules(Array(24).fill({ isNear: false, isUnlocked: false }));
  }, []);

  return (
    <div className="relative">
      <div className="mb-4">
        <h4 className="heading-small mb-1">{title}</h4>
        <p className="text-small text-text-muted">{description}</p>
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-6 gap-2 p-4 neu-inset rounded-2xl"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {capsules.map((state, index) => (
          <div
            key={index}
            data-capsule
            className={`
              relative aspect-square rounded-lg transition-all duration-300 cursor-pointer
              flex items-center justify-center
              ${
                state.isUnlocked
                  ? 'bg-gradient-to-br from-prisma/20 to-prisma/10 shadow-lg scale-110'
                  : state.isNear
                  ? 'bg-ice/80 scale-105'
                  : 'bg-ice/40'
              }
            `}
          >
            {state.isUnlocked ? (
              <LockOpen weight="duotone" className="w-4 h-4 text-prisma" />
            ) : (
              <Lock
                weight="duotone"
                className={`w-3 h-3 transition-opacity duration-300 ${
                  state.isNear ? 'opacity-60' : 'opacity-20'
                }`}
              />
            )}

            {/* Glow effect when unlocked */}
            {state.isUnlocked && (
              <div className="absolute inset-0 rounded-lg bg-prisma/10 animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Architecture Section Component
 */
export function Architecture({ content }: ArchitectureProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.from('[data-arch-header] > *', {
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

      // Feature cards animation
      gsap.from('[data-arch-feature]', {
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-arch-features]',
          start: 'top 75%',
        },
      });

      // Grid animation
      gsap.from('[data-arch-grid]', {
        scale: 0.95,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-arch-grid]',
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
      id="seguranca"
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-ice/30 via-porcelain to-porcelain"
        aria-hidden="true"
      />

      <div className="container relative z-10">
        {/* Header */}
        <div data-arch-header className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="glass" className="mb-4">
            {content.badge}
          </Badge>
          <h2 className="heading-section mb-4">{content.headline}</h2>
          <p className="text-lead">{content.description}</p>
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Feature cards */}
          <div data-arch-features className="space-y-6">
            {content.features.map((feature, index) => {
              const IconComponent = iconMap[feature.icon] || Shield;

              return (
                <div key={index} data-arch-feature>
                  <LiquidGlassCard className="p-6" hover>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="neu-circle w-14 h-14">
                          <IconComponent weight="duotone" className="w-7 h-7 text-prisma" />
                        </div>
                      </div>
                      <div>
                        <h3 className="heading-card mb-2">{feature.title}</h3>
                        <p className="text-body text-text-secondary">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </LiquidGlassCard>
                </div>
              );
            })}
          </div>

          {/* Interactive grid */}
          <div data-arch-grid>
            <LiquidGlassCard className="p-6" variant="subtle">
              <CapsuleGrid
                title={content.grid.title}
                description={content.grid.description}
              />
            </LiquidGlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Architecture;
