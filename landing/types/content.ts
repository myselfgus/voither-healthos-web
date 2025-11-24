/**
 * ============================================
 * LANDING PAGE CONTENT TYPES
 * ============================================
 * TypeScript definitions for i18n content
 * AI-EDITABLE: Add new content fields here
 */

export type Locale = 'pt' | 'en';

export interface NavLink {
  label: string;
  href: string;
}

export interface NavContent {
  logo: string;
  links: NavLink[];
  cta: string;
  languageToggle: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface HeroContent {
  badge: string;
  headline: {
    line1: string;
    highlight: string;
    highlightAlt: string;
    line2: string;
  };
  description: string;
  cta: {
    primary: string;
    secondary: string;
  };
  stats: HeroStat[];
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: string;
}

export interface FeaturesContent {
  badge: string;
  headline: string;
  description: string;
  items: FeatureItem[];
  demo: {
    label: string;
    before: string;
    after: string;
  };
}

export interface ClinicalMarker {
  name: string;
  description: string;
  confidence: number;
}

export interface IntelligenceContent {
  badge: string;
  headline: string;
  description: string;
  markers: ClinicalMarker[];
  disclaimer: string;
}

export interface ArchitectureFeature {
  title: string;
  description: string;
  icon: string;
}

export interface ArchitectureContent {
  badge: string;
  headline: string;
  description: string;
  features: ArchitectureFeature[];
  grid: {
    title: string;
    description: string;
  };
}

export interface EcosystemProduct {
  name: string;
  description: string;
  status: 'live' | 'beta' | 'development' | 'planned';
  statusLabel: string;
  icon: string;
}

export interface EcosystemContent {
  badge: string;
  headline: string;
  description: string;
  products: EcosystemProduct[];
  tam: {
    value: string;
    label: string;
  };
}

export interface CTAContent {
  headline: string;
  description: string;
  button: string;
  note: string;
}

export interface SocialLink {
  platform: string;
  href: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterContent {
  tagline: string;
  copyright: string;
  links: FooterLink[];
  values: string[];
  social: SocialLink[];
}

export interface ContentMeta {
  language: string;
  name: string;
  description: string;
  lastUpdated: string;
}

export interface LandingContent {
  _meta: ContentMeta;
  nav: NavContent;
  hero: HeroContent;
  features: FeaturesContent;
  intelligence: IntelligenceContent;
  architecture: ArchitectureContent;
  ecosystem: EcosystemContent;
  cta: CTAContent;
  footer: FooterContent;
}
