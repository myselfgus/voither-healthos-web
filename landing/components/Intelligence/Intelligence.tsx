/**
 * ============================================
 * INTELLIGENCE SECTION (ASL)
 * ============================================
 * Audio Signal Layer - Clinical intelligence visualization
 * AI-EDITABLE: Modify waveform, markers, and animations
 *
 * CONTENT: Edit content in /landing/content/pt.json or en.json
 */

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Info } from '@phosphor-icons/react';
import { Badge, LiquidGlassCard } from '../shared';
import type { IntelligenceContent } from '../../types/content';

gsap.registerPlugin(ScrollTrigger);

export interface IntelligenceProps {
  content: IntelligenceContent;
}

/**
 * Audio Waveform Visualization
 */
function AudioWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const centerY = height / 2;

    let time = 0;

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      time += 0.02;

      // Draw waveform
      const bars = 80;
      const barWidth = width / bars;
      const maxHeight = height * 0.8;

      for (let i = 0; i < bars; i++) {
        const x = i * barWidth;

        // Create organic wave pattern
        const wave1 = Math.sin(i * 0.15 + time) * 0.5;
        const wave2 = Math.sin(i * 0.08 + time * 0.7) * 0.3;
        const wave3 = Math.sin(i * 0.25 + time * 1.2) * 0.2;
        const combined = (wave1 + wave2 + wave3 + 1) / 2;

        const barHeight = combined * maxHeight * 0.5 + maxHeight * 0.1;

        // Gradient color based on position
        const hue = 260 + (i / bars) * 30;
        const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
        gradient.addColorStop(0, `oklch(0.7 0.12 ${hue} / 0.8)`);
        gradient.addColorStop(0.5, `oklch(0.6 0.15 ${hue})`);
        gradient.addColorStop(1, `oklch(0.7 0.12 ${hue} / 0.8)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          x + barWidth * 0.1,
          centerY - barHeight / 2,
          barWidth * 0.8,
          barHeight,
          2
        );
        ctx.fill();
      }

      // Draw highlight markers at certain points
      const markers = [0.2, 0.45, 0.7, 0.85];
      markers.forEach((pos) => {
        const x = pos * width;
        const pulse = Math.sin(time * 3 + pos * 10) * 0.5 + 0.5;

        ctx.fillStyle = `oklch(0.8 0.15 ${260 + pos * 30} / ${0.3 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, height * 0.15, 4 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();

        // Vertical line
        ctx.strokeStyle = `oklch(0.7 0.1 260 / ${0.1 + pulse * 0.1})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.2);
        ctx.lineTo(x, height * 0.8);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-40"
      style={{ width: '100%', height: 160 }}
    />
  );
}

/**
 * Confidence meter visualization
 */
function ConfidenceMeter({ value, animate }: { value: number; animate: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (animate) {
      gsap.to(
        { value: 0 },
        {
          value,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: function () {
            setDisplayValue(Math.round(this.targets()[0].value));
          },
        }
      );
    }
  }, [animate, value]);

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="oklch(0.92 0.005 264)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="url(#confidenceGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300"
        />
        <defs>
          <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.7 0.12 260)" />
            <stop offset="100%" stopColor="oklch(0.6 0.15 280)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-lg font-semibold text-text-primary">
          {displayValue}%
        </span>
      </div>
    </div>
  );
}

/**
 * Intelligence Section Component
 */
export function Intelligence({ content }: IntelligenceProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [animateMeters, setAnimateMeters] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.from('[data-intel-header] > *', {
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

      // Waveform animation
      gsap.from('[data-intel-waveform]', {
        scale: 0.95,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
        },
      });

      // Marker cards animation
      gsap.from('[data-intel-marker]', {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-intel-markers]',
          start: 'top 80%',
          onEnter: () => setAnimateMeters(true),
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="section-lg relative overflow-hidden bg-gradient-to-b from-porcelain to-ice/30"
      id="como-funciona"
    >
      <div className="container">
        {/* Header */}
        <div data-intel-header className="max-w-3xl mx-auto text-center mb-12">
          <Badge variant="glass" className="mb-4">
            {content.badge}
          </Badge>
          <h2 className="heading-section mb-4">{content.headline}</h2>
          <p className="text-lead">{content.description}</p>
        </div>

        {/* Waveform visualization */}
        <div data-intel-waveform className="mb-12">
          <LiquidGlassCard className="p-6" variant="subtle">
            <AudioWaveform />
          </LiquidGlassCard>
        </div>

        {/* Clinical markers grid */}
        <div data-intel-markers className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {content.markers.map((marker, index) => (
            <div key={index} data-intel-marker>
              <LiquidGlassCard className="p-6 h-full" hover>
                <div className="flex flex-col items-center text-center">
                  <ConfidenceMeter value={marker.confidence} animate={animateMeters} />
                  <h3 className="heading-small mt-4 mb-2">{marker.name}</h3>
                  <p className="text-small text-text-muted">{marker.description}</p>
                </div>
              </LiquidGlassCard>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
          <Info weight="fill" className="w-4 h-4" />
          <span>{content.disclaimer}</span>
        </div>
      </div>
    </section>
  );
}

export default Intelligence;
