import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIRMED_PRODUCTION_DOMAIN,
  isHttpsUrl,
  isLocalhostUrl,
  validateProductionOrigin,
  buildGarageReviewUrl,
  resolveQrPosterConfig,
} from '../src/utils/qrPosterConfig.ts';

test('isHttpsUrl correctly identifies HTTPS vs non-HTTPS protocols', () => {
  assert.equal(isHttpsUrl('https://www.merigarage.com'), true);
  assert.equal(isHttpsUrl('https://merigarage.com/garages'), true);
  assert.equal(isHttpsUrl('http://localhost:5173'), false);
  assert.equal(isHttpsUrl('http://www.merigarage.com'), false);
  assert.equal(isHttpsUrl('ftp://example.com'), false);
  assert.equal(isHttpsUrl('not-a-url'), false);
});

test('isLocalhostUrl correctly identifies development hosts', () => {
  assert.equal(isLocalhostUrl('http://localhost:5173'), true);
  assert.equal(isLocalhostUrl('http://127.0.0.1:3000'), true);
  assert.equal(isLocalhostUrl('http://0.0.0.0:8080'), true);
  assert.equal(isLocalhostUrl('https://mydev.local'), true);
  assert.equal(isLocalhostUrl('https://www.merigarage.com'), false);
  assert.equal(isLocalhostUrl('https://merigarage.com'), false);
});

test('validateProductionOrigin enforces HTTPS and rejects localhost', () => {
  // Valid production origins
  const validProd = validateProductionOrigin('https://www.merigarage.com');
  assert.equal(validProd.isValid, true);
  assert.equal(validProd.error, undefined);

  const validProd2 = validateProductionOrigin('https://merigarage.com');
  assert.equal(validProd2.isValid, true);

  // Rejects HTTP
  const httpRes = validateProductionOrigin('http://www.merigarage.com');
  assert.equal(httpRes.isValid, false);
  assert.match(httpRes.error, /HTTPS protocol/);

  // Rejects Localhost
  const localRes = validateProductionOrigin('http://localhost:5173');
  assert.equal(localRes.isValid, false);
  assert.match(localRes.error, /HTTPS protocol/);

  const httpsLocalRes = validateProductionOrigin('https://localhost:5173');
  assert.equal(httpsLocalRes.isValid, false);
  assert.match(httpsLocalRes.error, /Localhost and development origins cannot be used/);

  // Rejects empty or missing
  const emptyRes = validateProductionOrigin('');
  assert.equal(emptyRes.isValid, false);
});

test('buildGarageReviewUrl constructs valid canonical public routes', () => {
  const base = 'https://www.merigarage.com';
  
  // Canonical review route
  const url1 = buildGarageReviewUrl('apex-motors', base, { reviewAction: true });
  assert.equal(url1, 'https://www.merigarage.com/garages/apex-motors?action=review');

  // Trailing slash handling in base
  const url2 = buildGarageReviewUrl('bosch-car-service', 'https://www.merigarage.com///');
  assert.equal(url2, 'https://www.merigarage.com/garages/bosch-car-service?action=review');

  // URL without review action
  const url3 = buildGarageReviewUrl('apex-motors', base, { reviewAction: false });
  assert.equal(url3, 'https://www.merigarage.com/garages/apex-motors');

  // Short stable first-party redirect route (/r/:slug)
  const url4 = buildGarageReviewUrl('apex-motors', base, { useShortRedirect: true });
  assert.equal(url4, 'https://www.merigarage.com/r/apex-motors');
});

test('resolveQrPosterConfig handles production and development modes cleanly', () => {
  const slug = 'speedy-mechanics';

  // 1. Development mode produces a localhost URL with clear warning banner
  const devConfig = resolveQrPosterConfig(slug, 'development');
  assert.equal(devConfig.mode, 'development');
  assert.equal(devConfig.isProduction, false);
  assert.match(devConfig.targetUrl, /\/garages\/speedy-mechanics\?action=review/);
  assert.match(devConfig.warning, /DEVELOPMENT \/ TESTING MODE/);
  assert.equal(devConfig.canPrintOrDownload, true);

  // 2. Production mode with confirmed default domain
  const prodConfig = resolveQrPosterConfig(slug, 'production');
  assert.equal(prodConfig.mode, 'production');
  assert.equal(prodConfig.isProduction, true);
  assert.equal(prodConfig.canPrintOrDownload, true);
  assert.equal(prodConfig.targetUrl, 'https://www.merigarage.com/garages/speedy-mechanics?action=review');
  assert.equal(prodConfig.error, undefined);

  // 3. Production mode with invalid origin disables printing and reports error
  const invalidProdConfig = resolveQrPosterConfig(slug, 'production', 'http://localhost:5173');
  assert.equal(invalidProdConfig.mode, 'production');
  assert.equal(invalidProdConfig.canPrintOrDownload, false);
  assert.equal(invalidProdConfig.targetUrl, '');
  assert.match(invalidProdConfig.error, /HTTPS protocol/);
});
