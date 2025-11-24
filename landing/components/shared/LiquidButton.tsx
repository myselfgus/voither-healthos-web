/**
 * ============================================
 * LIQUID BUTTON
 * ============================================
 * Glass + Neumorphic button variants
 * AI-EDITABLE: Modify variants, sizes, and styles
 */

import React from 'react';

export interface LiquidButtonProps {
  children: React.ReactNode;
  variant?: 'glass' | 'glass-primary' | 'neu' | 'neu-primary';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
}

/**
 * Liquid Button Component
 *
 * @example
 * <LiquidButton variant="glass-primary" size="lg" icon={<ArrowRight />}>
 *   Get Started
 * </LiquidButton>
 */
export function LiquidButton({
  children,
  variant = 'glass',
  size = 'md',
  icon,
  iconPosition = 'right',
  fullWidth = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  href,
}: LiquidButtonProps) {
  const variantClasses = {
    glass: 'liquid-glass-button',
    'glass-primary': 'liquid-glass-button liquid-glass-button-primary',
    neu: 'neu-button',
    'neu-primary': 'neu-button neu-button-primary',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const classes = [
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  );
}

export default LiquidButton;
