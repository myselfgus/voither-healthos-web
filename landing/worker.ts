/**
 * ============================================
 * CLOUDFLARE WORKER - LANDING PAGE
 * ============================================
 * Edge worker to serve the landing page
 * AI-EDITABLE: Modify routing, caching, and headers
 *
 * Deployment:
 * 1. Build the landing page: pnpm build:landing
 * 2. Deploy: wrangler deploy
 */

export interface Env {
  // KV namespace for analytics (optional)
  ANALYTICS?: KVNamespace;

  // Environment variables
  ENVIRONMENT?: string;
}

/**
 * Security headers for the landing page
 */
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Cache configuration
 */
const cacheConfig = {
  // Static assets: cache for 1 year
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
  // HTML: cache for 1 hour, revalidate
  html: {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
  },
  // API: no cache
  api: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
};

/**
 * Detect locale from request
 */
function detectLocale(request: Request): 'pt' | 'en' {
  // Check URL parameter
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  if (langParam === 'en' || langParam === 'pt') {
    return langParam;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language') || '';
  if (acceptLanguage.toLowerCase().startsWith('pt')) {
    return 'pt';
  }

  // Check country (Cloudflare header)
  const country = request.headers.get('CF-IPCountry') || '';
  const portugueseCountries = ['BR', 'PT', 'AO', 'MZ', 'CV'];
  if (portugueseCountries.includes(country)) {
    return 'pt';
  }

  // Default to Portuguese for Brazil-focused product
  return 'pt';
}

/**
 * Track page view (optional analytics)
 */
async function trackPageView(
  request: Request,
  env: Env,
  locale: string
): Promise<void> {
  if (!env.ANALYTICS) return;

  const date = new Date().toISOString().split('T')[0];
  const key = `pageview:${date}`;

  try {
    const current = await env.ANALYTICS.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    await env.ANALYTICS.put(key, count.toString(), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    });
  } catch {
    // Silently fail analytics
  }
}

/**
 * Handle landing page request
 */
async function handleLandingRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const locale = detectLocale(request);

  // Track page view in background
  trackPageView(request, env, locale);

  // For now, return a placeholder that will be replaced
  // by the actual React build output
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${
    locale === 'pt'
      ? 'O primeiro Sistema Operacional Cognitivo que devolve o tempo do medico e a soberania do paciente.'
      : 'The first Cognitive Operating System that gives back the doctor\'s time and patient sovereignty.'
  }">
  <title>Voither HealthOS - ${
    locale === 'pt' ? 'Sistema Operacional Cognitivo para Saude' : 'Cognitive Operating System for Healthcare'
  }</title>

  <!-- Preconnect to Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;500;600;700&family=Nunito:wght@300;400;500;600;700;800&family=Roboto+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <!-- Open Graph -->
  <meta property="og:title" content="Voither HealthOS">
  <meta property="og:description" content="${
    locale === 'pt'
      ? 'O primeiro Sistema Operacional Cognitivo para Saude'
      : 'The first Cognitive Operating System for Healthcare'
  }">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${locale === 'pt' ? 'pt_BR' : 'en_US'}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Voither HealthOS">

  <!-- Theme color -->
  <meta name="theme-color" content="#f8f8f8">

  <!-- Module script will be injected by build -->
  <script type="module" crossorigin src="/assets/landing.js"></script>
  <link rel="stylesheet" crossorigin href="/assets/landing.css">
</head>
<body>
  <div id="landing-root"></div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...securityHeaders,
      ...cacheConfig.html,
    },
  });
}

/**
 * Main worker handler
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (would be served from KV or R2 in production)
    if (url.pathname.startsWith('/assets/')) {
      // In production, this would fetch from KV/R2
      // For now, pass through to origin
      return fetch(request);
    }

    // Handle favicon
    if (url.pathname === '/favicon.svg' || url.pathname === '/favicon.ico') {
      return fetch(request);
    }

    // Handle robots.txt
    if (url.pathname === '/robots.txt') {
      return new Response(
        `User-agent: *
Allow: /

Sitemap: ${url.origin}/sitemap.xml`,
        {
          headers: {
            'Content-Type': 'text/plain',
            ...cacheConfig.static,
          },
        }
      );
    }

    // Handle sitemap
    if (url.pathname === '/sitemap.xml') {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url.origin}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${url.origin}/?lang=en</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`,
        {
          headers: {
            'Content-Type': 'application/xml',
            ...cacheConfig.html,
          },
        }
      );
    }

    // Landing page
    return handleLandingRequest(request, env);
  },
};
