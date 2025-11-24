/**
 * ============================================
 * ANIMATED BACKGROUND
 * ============================================
 * Particle system and gradient animations for sections
 * AI-EDITABLE: Modify particle count, colors, behavior
 */

import React, { useRef, useEffect } from 'react';

export interface AnimatedBackgroundProps {
  /**
   * Background variant
   * @default 'particles'
   */
  variant?: 'particles' | 'gradient' | 'mesh' | 'noise';

  /**
   * Number of particles (for particles variant)
   * @default 50
   */
  particleCount?: number;

  /**
   * Primary color hue (0-360)
   * @default 260
   */
  hue?: number;

  /**
   * Animation speed multiplier
   * @default 1
   */
  speed?: number;

  /**
   * Opacity of the background (0-1)
   * @default 0.5
   */
  opacity?: number;

  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
}

/**
 * Animated Background Component
 *
 * @example
 * <AnimatedBackground variant="particles" particleCount={80} hue={260} />
 */
export function AnimatedBackground({
  variant = 'particles',
  particleCount = 50,
  hue = 260,
  speed = 1,
  opacity = 0.5,
  className = '',
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      // Reinitialize particles on resize
      if (variant === 'particles') {
        initParticles();
      }
    };

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.5 * speed,
          vy: (Math.random() - 0.5) * 0.5 * speed,
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          hue: hue + (Math.random() - 0.5) * 30,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let time = 0;

    const drawParticles = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      time += 0.01 * speed;

      particlesRef.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = window.innerWidth;
        if (particle.x > window.innerWidth) particle.x = 0;
        if (particle.y < 0) particle.y = window.innerHeight;
        if (particle.y > window.innerHeight) particle.y = 0;

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 3
        );
        gradient.addColorStop(0, `oklch(0.7 0.12 ${particle.hue} / ${particle.alpha * opacity})`);
        gradient.addColorStop(0.5, `oklch(0.6 0.10 ${particle.hue} / ${particle.alpha * opacity * 0.5})`);
        gradient.addColorStop(1, `oklch(0.5 0.08 ${particle.hue} / 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections to nearby particles
        particlesRef.current.slice(index + 1).forEach((other) => {
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const alpha = (1 - distance / 150) * 0.2 * opacity;
            ctx.strokeStyle = `oklch(0.7 0.08 ${hue} / ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(drawParticles);
    };

    const drawGradient = () => {
      if (!ctx) return;

      time += 0.005 * speed;

      // Animated gradient background
      const gradient = ctx.createLinearGradient(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );

      const hue1 = hue + Math.sin(time) * 20;
      const hue2 = hue + 40 + Math.cos(time * 0.7) * 20;

      gradient.addColorStop(0, `oklch(0.98 0.01 ${hue1} / ${opacity * 0.5})`);
      gradient.addColorStop(0.5, `oklch(0.95 0.02 ${hue2} / ${opacity * 0.3})`);
      gradient.addColorStop(1, `oklch(0.98 0.01 ${hue1} / ${opacity * 0.5})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      animationRef.current = requestAnimationFrame(drawGradient);
    };

    const drawMesh = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      time += 0.01 * speed;

      const gridSize = 60;
      const cols = Math.ceil(window.innerWidth / gridSize) + 1;
      const rows = Math.ceil(window.innerHeight / gridSize) + 1;

      ctx.strokeStyle = `oklch(0.7 0.08 ${hue} / ${opacity * 0.15})`;
      ctx.lineWidth = 1;

      // Draw mesh with wave distortion
      for (let i = 0; i < cols; i++) {
        ctx.beginPath();
        for (let j = 0; j < rows; j++) {
          const x = i * gridSize + Math.sin(j * 0.3 + time) * 10;
          const y = j * gridSize + Math.cos(i * 0.3 + time) * 10;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      for (let j = 0; j < rows; j++) {
        ctx.beginPath();
        for (let i = 0; i < cols; i++) {
          const x = i * gridSize + Math.sin(j * 0.3 + time) * 10;
          const y = j * gridSize + Math.cos(i * 0.3 + time) * 10;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(drawMesh);
    };

    // Start appropriate animation
    switch (variant) {
      case 'particles':
        initParticles();
        drawParticles();
        break;
      case 'gradient':
        drawGradient();
        break;
      case 'mesh':
        drawMesh();
        break;
      default:
        drawParticles();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [variant, particleCount, hue, speed, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  );
}

export default AnimatedBackground;
