/**
 * ============================================
 * CONTENT HOOK
 * ============================================
 * Hook for accessing i18n content
 * AI-EDITABLE: Modify to change content loading behavior
 */

import { useState, useEffect, useCallback } from 'react';
import type { LandingContent, Locale } from '../types/content';

// Static imports for content (bundled at build time)
import ptContent from '../content/pt.json';
import enContent from '../content/en.json';

const contentMap: Record<Locale, LandingContent> = {
  pt: ptContent as LandingContent,
  en: enContent as LandingContent,
};

/**
 * Detects user's preferred locale from browser
 */
function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'pt';

  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const urlLocale = urlParams.get('lang');
  if (urlLocale === 'en' || urlLocale === 'pt') {
    return urlLocale;
  }

  // Check localStorage
  const storedLocale = localStorage.getItem('healthos-locale');
  if (storedLocale === 'en' || storedLocale === 'pt') {
    return storedLocale;
  }

  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('pt')) return 'pt';
  if (browserLang.startsWith('en')) return 'en';

  // Default to Portuguese
  return 'pt';
}

/**
 * Hook to access landing page content
 *
 * @example
 * const { content, locale, setLocale } = useContent();
 * console.log(content.hero.headline);
 */
export function useContent() {
  const [locale, setLocaleState] = useState<Locale>('pt');
  const [content, setContent] = useState<LandingContent>(contentMap.pt);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize locale on mount
  useEffect(() => {
    const detectedLocale = detectLocale();
    setLocaleState(detectedLocale);
    setContent(contentMap[detectedLocale]);
    setIsLoading(false);
  }, []);

  // Set locale and persist
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setContent(contentMap[newLocale]);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('healthos-locale', newLocale);
    }
  }, []);

  // Toggle between locales
  const toggleLocale = useCallback(() => {
    const newLocale = locale === 'pt' ? 'en' : 'pt';
    setLocale(newLocale);
  }, [locale, setLocale]);

  return {
    content,
    locale,
    setLocale,
    toggleLocale,
    isLoading,
  };
}

/**
 * Get content by section for granular access
 */
export function useSection<K extends keyof LandingContent>(section: K) {
  const { content, locale, isLoading } = useContent();
  return {
    data: content[section],
    locale,
    isLoading,
  };
}

export { type LandingContent, type Locale };
