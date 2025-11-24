/**
 * ============================================
 * LANDING PAGE ENTRY POINT
 * ============================================
 * Main entry file for the landing page
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { LandingPage } from './LandingPage';

// Mount the landing page
const container = document.getElementById('landing-root');

if (container) {
  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <LandingPage
        onCtaClick={() => {
          // TODO: Implement signup modal or redirect
          console.log('CTA clicked - implement signup flow');
          // window.location.href = '/signup';
        }}
        onDemoClick={() => {
          // TODO: Implement demo video modal
          console.log('Demo clicked - implement demo flow');
        }}
      />
    </React.StrictMode>
  );
} else {
  console.error('Landing root element not found');
}
