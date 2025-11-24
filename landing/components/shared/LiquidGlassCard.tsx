/**
 * ============================================
 * LIQUID GLASS CARD
 * ============================================
 * Apple-inspired glass morphism card component
 * AI-EDITABLE: Modify variants and styles
 */

import React from 'react';

export interface LiquidGlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'heavy' | 'dark';
  hover?: boolean;
  shimmer?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
}

/**
 * Liquid Glass Card Component
 *
 * @example
 * <LiquidGlassCard variant="default" hover shimmer>
 *   <h3>Card Title</h3>
 *   <p>Card content</p>
 * </LiquidGlassCard>
 */
export function LiquidGlassCard({
  children,
  variant = 'default',
  hover = true,
  shimmer = false,
  className = '',
  as: Component = 'div',
  onClick,
}: LiquidGlassCardProps) {
  const baseClasses = 'liquid-glass-card';

  const variantClasses = {
    default: '',
    subtle: 'glass-subtle',
    heavy: 'glass-heavy',
    dark: 'glass-dark',
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    hover ? 'liquid-refraction' : '',
    shimmer ? 'liquid-shimmer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} onClick={onClick}>
      <div className="relative z-10">{children}</div>
    </Component>
  );
}

export default LiquidGlassCard;
