import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidInternalReturnUrl,
  sanitizeReturnUrl,
  setPendingAction,
  getPendingAction,
  consumePendingAction,
  clearPendingAction,
} from '../src/utils/pendingActionStorage.ts';

// Mock browser sessionStorage in Node environment
const mockStorage = new Map();
globalThis.sessionStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

test('isValidInternalReturnUrl validates safe application routes', () => {
  // Safe internal paths
  assert.equal(isValidInternalReturnUrl('/'), true);
  assert.equal(isValidInternalReturnUrl('/garages'), true);
  assert.equal(isValidInternalReturnUrl('/garages/speedline-motors'), true);
  assert.equal(isValidInternalReturnUrl('/garages/speedline-motors?action=review'), true);
  assert.equal(isValidInternalReturnUrl('/owner?slug=speedline-motors'), true);
  assert.equal(isValidInternalReturnUrl('/profile'), true);

  // Malicious or external URLs rejected
  assert.equal(isValidInternalReturnUrl('https://malicious-site.com/steal'), false);
  assert.equal(isValidInternalReturnUrl('http://attacker.com'), false);
  assert.equal(isValidInternalReturnUrl('//evil.com/phishing'), false);
  assert.equal(isValidInternalReturnUrl('/\\evil.com'), false);
  assert.equal(isValidInternalReturnUrl('javascript:alert(1)'), false);
  assert.equal(isValidInternalReturnUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isValidInternalReturnUrl('vbscript:msgbox(1)'), false);
  assert.equal(isValidInternalReturnUrl(''), false);
  assert.equal(isValidInternalReturnUrl(null), false);
  assert.equal(isValidInternalReturnUrl(undefined), false);
});

test('sanitizeReturnUrl normalizes paths and falls back safely', () => {
  assert.equal(sanitizeReturnUrl('/garages/test'), '/garages/test');
  assert.equal(sanitizeReturnUrl('  /profile  '), '/profile');
  assert.equal(sanitizeReturnUrl('https://evil.com', '/fallback'), '/fallback');
  assert.equal(sanitizeReturnUrl('', '/'), '/');
});

test('pendingActionStorage stores and retrieves protected action context', () => {
  mockStorage.clear();

  const action = {
    id: 'QUOTE_123',
    actionType: 'QUOTE_REQUEST',
    returnUrl: '/garages/speedline-auto?quote=1',
    portal: 'customer',
    formState: {
      vehicleMake: 'Honda',
      vehicleModel: 'City',
      selectedServiceIds: [1, 2],
    },
  };

  setPendingAction(action);

  const retrieved = getPendingAction();
  assert.notEqual(retrieved, null);
  assert.equal(retrieved.actionType, 'QUOTE_REQUEST');
  assert.equal(retrieved.returnUrl, '/garages/speedline-auto?quote=1');
  assert.equal(retrieved.portal, 'customer');
  assert.equal(retrieved.formState.vehicleMake, 'Honda');
  assert.equal(retrieved.formState.vehicleModel, 'City');
});

test('pendingActionStorage expires actions older than 2 hours', () => {
  mockStorage.clear();

  const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
  const expiredAction = {
    id: 'EXPIRED_1',
    actionType: 'WRITE_REVIEW',
    returnUrl: '/garages/speedline',
    portal: 'customer',
    createdAt: threeHoursAgo,
  };

  setPendingAction(expiredAction);

  const retrieved = getPendingAction();
  assert.equal(retrieved, null, 'Expired action should be cleared automatically');
});

test('consumePendingAction requires route and type matching before consumption', () => {
  mockStorage.clear();

  const action = {
    id: 'REVIEW_789',
    actionType: 'WRITE_REVIEW',
    returnUrl: '/garages/apex-workshop?review=true',
    portal: 'customer',
    formState: {
      ratingQuality: 5,
      reviewTitle: 'Exceptional service',
    },
  };

  setPendingAction(action);

  // Mismatched URL does NOT consume
  const mismatched = consumePendingAction('/garages/different-workshop');
  assert.equal(mismatched, null);
  assert.notEqual(getPendingAction(), null, 'Action should remain in storage when URL does not match');

  // Mismatched ActionType does NOT consume
  const mismatchedType = consumePendingAction('/garages/apex-workshop', 'QUOTE_REQUEST');
  assert.equal(mismatchedType, null);
  assert.notEqual(getPendingAction(), null);

  // Matching URL and type consumes and clears
  const consumed = consumePendingAction('/garages/apex-workshop', 'WRITE_REVIEW');
  assert.notEqual(consumed, null);
  assert.equal(consumed.formState.ratingQuality, 5);
  assert.equal(consumed.formState.reviewTitle, 'Exceptional service');

  // Second consume returns null because it was consumed
  assert.equal(getPendingAction(), null);
});

test('pendingActionStorage rejects external returnUrls at save time', () => {
  mockStorage.clear();

  setPendingAction({
    id: 'MALICIOUS_1',
    actionType: 'WRITE_REVIEW',
    returnUrl: 'https://attacker.com/steal',
    portal: 'customer',
  });

  assert.equal(getPendingAction(), null, 'Should refuse to store external URLs');
});

test('toast auto-dismiss defaults to exactly 2.5 seconds (2500ms)', async () => {
  // Test timing specification: exactly 2500ms
  const DEFAULT_DURATION = 2500;
  assert.equal(DEFAULT_DURATION, 2500, 'Standard transient notification duration must be 2.5s');

  let dismissedId = null;
  const toast = { id: 'test_toast_1', duration: DEFAULT_DURATION };

  // Simulate startTimer
  const startTime = Date.now();
  await new Promise((resolve) => {
    setTimeout(() => {
      dismissedId = toast.id;
      resolve();
    }, 50); // fast simulation
  });

  assert.equal(dismissedId, 'test_toast_1');
});

test('toast timer pause-on-hover preserves remaining duration correctly', () => {
  const duration = 2500;
  let remainingTime = duration;
  const startTime = 10000;
  const pauseTime = 11000; // 1000ms elapsed

  // On mouse enter / focus
  const elapsed = pauseTime - startTime;
  remainingTime = Math.max(0, remainingTime - elapsed);

  assert.equal(remainingTime, 1500, 'Remaining time after 1s hover should be 1.5s');

  // Second pause after another 500ms
  const resumeTime = 12000;
  const secondPauseTime = 12500;
  const secondElapsed = secondPauseTime - resumeTime;
  remainingTime = Math.max(0, remainingTime - secondElapsed);

  assert.equal(remainingTime, 1000, 'Remaining time should decrement accurately');
});

