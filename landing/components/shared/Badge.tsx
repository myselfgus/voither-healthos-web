/**
 * ============================================
 * BADGE COMPONENT
 * ============================================
 * Status and label badges with glass effect
 * AI-EDITABLE: Modify variants and colors
 */

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'glass';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

/**
 * Badge Component
 *
 * @example
 * <Badge variant="success" pulse>Live</Badge>
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  pulse = false,
  className = '',
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 font-ui font-medium uppercase tracking-wide';

  const variantClasses = {
    default: 'bg-ice text-text-secondary border border-glass-border',
    success: 'liquid-glass-badge-success',
    warning: 'bg-warning/15 border border-warning/30 text-warning',
    info: 'liquid-glass-badge-info',
    glass: 'liquid-glass-badge',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs rounded-full',
    md: 'px-3 py-1 text-xs rounded-full',
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export default Badge;
