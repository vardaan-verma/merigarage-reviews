/**
 * MeriGarage — Pending Action & Form State Storage
 *
 * Preserves user action context (route, form inputs, modal state) when a
 * logged-out visitor attempts an action requiring authentication.
 *
 * Guarantees:
 * 1. Safe internal redirect URLs (rejects malicious external or protocol URLs).
 * 2. Short-lived session storage (TTL 2 hours) resilient against page refreshes and OAuth flows.
 * 3. Never stores passwords, tokens, or sensitive credentials.
 * 4. Automatic cleanup upon consumption.
 */

export type ActionPortal = 'customer' | 'garage';

export type ProtectedActionType =
  | 'QUOTE_REQUEST'
  | 'WRITE_REVIEW'
  | 'EDIT_REVIEW'
  | 'CLAIM_GARAGE'
  | 'GENERIC_NAV'
  | string;

export interface PendingAction<T = Record<string, any>> {
  id: string;
  actionType: ProtectedActionType;
  returnUrl: string;
  portal: ActionPortal;
  formState?: T;
  createdAt: number;
}

const STORAGE_KEY = 'merigarage_pending_action';
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Validates that a destination URL is strictly an internal application route.
 * Rejects external URLs, protocol-relative URLs, javascript: schemes, and malformed paths.
 */
export function isValidInternalReturnUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Must begin with a single slash followed by a path character or end of string
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return false;
  }

  // Reject protocol indicators, schemes, and data URIs anywhere
  if (
    trimmed.includes('://') ||
    trimmed.toLowerCase().startsWith('javascript:') ||
    trimmed.toLowerCase().startsWith('data:') ||
    trimmed.toLowerCase().startsWith('vbscript:')
  ) {
    return false;
  }

  return true;
}

/**
 * Normalizes an internal return URL, falling back to a safe default if invalid.
 */
export function sanitizeReturnUrl(url: string | null | undefined, fallback: string = '/'): string {
  if (isValidInternalReturnUrl(url)) {
    return url!.trim();
  }
  return fallback;
}

/**
 * Saves a pending protected action to session storage.
 */
export function setPendingAction<T = any>(action: Omit<PendingAction<T>, 'createdAt'> & { createdAt?: number }): void {
  try {
    if (!isValidInternalReturnUrl(action.returnUrl)) {
      console.warn('Rejected invalid returnUrl for pending action:', action.returnUrl);
      return;
    }

    const payload: PendingAction<T> = {
      ...action,
      createdAt: action.createdAt || Date.now(),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to save pending action to sessionStorage:', err);
  }
}

/**
 * Retrieves the currently active pending action without clearing it.
 * Returns null if missing or expired.
 */
export function getPendingAction<T = any>(): PendingAction<T> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: PendingAction<T> = JSON.parse(raw);
    if (!parsed || !parsed.returnUrl) {
      clearPendingAction();
      return null;
    }

    // Check expiration
    if (Date.now() - (parsed.createdAt || 0) > MAX_AGE_MS) {
      clearPendingAction();
      return null;
    }

    if (!isValidInternalReturnUrl(parsed.returnUrl)) {
      clearPendingAction();
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('Failed to parse pending action from sessionStorage:', err);
    clearPendingAction();
    return null;
  }
}

/**
 * Consumes (retrieves and removes) the pending action if it matches the current context.
 *
 * @param matchUrl Optional URL to match against (e.g. current path). If provided, only consumes if matches.
 * @param matchType Optional actionType to match against.
 */
export function consumePendingAction<T = any>(
  matchUrl?: string,
  matchType?: ProtectedActionType
): PendingAction<T> | null {
  const action = getPendingAction<T>();
  if (!action) return null;

  if (matchUrl) {
    const cleanMatch = matchUrl.split('?')[0].split('#')[0];
    const cleanActionUrl = action.returnUrl.split('?')[0].split('#')[0];
    if (cleanMatch !== cleanActionUrl) {
      return null;
    }
  }

  if (matchType && action.actionType !== matchType) {
    return null;
  }

  clearPendingAction();
  return action;
}

/**
 * Explicitly clears any stored pending action.
 */
export function clearPendingAction(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Ignore storage clear errors
  }
}
