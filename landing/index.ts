/**
 * ============================================
 * VOITHER HEALTHOS LANDING PAGE
 * ============================================
 * Main entry point for the landing page module
 *
 * USAGE:
 * ```tsx
 * import { LandingPage } from './landing';
 *
 * function App() {
 *   return <LandingPage onCtaClick={() => console.log('Signup!')} />;
 * }
 * ```
 */

// Main component
export { LandingPage } from './LandingPage';
export type { LandingPageProps } from './LandingPage';

// Individual components (for custom layouts)
export * from './components';

// Content hooks and types
export { useContent, useSection } from './hooks/useContent';
export type { LandingContent, Locale } from './types/content';

// Re-export content types
export type {
  HeroContent,
  FeaturesContent,
  IntelligenceContent,
  ArchitectureContent,
  EcosystemContent,
  FooterContent,
  NavContent,
  CTAContent,
} from './types/content';
