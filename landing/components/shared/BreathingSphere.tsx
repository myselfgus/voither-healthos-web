/**
 * ============================================
 * BREATHING SPHERE
 * ============================================
 * Animated glowing sphere with liquid morphing effect
 * AI-EDITABLE: Modify colors, size, and animation timing
 */

import React, { useRef, useEffect } from 'react';

export interface BreathingSphereProps {
  /**
   * Sphere diameter in pixels
   * @default 300
   */
  size?: number;

  /**
   * Primary color hue (0-360)
   * @default 260 (violet/purple)
   */
  hue?: number;

  /**
   * Animation speed multiplier
   * @default 1
   */
  speed?: number;

  /**
   * Glow intensity (0-1)
   * @default 0.6
   */
  glowIntensity?: number;

  className?: string;
}

/**
 * Breathing Sphere Component
 * Canvas-based animated sphere with organic movement
 *
 * @example
 * <BreathingSphere size={400} hue={260} speed={1.2} />
 */
export function BreathingSphere({
  size = 300,
  hue = 260,
  speed = 1,
  glowIntensity = 0.6,
  className = '',
}: BreathingSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.35;

    let time = 0;

    function draw() {
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Update time
      time += 0.016 * speed;

      // Calculate breathing effect
      const breathe = 1 + Math.sin(time) * 0.05;
      const morphX = Math.sin(time * 0.7) * 0.02;
      const morphY = Math.cos(time * 0.5) * 0.02;

      // Dynamic hue shift
      const dynamicHue = hue + Math.sin(time * 0.3) * 15;

      // Outer glow
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.5,
        centerX,
        centerY,
        baseRadius * 1.5
      );
      glowGradient.addColorStop(0, `oklch(0.7 0.12 ${dynamicHue} / ${glowIntensity * 0.4})`);
      glowGradient.addColorStop(0.5, `oklch(0.6 0.15 ${dynamicHue} / ${glowIntensity * 0.2})`);
      glowGradient.addColorStop(1, `oklch(0.5 0.12 ${dynamicHue} / 0)`);

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.5 * breathe, 0, Math.PI * 2);
      ctx.fill();

      // Main sphere gradient
      const sphereGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.3,
        centerY - baseRadius * 0.3,
        0,
        centerX,
        centerY,
        baseRadius * breathe
      );
      sphereGradient.addColorStop(0, `oklch(0.85 0.08 ${dynamicHue})`);
      sphereGradient.addColorStop(0.4, `oklch(0.70 0.12 ${dynamicHue})`);
      sphereGradient.addColorStop(0.7, `oklch(0.55 0.15 ${dynamicHue + 10})`);
      sphereGradient.addColorStop(1, `oklch(0.40 0.12 ${dynamicHue + 20})`);

      // Draw morphing sphere
      ctx.fillStyle = sphereGradient;
      ctx.beginPath();

      // Create organic shape using bezier curves
      const points = 8;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radiusOffset =
          1 +
          Math.sin(angle * 3 + time) * morphX +
          Math.cos(angle * 2 + time * 0.8) * morphY;
        const r = baseRadius * breathe * radiusOffset;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevAngle = ((i - 1) / points) * Math.PI * 2;
          const prevRadiusOffset =
            1 +
            Math.sin(prevAngle * 3 + time) * morphX +
            Math.cos(prevAngle * 2 + time * 0.8) * morphY;
          const prevR = baseRadius * breathe * prevRadiusOffset;

          const cp1x = centerX + Math.cos(prevAngle + Math.PI / points) * prevR * 1.1;
          const cp1y = centerY + Math.sin(prevAngle + Math.PI / points) * prevR * 1.1;
          const cp2x = centerX + Math.cos(angle - Math.PI / points) * r * 1.1;
          const cp2y = centerY + Math.sin(angle - Math.PI / points) * r * 1.1;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Highlight overlay
      const highlightGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.4,
        centerY - baseRadius * 0.4,
        0,
        centerX,
        centerY,
        baseRadius * 0.8
      );
      highlightGradient.addColorStop(0, 'oklch(1 0 0 / 0.3)');
      highlightGradient.addColorStop(0.3, 'oklch(1 0 0 / 0.1)');
      highlightGradient.addColorStop(1, 'oklch(1 0 0 / 0)');

      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(
        centerX - baseRadius * 0.15,
        centerY - baseRadius * 0.15,
        baseRadius * 0.6,
        0,
        Math.PI * 2
      );
      ctx.fill();

      animationRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, hue, speed, glowIntensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
      }}
      aria-hidden="true"
    />
  );
}

export default BreathingSphere;
