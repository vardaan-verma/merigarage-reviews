/**
 * MeriGarage — Production-Safe QR URL Strategy & Configuration
 * 
 * Enforces strict separation between local testing URLs and permanent printable QR codes:
 * - Localhost or development-only origins are never used for production printing.
 * - Production mode requires a valid HTTPS public origin (e.g. https://www.merigarage.com).
 * - Future-proof first-party redirect routes (/r/:slug) and canonical routes (/garages/:slug)
 *   ensure printed posters remain functional even if route structures evolve.
 */

export const CONFIRMED_PRODUCTION_DOMAIN = 'https://www.merigarage.com';

export interface QrUrlConfig {
  mode: 'production' | 'development';
  targetUrl: string;
  baseUrl: string;
  isProduction: boolean;
  canPrintOrDownload: boolean;
  error?: string;
  warning?: string;
}

/**
 * Checks if a URL has an HTTPS protocol.
 */
export function isHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Checks if a URL refers to a local development machine.
 */
export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.test')
    );
  } catch {
    return false;
  }
}

/**
 * Validates whether a provided origin is acceptable for production poster printing.
 */
export function validateProductionOrigin(origin: string): { isValid: boolean; error?: string } {
  if (!origin || !origin.trim()) {
    return {
      isValid: false,
      error: 'Production origin is not configured. A valid HTTPS public domain is required for printable posters.',
    };
  }

  try {
    const parsed = new URL(origin.trim());
    if (parsed.protocol !== 'https:') {
      return {
        isValid: false,
        error: `Production origin must use HTTPS protocol (received "${parsed.protocol}").`,
      };
    }

    if (isLocalhostUrl(origin)) {
      return {
        isValid: false,
        error: 'Localhost and development origins cannot be used for production printed posters.',
      };
    }

    if (!parsed.hostname.includes('.')) {
      return {
        isValid: false,
        error: 'Production origin must contain a fully qualified domain name.',
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format for production origin.',
    };
  }
}

/**
 * Resolves the configured production base URL from environment or confirmed default.
 */
export function getProductionBaseUrl(): string {
  let envUrl = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envUrl = (import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
    } else if (typeof process !== 'undefined' && process.env) {
      envUrl = (process.env.VITE_PUBLIC_APP_URL || '').trim();
    }
  } catch {
    envUrl = '';
  }

  if (envUrl && validateProductionOrigin(envUrl).isValid) {
    return envUrl.replace(/\/+$/, '');
  }
  return CONFIRMED_PRODUCTION_DOMAIN;
}

/**
 * Resolves the development base URL for local testing.
 */
export function getDevelopmentBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

/**
 * Constructs the canonical public garage review URL.
 * 
 * @param slug Garage identifier / slug
 * @param baseUrl Base application URL (production or development)
 * @param options.useShortRedirect When true, uses the stable /r/:slug redirect route
 * @param options.reviewAction When true and using canonical route, appends ?action=review
 */
export function buildGarageReviewUrl(
  slug: string,
  baseUrl: string,
  options: { useShortRedirect?: boolean; reviewAction?: boolean } = {}
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const encodedSlug = encodeURIComponent(slug.trim());

  if (options.useShortRedirect) {
    return `${cleanBase}/r/${encodedSlug}`;
  }

  const query = options.reviewAction !== false ? '?action=review' : '';
  return `${cleanBase}/garages/${encodedSlug}${query}`;
}

/**
 * Computes the complete QR configuration and validation state for a garage poster.
 */
export function resolveQrPosterConfig(
  slug: string,
  mode: 'production' | 'development',
  customProductionUrl?: string
): QrUrlConfig {
  if (mode === 'development') {
    const devBase = getDevelopmentBaseUrl();
    const targetUrl = buildGarageReviewUrl(slug, devBase, { reviewAction: true });
    return {
      mode: 'development',
      targetUrl,
      baseUrl: devBase,
      isProduction: false,
      canPrintOrDownload: true,
      warning:
        '⚠️ DEVELOPMENT / TESTING MODE: This QR contains a localhost address. It is strictly for local browser testing and will NOT work when scanned from external mobile devices. Switch to Production Mode before printing posters for real customers.',
    };
  }

  // Production mode
  const prodBase = (customProductionUrl || getProductionBaseUrl()).replace(/\/+$/, '');
  const validation = validateProductionOrigin(prodBase);

  if (!validation.isValid) {
    return {
      mode: 'production',
      targetUrl: '',
      baseUrl: prodBase,
      isProduction: true,
      canPrintOrDownload: false,
      error: validation.error,
    };
  }

  const targetUrl = buildGarageReviewUrl(slug, prodBase, { reviewAction: true });

  return {
    mode: 'production',
    targetUrl,
    baseUrl: prodBase,
    isProduction: true,
    canPrintOrDownload: true,
  };
}
