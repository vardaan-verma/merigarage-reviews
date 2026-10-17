import { api } from '../api/client';
import type { TrackLeadEventRequest, TrackLeadEventResponse, LeadEventType } from '../api/types';

export interface SearchWorkflowSession {
  state?: string;
  city?: string;
  vehicleType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  rawVehicle?: string;
  serviceSlug?: string;
  serviceName?: string;
  source?: string;
  updatedAt: number;
}

const SESSION_KEY = 'mg_search_workflow';
const SESSION_ID_KEY = 'mg_session_id';

let hasTrackedSearchStarted = false;

/**
 * Tracks HOMEPAGE_SEARCH_STARTED once per session interaction.
 */
export function notifySearchStarted(initialCriteria?: Partial<TrackLeadEventRequest>): void {
  if (hasTrackedSearchStarted) return;
  hasTrackedSearchStarted = true;
  safeTrackLeadEvent('HOMEPAGE_SEARCH_STARTED', initialCriteria);
}

/**
 * Retrieves or lazily creates a random session identifier for visitor activity.
 */
export function getVisitorSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = 'ses_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return 'ses_' + Date.now().toString(36);
  }
}

/**
 * Returns the active search workflow from session storage.
 */
export function getActiveSearchSession(): SearchWorkflowSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Discard session data older than 24 hours
    if (Date.now() - parsed.updatedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists active search criteria to session storage.
 * Note: Personal information such as phone numbers are strictly kept out of URLs and public storage.
 */
export function setActiveSearchSession(data: Partial<SearchWorkflowSession>): void {
  try {
    const existing = getActiveSearchSession() || { updatedAt: Date.now() };
    const merged: SearchWorkflowSession = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  } catch {
    // Non-blocking for environments where storage is disabled
  }
}

/**
 * Clears the active search session workflow.
 */
export function clearActiveSearchSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Parses popular car / vehicle dropdown strings into structured make, model, and vehicle type.
 */
export function parseVehicleString(rawVehicle?: string): { make: string; model: string; type: string } {
  if (!rawVehicle || !rawVehicle.trim()) {
    return { make: '', model: '', type: 'CAR' };
  }

  const clean = rawVehicle.trim();

  if (clean.includes('Motorcycle') || clean.includes('Scooter') || clean.includes('2-Wheeler')) {
    return { make: 'Two-Wheeler', model: 'Motorcycle / Scooter', type: 'MOTORCYCLE' };
  }

  if (clean.includes('Electric Car') || clean.includes('EV')) {
    return { make: 'Electric', model: 'EV Car', type: 'CAR' };
  }

  // Handle formats like "Tata Harrier / Safari", "Maruti Suzuki Swift / Dzire", "Mahindra XUV700"
  if (clean.startsWith('Maruti Suzuki')) {
    const rest = clean.replace('Maruti Suzuki', '').trim();
    const model = rest.split('/')[0].trim() || rest;
    return { make: 'Maruti Suzuki', model, type: 'CAR' };
  }

  const parts = clean.split(' ');
  const make = parts[0] || '';
  const remaining = parts.slice(1).join(' ').trim();
  const model = remaining.split('/')[0].trim() || remaining;

  return { make, model, type: 'CAR' };
}

/**
 * Maps common landing page service phrases to canonical service slugs in the database catalogue.
 */
export function mapServiceNameToSlug(name?: string): string {
  if (!name || !name.trim()) return '';
  const lower = name.toLowerCase();

  if (lower.includes('ac ') || lower.includes('air conditioning')) return 'ac-repair-and-gas-refill';
  if (lower.includes('periodic') || lower.includes('general car')) return 'general-car-servicing';
  if (lower.includes('oil')) return 'oil-and-filter-change';
  if (lower.includes('brake')) return 'brake-repair-and-replacement';
  if (lower.includes('dent') || lower.includes('body')) return 'denting-and-body-repair';
  if (lower.includes('paint')) return 'painting-and-repainting';
  if (lower.includes('tyre') || lower.includes('tire')) return 'tyre-replacement';
  if (lower.includes('wheel align')) return 'wheel-alignment';
  if (lower.includes('battery')) return 'battery-testing-and-replacement';
  if (lower.includes('clutch')) return 'clutch-repair';
  if (lower.includes('suspension')) return 'suspension-repair';
  if (lower.includes('spa') || lower.includes('detail')) return 'full-car-detailing';
  if (lower.includes('wash')) return 'car-washing';

  return '';
}

const USER_PREF_VEHICLE_KEY = 'mg_pref_vehicle';

/**
 * Saves known user vehicle preference to local storage for long-term prefilling.
 */
export function recordUserVehiclePreference(vehicle: { make: string; model: string; type?: string }): void {
  try {
    localStorage.setItem(
      USER_PREF_VEHICLE_KEY,
      JSON.stringify({
        make: vehicle.make,
        model: vehicle.model,
        type: vehicle.type || 'CAR',
        savedAt: Date.now(),
      })
    );
  } catch {
    // Ignore
  }
}

/**
 * Retrieves saved vehicle preference from local storage.
 */
export function getUserVehiclePreference(): { make: string; model: string; type: string } | null {
  try {
    const raw = localStorage.getItem(USER_PREF_VEHICLE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Resolves vehicle details adhering to the 4-tier precedence rule:
 * 1. Explicit values in the current form
 * 2. Explicitly selected values in the current workflow (session)
 * 3. Previously saved user preferences (when available)
 * 4. Empty values otherwise
 */
export function resolveVehicleDetails(
  explicitForm: { make?: string; model?: string; type?: string },
  userPref?: { make?: string; model?: string; type?: string }
): { make: string; model: string; type: string } {
  const session = getActiveSearchSession();
  const savedPref = userPref || getUserVehiclePreference() || undefined;

  const make =
    (explicitForm.make && explicitForm.make.trim()) ||
    (session?.vehicleMake && session.vehicleMake.trim()) ||
    (savedPref?.make && savedPref.make.trim()) ||
    '';

  const model =
    (explicitForm.model && explicitForm.model.trim()) ||
    (session?.vehicleModel && session.vehicleModel.trim()) ||
    (savedPref?.model && savedPref.model.trim()) ||
    '';

  const type =
    (explicitForm.type && explicitForm.type.trim()) ||
    (session?.vehicleType && session.vehicleType.trim()) ||
    (savedPref?.type && savedPref.type.trim()) ||
    'CAR';

  return { make, model, type };
}

/**
 * Safely tracks a lead/search event.
 * If backend tracking fails, logs the error accurately and does NOT produce fake success notifications.
 */
export async function safeTrackLeadEvent(
  eventType: LeadEventType,
  details: Omit<TrackLeadEventRequest, 'eventType' | 'sessionId'> = {}
): Promise<TrackLeadEventResponse | null> {
  const sessionId = getVisitorSessionId();
  const requestPayload: TrackLeadEventRequest = {
    sessionId,
    eventType,
    ...details,
  };

  try {
    const res = await api.leads.track(requestPayload);
    return res;
  } catch (err: any) {
    // Log accurately; never fabricate fake success
    console.warn(`[Lead Tracking Error] Event "${eventType}" failed:`, err?.message || err);
    return null;
  }
}
